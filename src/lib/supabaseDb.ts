import { supabase } from './supabaseClient';
import { createId } from '@paralleldrive/cuid2';

// Database tables 
export const TABLES = {
  // Table names must match the ones created by direct SQL migrations (case-sensitive)
  USERS: 'User',
  ACCOUNTS: 'Account',
  SESSIONS: 'Session',
  VERIFICATION_TOKENS: 'VerificationToken',
  VIDEOS: 'Video',
};

// Define types for user data
interface UserData {
  id?: string;
  name?: string;
  email?: string;
  emailVerified?: string | null;
  image?: string;
  hashedPassword?: string;
  createdAt?: string;
  updatedAt?: string;
  credits?: number;
}

// Define types for account data
interface AccountData {
  id?: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

// Define types for session data
interface SessionData {
  id?: string;
  sessionToken: string;
  userId: string;
  expires: string;
}

// Define types for verification token data
interface VerificationTokenData {
  identifier: string;
  token: string;
  expires: string;
}

// Define types for video data
interface VideoData {
  id?: string;
  userId: string;
  imageUrl: string;
  prompt: string;
  videoUrl?: string;
  status?: string;
  replicatePredictionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User model operations
 */
export const users = {
  /**
   * Find a user by their unique email
   */
  findByEmail: async (email: string) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error finding user by email:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Find a user by ID
   */
  findById: async (id: string) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding user by ID:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Create a new user
   */
  create: async (userData: UserData) => {
    // Generate a CUID for the user ID if not provided
    const user = {
      id: userData.id || createId(),
      ...userData,
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: userData.updatedAt || new Date().toISOString(),
      credits: userData.credits || 5, // Default 5 credits for new users
    };

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert([user])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Update a user
   */
  update: async (id: string, userData: Partial<UserData>) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        ...userData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Delete a user by ID
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
    
    return true;
  }
};

/**
 * Account model operations (for OAuth)
 */
export const accounts = {
  /**
   * Find an account by provider and provider account ID
   */
  findByProvider: async (provider: string, providerAccountId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ACCOUNTS)
      .select('*')
      .eq('provider', provider)
      .eq('providerAccountId', providerAccountId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding account by provider:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Find accounts by user ID
   */
  findByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ACCOUNTS)
      .select('*')
      .eq('userId', userId);
    
    if (error) {
      console.error('Error finding accounts by user ID:', error);
      return [];
    }
    
    return data;
  },

  /**
   * Create a new account
   */
  create: async (accountData: AccountData) => {
    const account = {
      id: accountData.id || createId(),
      ...accountData,
    };

    const { data, error } = await supabase
      .from(TABLES.ACCOUNTS)
      .insert([account])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating account:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Delete accounts by user ID
   */
  deleteByUserId: async (userId: string) => {
    const { error } = await supabase
      .from(TABLES.ACCOUNTS)
      .delete()
      .eq('userId', userId);
    
    if (error) {
      console.error('Error deleting accounts by user ID:', error);
      throw error;
    }
    
    return true;
  }
};

/**
 * Session model operations
 */
export const sessions = {
  /**
   * Find a session by token
   */
  findByToken: async (sessionToken: string) => {
    const { data, error } = await supabase
      .from(TABLES.SESSIONS)
      .select('*')
      .eq('sessionToken', sessionToken)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding session by token:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Create a new session
   */
  create: async (sessionData: SessionData) => {
    const session = {
      id: sessionData.id || createId(),
      ...sessionData,
    };

    const { data, error } = await supabase
      .from(TABLES.SESSIONS)
      .insert([session])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Update a session
   */
  update: async (sessionToken: string, sessionData: Partial<SessionData>) => {
    const { data, error } = await supabase
      .from(TABLES.SESSIONS)
      .update(sessionData)
      .eq('sessionToken', sessionToken)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating session:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Delete a session by token
   */
  deleteByToken: async (sessionToken: string) => {
    const { error } = await supabase
      .from(TABLES.SESSIONS)
      .delete()
      .eq('sessionToken', sessionToken);
    
    if (error) {
      console.error('Error deleting session by token:', error);
      throw error;
    }
    
    return true;
  },

  /**
   * Delete sessions by user ID
   */
  deleteByUserId: async (userId: string) => {
    const { error } = await supabase
      .from(TABLES.SESSIONS)
      .delete()
      .eq('userId', userId);
    
    if (error) {
      console.error('Error deleting sessions by user ID:', error);
      throw error;
    }
    
    return true;
  }
};

/**
 * VerificationToken model operations
 */
export const verificationTokens = {
  /**
   * Find a verification token by identifier and token
   */
  findByToken: async (identifier: string, token: string) => {
    const { data, error } = await supabase
      .from(TABLES.VERIFICATION_TOKENS)
      .select('*')
      .eq('identifier', identifier)
      .eq('token', token)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding verification token:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Create a new verification token
   */
  create: async (tokenData: VerificationTokenData) => {
    const { data, error } = await supabase
      .from(TABLES.VERIFICATION_TOKENS)
      .insert([tokenData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating verification token:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Delete a verification token by identifier and token
   */
  deleteByToken: async (identifier: string, token: string) => {
    const { error } = await supabase
      .from(TABLES.VERIFICATION_TOKENS)
      .delete()
      .eq('identifier', identifier)
      .eq('token', token);
    
    if (error) {
      console.error('Error deleting verification token:', error);
      throw error;
    }
    
    return true;
  }
};

/**
 * Video model operations
 */
export const videos = {
  /**
   * Find all videos by user ID
   */
  findByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.VIDEOS)
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error finding videos by user ID:', error);
      return [];
    }
    
    return data;
  },

  /**
   * Find a video by ID
   */
  findById: async (id: string) => {
    const { data, error } = await supabase
      .from(TABLES.VIDEOS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding video by ID:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Find a video by Replicate prediction ID
   */
  findByPredictionId: async (predictionId: string) => {
    const { data, error } = await supabase
      .from(TABLES.VIDEOS)
      .select('*')
      .eq('replicatePredictionId', predictionId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error finding video by prediction ID:', error);
      }
      return null;
    }
    
    return data;
  },

  /**
   * Create a new video
   */
  create: async (videoData: VideoData) => {
    const video = {
      id: videoData.id || createId(),
      ...videoData,
      createdAt: videoData.createdAt || new Date().toISOString(),
      updatedAt: videoData.updatedAt || new Date().toISOString(),
      status: videoData.status || 'processing',
    };

    const { data, error } = await supabase
      .from(TABLES.VIDEOS)
      .insert([video])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating video:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Update a video
   */
  update: async (id: string, videoData: Partial<VideoData>) => {
    const { data, error } = await supabase
      .from(TABLES.VIDEOS)
      .update({
        ...videoData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating video:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Delete a video by ID
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from(TABLES.VIDEOS)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
    
    return true;
  }
};

// Combined database exports
export const db = {
  users,
  accounts,
  sessions,
  verificationTokens,
  videos,
}; 