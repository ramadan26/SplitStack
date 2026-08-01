import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config shared by middleware and the Node-runtime auth
 * setup. Providers are added in `lib/auth.ts` because the Prisma adapter
 * and nodemailer cannot run on the Edge runtime.
 */
export default {
  // Required for local dev and non-Vercel hosts (avoids UntrustedHost errors)
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname, search } = request.nextUrl;

      // Public routes: landing page and the login section
      if (pathname === "/") return true;

      if (pathname.startsWith("/login")) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/home", request.nextUrl));
        }
        return true;
      }

      // Everything else requires a session
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", request.nextUrl);
        if (pathname !== "/home") {
          loginUrl.searchParams.set("callbackUrl", pathname + search);
        }
        return Response.redirect(loginUrl);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
