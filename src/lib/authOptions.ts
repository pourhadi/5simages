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
    async jwt({ token, user, trigger }) {
      // Initial sign in - set the token from the user object
      if (user) {
        token.sub = user.id;
        // Add credits if available on the user object
        if ('credits' in user) {
          console.log('JWT callback: Setting initial credits from user object', {
            userId: user.id,
            credits: user.credits,
            trigger
          });
          token.credits = user.credits as number;
        }
        return token;
      }
      
      // Handle explicit update triggers - but only if we actually need to update something
      if (trigger === 'update') {
        try {
          // Skip database lookup unless specifically required (for credit updates)
          // This prevents unnecessary database calls
          const shouldFetchLatestCredits = true; // Enable database lookup to get latest credit balance
          
          if (shouldFetchLatestCredits) {
            console.log('JWT callback: Fetching latest credits from database');
            
            // Fetch the latest user data to get updated credits
            const latestUser = await prisma.user.findUnique({
              where: { id: token.sub as string },
              select: { credits: true }
            });
            
            if (latestUser && latestUser.credits !== token.credits) {
              console.log('JWT callback: Updated credits in token', {
                userId: token.sub,
                oldCredits: token.credits,
                newCredits: latestUser.credits
              });
              token.credits = latestUser.credits;
            }
          } else {
            console.log('JWT callback: Skipping database fetch for token update');
          }
        } catch (error) {
          console.error('Failed to update token with latest user data:', error);
        }
      }
      
      return token;
    },
  },
  events: {
    // Ensure all new users get 3 free credits when created
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