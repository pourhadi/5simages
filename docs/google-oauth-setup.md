# Google OAuth Setup Guide

This guide explains how to set up Google OAuth authentication for StillMotion.ai.

## Prerequisites

1. Access to your Supabase project dashboard
2. A Google Cloud Console account
3. Your application's public URL (for production) or `http://localhost:3000` (for development)

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields (app name, support email, etc.)
   - Add your domain to authorized domains
   - Add necessary scopes: `email` and `profile`
6. For the OAuth client ID:
   - Application type: **Web application**
   - Name: "StillMotion.ai" (or your preferred name)
   - Authorized JavaScript origins:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co`
     - Your production domain (e.g., `https://stillmotion.ai`)
     - `http://localhost:3000` (for development)
   - Authorized redirect URIs:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
     - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`
     - `http://localhost:3000/auth/callback` (for development)
7. Save your **Client ID** and **Client Secret**

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click to expand
5. Enable the Google provider
6. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth client ID
   - **Client Secret**: Your Google OAuth client secret
7. The redirect URL shown in Supabase should match what you configured in Google Console
8. Click **Save**

## Step 3: Update Your Application

The application code is already configured to support Google OAuth. The following components handle OAuth:

- `/src/lib/supabaseBrowser.ts` - Contains the `signInWithGoogle()` function
- `/src/components/v2/AuthPages.tsx` - Login/register UI with Google sign-in button
- `/src/app/auth/callback/route.ts` - OAuth callback handler

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/login` or `/register`
3. Click the "Continue with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you should be redirected back to your application and logged in

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch" error**
   - Ensure the redirect URI in Google Console exactly matches Supabase's callback URL
   - Check for trailing slashes or protocol differences (http vs https)

2. **"Invalid client" error**
   - Verify that the Client ID and Secret are correctly entered in Supabase
   - Ensure the Google OAuth app is not in "Testing" mode if in production

3. **User not created in database**
   - Check the `/src/app/auth/callback/route.ts` file for any errors
   - Ensure your database has the proper schema for OAuth users

### Database Considerations

OAuth users are created with:
- `id`: Supabase Auth UUID
- `email`: From Google account
- `name`: From Google profile (or email prefix)
- `password`: Empty string (OAuth users don't have passwords)
- `emailVerified`: Set to current date (Google accounts are pre-verified)
- `image`: Google profile picture URL
- `credits`: 5 (welcome bonus)

## Security Notes

1. Never commit Google OAuth credentials to version control
2. Use environment variables for sensitive configuration
3. Ensure HTTPS is used in production for all OAuth flows
4. Regularly rotate your OAuth client secret

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase OAuth Providers Guide](https://supabase.com/docs/guides/auth/social-login)