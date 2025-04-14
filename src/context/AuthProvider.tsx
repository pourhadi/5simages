'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <SessionProvider
      // Only refresh when window is focused, avoid interval refreshing
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
};

export default AuthProvider; 