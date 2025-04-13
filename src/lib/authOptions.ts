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
        const { hashedPassword, ...userWithoutPassword } = user;
        
        // Mark hashedPassword as intentionally unused
        void hashedPassword;

        return userWithoutPassword;
      },
    }),
    // You can add more OAuth providers here in the future
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // }),
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
        
        // Use token credits instead of querying the database on every session request
        session.user.credits = token.credits as number;
      }
      return session;
    },
    // Include user.id and credits on JWT token
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // Add credits if available on the user object
        if ('credits' in user) {
          token.credits = user.credits as number;
        }
      }
      
      // Occasionally fetch latest credit count directly from database
      // This helps ensure we have fresh credit data on the token
      if (token.sub && Math.random() < 0.3) { // 30% chance to refresh on each token refresh
        try {
          const latestUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { credits: true }
          });
          
          if (latestUser) {
            token.credits = latestUser.credits;
          }
        } catch (error) {
          console.error('Error refreshing credits in JWT callback:', error);
          // Continue with existing token data if refresh fails
        }
      }
      
      return token;
    },
  },
  events: {
    // Ensure all new users get 5 free credits when created
    createUser: async ({ user }) => {
      // This is only triggered for OAuth users - Credentials users are handled in the register API
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: 5 }
      });
      console.log(`Added 5 free credits to new user: ${user.email}`);
    }
  },
  pages: {
    signIn: "/login", // Redirect users to /login page for sign in
  }
}; 