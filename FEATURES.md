# StillMotion.ai - Complete Feature Documentation

## Overview
StillMotion.ai is an AI-powered web application that transforms static images into animated GIFs. The platform uses advanced AI models through Replicate API to generate high-quality animations from user-uploaded images and prompts.

## Core Features

### 1. Authentication System
- **Dual Authentication**: Uses NextAuth.js for session management and Supabase Auth for additional features
- **User Registration**: Email/password signup with email confirmation
- **Login**: Standard email/password authentication with JWT tokens for mobile app support
- **Password Recovery**: Email-based password reset through Supabase
- **Session Management**: Auto-refresh middleware keeps sessions active
- **Welcome Bonus**: New users receive 5 free credits upon registration

### 2. GIF Generation Engine
- **Image Upload**: Supports JPG/PNG images up to 5MB via drag-and-drop or file browser
- **Prompt System**: Natural language descriptions guide the animation (e.g., "gentle waves flowing")
- **Prompt Enhancement**: Optional AI-powered prompt improvement for better results
- **Generation Modes**:
  - **Fast & Great** (2 credits): High-quality results in 1-3 minutes
  - **Slow & Good** (1 credit): Budget-friendly option, 2-5 minutes
- **Batch Generation**: Create 1-10 GIFs in a single request with the same image/prompt
- **Advanced Settings** (Fast mode only):
  - Steps control (1-40): Higher steps = better quality
  - Guide scale (0-10): Controls prompt adherence
- **Real-time Progress**: Visual feedback during generation

### 3. Gallery & Media Management
- **Personal Gallery**: View all generated GIFs organized by date
- **Preview System**: 
  - Static thumbnails that animate on hover
  - Three thumbnail sizes (Small/Medium/Large)
- **Search & Filter**:
  - Text search by prompt
  - Status filter (All/Completed/Processing/Failed)
- **GIF Details Modal**:
  - Full-size animated preview
  - Source image display
  - Prompt and creation details
  - Frame selection and extraction
  - Download options (GIF/MP4)
- **Regeneration Options**:
  - **Tweak**: Modify prompt and settings before regenerating
  - **Direct Regenerate**: One-click recreation with same settings
- **Batch Management**: Delete unwanted GIFs

### 4. Credits & Monetization
- **Credit System**:
  - Fast generation: 2 credits per GIF
  - Slow generation: 1 credit per GIF
  - Credits never expire
- **Purchase Options**:
  - 2 credits for $1.00 (trial package)
  - 10 credits for $4.50 (most popular)
  - 30 credits for $12.00 (best value)
- **Stripe Integration**: Secure payment processing
- **Real-time Balance**: Credit count updates instantly
- **Purchase Flow**: Seamless checkout with success/cancel handling

### 5. Admin Dashboard
- **User Management**:
  - View all users with sortable columns
  - Edit user credits directly
  - See user registration dates
  - Admin status indicators
- **Content Overview**:
  - View recent GIFs from all users
  - Monitor platform usage
- **Access Control**: Admin-only routes with role verification

### 6. Technical Infrastructure
- **Dual Storage System**:
  - Supabase for images (`stillmotion-images` bucket)
  - Supabase for GIFs (`stillmotion-videos` bucket)
  - User-namespaced file organization
- **Processing Pipeline**:
  - Primary video generation via Replicate API
  - Webhook-based completion notifications
  - Automatic MP4 to GIF conversion
  - Fallback polling system for reliability
- **Error Handling**:
  - Graceful degradation for failed generations
  - Automatic retry mechanisms
  - User-friendly error messages

### 7. UI/UX Features
- **Responsive Design**: Works on desktop, tablet, and mobile browsers
- **Dark Theme**: Modern dark interface with gradient accents
- **Loading States**: Skeleton screens and progress indicators
- **Toast Notifications**: Real-time feedback for all actions
- **Keyboard Navigation**: Accessible interface elements
- **Smooth Animations**: CSS transitions and hover effects

### 8. API Endpoints
- **Public APIs**:
  - User authentication and registration
  - Video generation and status checking
  - Gallery management
  - Credit purchases
- **Protected APIs**:
  - Admin user management
  - Admin content viewing
- **Webhook Handlers**:
  - Replicate completion notifications
  - Stripe payment confirmations

### 9. Security Features
- **Authentication**: Secure password hashing with bcrypt
- **API Protection**: Route-level authentication checks
- **File Validation**: Type and size restrictions on uploads
- **Webhook Verification**: Signature validation for external services
- **Admin Isolation**: Separate permission system for admin features

## User Journey

1. **New User Flow**:
   - Land on marketing page → Sign up → Receive 5 free credits
   - Upload image → Enter prompt → Generate first GIF
   - View in gallery → Download or share

2. **Returning User Flow**:
   - Login → View gallery → Create new or modify existing
   - Low credits → Purchase package → Continue creating

3. **Power User Features**:
   - Batch generation for multiple variations
   - Advanced settings for fine control
   - Direct regeneration for quick iterations

## Platform Statistics
- Average generation time: 1-5 minutes
- Supported formats: JPG, PNG input → GIF, MP4 output
- Maximum file size: 5MB for uploads
- Credit packages: $0.45-$0.50 per credit
- Gallery capacity: Unlimited storage per user