import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Browser-side Supabase client with OAuth support
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// OAuth sign in helper
export async function signInWithGoogle() {
  // Ensure we have a clean origin without any hash fragments
  const origin = window.location.origin;
  const redirectTo = `${origin}/auth/callback`;
  
  console.log('Initiating Google OAuth with redirect to:', redirectTo);
  
  const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'email profile',
    },
  });

  if (error) {
    console.error('OAuth initiation error:', error);
    throw error;
  }

  return data;
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabaseBrowser.auth.getSession();
  if (error) {
    throw error;
  }
  return session;
}

// Sign out
export async function signOut() {
  const { error } = await supabaseBrowser.auth.signOut();
  if (error) {
    throw error;
  }
}