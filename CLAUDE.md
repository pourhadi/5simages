# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build with Prisma client generation
npm run lint         # Run ESLint
npm run db:migrate   # Deploy Prisma migrations to database
npm run db:seed      # Seed database with initial data
```

## Architecture Overview

**StillMotion.ai** is a Next.js 15 application that transforms static images into animated GIFs using AI. The architecture uses a dual authentication system (NextAuth.js + Supabase), credit-based monetization, and Replicate API for AI video generation.

### Database Schema (Prisma + PostgreSQL)
- **User**: Credits system, admin flags, authentication data
- **Video**: AI generation tracking, URLs, Replicate prediction IDs
- Uses Supabase as both storage provider and auth middleware

### Authentication Flow
- **Dual System**: NextAuth.js handles sessions, Supabase middleware refreshes tokens
- **Credentials Provider**: Email/password with bcrypt hashing
- **Auto-refresh**: Middleware at `/middleware.ts` refreshes Supabase sessions on every request
- **Session Token**: Includes user credits for real-time credit tracking

### File Storage Pattern
- **Supabase Storage**: Separate buckets for images (`stillmotion-images`) and videos (`stillmotion-videos`)
- **User Namespacing**: Files stored as `userId/randomUUID_filename`
- **Admin Operations**: Use service role client in `/lib/supabaseDb.ts`

### Credit System
- **Generation Costs**: Fast/Great quality (2 credits), Slow/Good quality (1 credit)
- **Stripe Integration**: Payment processing for credit packages
- **Real-time Updates**: Credits tracked in JWT tokens, refreshed on generation

### AI Video Generation Workflow
1. Image upload to Supabase storage
2. Replicate API call with image URL, parameters, and webhook URL
3. Webhook receives completion notification at `/api/replicate-webhook`
4. External service converts MP4 to GIF
5. Final GIF uploaded to Supabase storage
6. Polling system remains as fallback for status checking

### Key File Locations
- **Auth Config**: `/lib/authOptions.ts` (NextAuth.js setup)
- **Database Client**: `/lib/prisma.ts` and `/lib/supabaseDb.ts`
- **Payment Processing**: `/lib/stripe.ts`
- **Main Generator**: `/components/v2/GIFGenerator.tsx`
- **Auth Middleware**: `/middleware.ts` (Supabase session refresh)

### API Structure
- **Generation**: `/api/generate-video`, `/api/check-status`, `/api/replicate-webhook`
- **Payment**: `/api/checkout`, `/api/credits/purchase`, `/api/payments/verify`
- **Admin**: `/api/admin/users`, `/api/admin/videos`
- **Auth**: `/api/login`, `/api/register`, `/api/forgot-password`


### Environment Requirements
Critical environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REPLICATE_API_TOKEN`, `STRIPE_SECRET_KEY`, `NEXTAUTH_SECRET`.

Optional for webhooks: `REPLICATE_WEBHOOK_SECRET` (for signature verification), `NEXT_PUBLIC_SITE_URL` (for webhook URL construction).

## iOS Mobile App

A native iOS app is available in the `/ios` directory, built with SwiftUI and targeting iOS 17+. The app provides full feature parity with the web application:

### iOS App Features
- Native authentication (login/signup)
- Image upload from camera or photo library
- GIF generation with all web app options (prompt enhancement, fast/slow modes, advanced settings)
- Multiple generation support (1-10 GIFs per submission)
- Gallery view with pull-to-refresh
- Detailed GIF view with source image, prompt, and actions
- Frame selection and extraction
- GIF download to Photos
- "Tweak" functionality to regenerate with modified prompts
- Credit purchase via web checkout
- Real-time credit tracking

### iOS Development Commands
```bash
# Open project
open /Users/dan/projects/i2v/ios/StillMotion/StillMotion.xcworkspace

# Build and run on simulator
build_run_ios_sim_name_ws --workspace-path "/Users/dan/projects/i2v/ios/StillMotion/StillMotion.xcworkspace" --scheme "StillMotion" --simulator-name "iPhone 16"
```

The iOS app uses the same backend API endpoints and maintains design consistency with the web application.