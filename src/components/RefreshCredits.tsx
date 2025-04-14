'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { RefreshCw } from 'lucide-react';

/**
 * A debug component that can be added to pages to check credit balance and refresh the session
 * Can be removed in production
 */
export default function RefreshCredits() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [dbCredits, setDbCredits] = useState<number | null>(null);
  const [inSync, setInSync] = useState<boolean | null>(null);
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Refresh the session first
      await update();
      
      // Then fetch the database credits for comparison
      const response = await fetch('/api/user/credits');
      const data = await response.json();
      
      if (response.ok) {
        setDbCredits(data.databaseCredits);
        setInSync(data.inSync);
      }
    } catch (error) {
      console.error('Failed to refresh credits:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!session) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-3 rounded-md shadow-lg">
      <div className="mb-2 text-sm">
        <span className="font-medium">Session credits:</span> {session.user.credits}
        {dbCredits !== null && (
          <>
            <br />
            <span className="font-medium">Database credits:</span> {dbCredits}
            <br />
            <span className="font-medium">In sync:</span> 
            <span className={inSync ? 'text-green-400' : 'text-red-400'}>
              {inSync ? 'Yes' : 'No'}
            </span>
          </>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
      >
        {isLoading ? (
          <>
            <RefreshCw className="animate-spin h-3 w-3" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3" />
            Refresh Credits
          </>
        )}
      </button>
    </div>
  );
} 