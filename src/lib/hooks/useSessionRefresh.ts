import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

/**
 * Custom hook that handles session refreshing.
 * Can be used in components that need to ensure they display the latest user data.
 * 
 * This version is deliberately conservative about refreshing to prevent refresh loops.
 * 
 * @param options Configuration options for the hook
 * @param options.refreshOnMount Whether to refresh the session when the component mounts
 * @returns The session object from useSession
 */
export function useSessionRefresh({
  refreshOnMount = false, // Default to false to be conservative
} = {}) {
  const session = useSession();
  const { update } = session;
  const hasRefreshed = useRef(false);
  
  // Refresh on component mount - only once if explicitly requested
  useEffect(() => {
    // Only refresh if:
    // 1. We haven't already refreshed
    // 2. The user specifically requested a refresh
    // 3. The user is authenticated
    if (session.status === 'authenticated' && 
        refreshOnMount && 
        !hasRefreshed.current) {
      
      hasRefreshed.current = true;
      
      // Use setTimeout to prevent synchronous updates
      const timeoutId = setTimeout(() => {
        console.log('useSessionRefresh: Refreshing session once on mount');
        update();
      }, 500); // Longer timeout to avoid conflicts
      
      return () => clearTimeout(timeoutId);
    }
  }, [session.status, update, refreshOnMount]);
  
  return session;
}

export default useSessionRefresh; 