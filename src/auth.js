import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const ip = request?.headers?.get("x-forwarded-for") ?? "unknown";
        const { allowed, retryAfter } = checkRateLimit(ip);
        if (!allowed) {
          throw new Error(`Too many login attempts. Try again in ${retryAfter} seconds.`);
        }

        const users = await query("SELECT * FROM users WHERE email = ?", [
          credentials.email,
        ]);
        const user = users[0];
        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
          return null;
        }
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
});
