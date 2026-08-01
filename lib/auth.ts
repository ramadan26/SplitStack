import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import authConfig from "@/lib/auth.config";
import { db } from "@/lib/db";

const providers: Provider[] = [];

// Demo email + password login (mocked). Lets anyone try the deployed app
// without email delivery or OAuth setup: sign in as one of the seeded demo
// users with the shared demo password (DEMO_PASSWORD env, default below).
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

providers.push(
  Credentials({
    name: "Email & demo password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      if (parsed.data.password !== DEMO_PASSWORD) return null;

      // Only existing (e.g. seeded) users can sign in — the demo password
      // proves demo intent, it doesn't create accounts.
      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
);

// Google OAuth — only registered when credentials are configured, so the
// app still boots in local dev without them.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

// Email magic link. Without a real SMTP server configured (local dev), the
// sign-in URL is printed to the server console instead of being sent.
// The placeholder host from .env.example counts as "not configured".
const emailServer = process.env.EMAIL_SERVER;
const smtpConfigured = !!emailServer && !emailServer.includes("example.com");

providers.push(
  Nodemailer({
    // The provider requires a `server` value at construction time; when
    // SMTP isn't configured the placeholder is never used because
    // sendVerificationRequest is overridden below.
    server: smtpConfigured ? emailServer : "smtp://localhost:25",
    from: process.env.EMAIL_FROM ?? "SplitStack <noreply@splitstack.app>",
    ...(smtpConfigured
      ? {}
      : {
          sendVerificationRequest: async ({ identifier, url }) => {
            console.log(
              `\n🔗 Magic link for ${identifier} (EMAIL_SERVER not configured):\n${url}\n`,
            );
          },
        }),
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Claim pending group invites: memberships created for an email before
    // the user had an account are flipped from PENDING to ACTIVE here.
    // (Auth.js links OAuth/magic-link sign-ins to the placeholder user row
    // by email, so `user.id` is already the placeholder's id.)
    async signIn({ user }) {
      if (!user.id) return;
      const pending = await db.groupMember.findMany({
        where: { userId: user.id, status: "PENDING" },
        select: { groupId: true },
      });
      if (pending.length === 0) return;

      await db.$transaction([
        db.groupMember.updateMany({
          where: { userId: user.id, status: "PENDING" },
          data: { status: "ACTIVE", joinedAt: new Date() },
        }),
        db.activity.createMany({
          data: pending.map(({ groupId }) => ({
            groupId,
            userId: user.id as string,
            type: "MEMBER_JOINED" as const,
          })),
        }),
      ]);
    },
  },
});
