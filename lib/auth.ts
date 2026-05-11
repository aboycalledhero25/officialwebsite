import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const adminEmail = process.env.ADMIN_EMAIL || "admin@aboycalledhero.com";
        // Fallback hash for "changeme" in case env var isn't loaded
        const fallbackHash = "$2b$12$Zl1NMRwDOUCN8OfOsekXOODuGoi5Hvy16Htsfwj8smxftslEYuYl6";
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.replace(/\\/g, "") || fallbackHash;

        if (!adminPasswordHash) {
          console.error("[AUTH] ADMIN_PASSWORD_HASH is not set");
          return null;
        }

        if (email.toLowerCase().trim() !== adminEmail.toLowerCase().trim()) {
          return null;
        }

        const valid = await bcrypt.compare(password, adminPasswordHash);
        if (!valid) return null;

        return {
          id: "1",
          name: "Admin",
          email: adminEmail,
          role: "admin",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token?.role && session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
