import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import prisma from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        // Remove hashedPassword from the user object before returning
        // Prefix with _ to indicate it's intentionally unused
        const { hashedPassword: _hashedPassword, ...userWithoutPassword } = user;

        return userWithoutPassword;
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Include user.id and credits on session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.credits = token.credits as number;
      }
      return session;
    },
    // Include user.id and credits on JWT token
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // @ts-expect-error - User model has credits but default type might not reflect it
        token.credits = user.credits;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login", // Redirect users to /login page for sign in
  }
}; 