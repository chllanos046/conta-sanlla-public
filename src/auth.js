import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { authConfig } from "@/../auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          redirect_uri: `${(process.env.AUTH_URL ?? "").replace(/\/$/, "")}/api/auth/callback/google`,
        },
      },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const ip = request?.headers?.get("x-forwarded-for") ?? "unknown";
        const { allowed, retryAfter } = checkRateLimit(ip);
        if (!allowed) {
          throw new Error(`Too many login attempts. Try again in ${retryAfter} seconds.`);
        }
        const users = await query("SELECT * FROM users WHERE email = ?", [credentials.email]);
        const user = users[0];
        if (!user || !user.password) return null;
        if (!(await bcrypt.compare(credentials.password, user.password))) return null;
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const rows = await query("SELECT id FROM users WHERE email = ?", [profile.email]);
        if (rows.length === 0) {
          const params = new URLSearchParams({
            email: profile.email,
            name: profile.name ?? profile.email,
          });
          return `/verify-code?${params}`;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id) token.id = user.id;
      if (account?.provider === "google" && profile?.email) {
        const rows = await query("SELECT id FROM users WHERE email = ?", [profile.email]);
        if (rows.length > 0) {
          token.id = String(rows[0].id);
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
});
