# StillMotion.ai

StillMotion.ai is a web application that transforms static images into engaging videos using AI technology.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Image to video transformation using AI
- User authentication and account management
- Credit system for video generation
- Gallery for viewing and managing created videos
- Secure payment integration with Stripe

## Technology Stack

- Next.js for the frontend and API routes
- Supabase for database and authentication
- Stripe for payment processing
- AI video generation model

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

- NEXT_PUBLIC_SITE_URL: Base URL of your app (e.g., https://stillmotion.ai) used for email confirmation and password reset redirects.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase project’s public (anon) API key, required for client-side Supabase operations (e.g., resetting passwords).
  
Optional (for Vercel deployments):
- VERCEL_URL: Automatically provided by Vercel for building redirect URLs in password reset emails.

## Authentication Notes

This project uses Supabase Auth for user management. A `middleware.ts` file is
included which calls `supabase.auth.getSession()` on every request. This ensures
expired access tokens are automatically refreshed so users stay logged in while
browsing the site.
