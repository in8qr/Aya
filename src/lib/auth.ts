import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { logError } from "@/lib/logger";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    name?: string | null;
    email?: string | null;
  }

  interface Session {
    user: User & { id: string; role: Role };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

// Use a different cookie name when running the dev app (port 3002) so it doesn't conflict with production
const isDevApp = process.env.PORT === "3002";
const sessionTokenName = isDevApp ? "next-auth.session-token.dev" : undefined;

export const authOptions: NextAuthOptions = {
  // 5 minutes inactivity: session expires 5 min after last activity (each request refreshes it)
  session: { strategy: "jwt", maxAge: 5 * 60 },
  pages: {
    signIn: "/login",
  },
  ...(sessionTokenName && {
    cookies: {
      sessionToken: {
        name: sessionTokenName,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NEXTAUTH_URL?.startsWith("https:") ?? false,
        },
      },
    },
  }),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (!user || !user.active) return null;
          if (user.role === "CUSTOMER" && !user.emailVerifiedAt) return null;
          const ok = await bcrypt.compare(credentials.password, user.password);
          if (!ok) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (e) {
          logError("Sign-in failed (database or server error)", e);
          throw new Error("Database unavailable. Is PostgreSQL running? See logs/app.log.");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
