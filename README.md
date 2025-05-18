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

## Cloud Run GIF Processor

The `worker` directory contains a small service that polls the database for
videos with a `processing` status and finalizes them. It checks the external
video APIs, converts completed videos to GIFs and uploads them to Supabase
storage. The main application no longer performs these steps; it simply polls
its `/api/check-status` endpoint which now returns the latest database record.
Run this worker in Cloud Run or locally alongside the Next.js app.

Run locally:

```bash
npx ts-node worker/index.ts
```

Build the container for Cloud Run:

```bash
gcloud builds submit --tag gcr.io/<PROJECT-ID>/gif-worker -f worker/Dockerfile
```

Environment variables used by the worker:

- `REPLICATE_API_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `VIDEO_API_URL` and `VIDEO_API_TOKEN` (optional)
- `VIDEO2GIF_API_KEY`
- `POLL_INTERVAL_MS` (optional, defaults to `5000`)
- `SUPABASE_GIFS_BUCKET_NAME` (optional)
