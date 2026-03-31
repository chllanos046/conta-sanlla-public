import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Edge-safe config: no DB imports, no Node.js modules.
// Used by middleware.js for JWT-only route protection.
// src/auth.js extends this with full DB-backed authorize() and jwt() callbacks.
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize() {
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
