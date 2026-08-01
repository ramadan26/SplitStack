import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Run on everything except auth API routes, Next internals, and
    // static PWA assets.
    "/((?!api/auth|_next/static|_next/image|icons|manifest.webmanifest|offline|sw.js|favicon.ico).*)",
  ],
};
