import React, { useEffect } from 'react';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Store provider component that handles initialization and persistence
 * This component can be used to set up store subscriptions, persistence, etc.
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  // No-op: we intentionally do not persist access tokens to localStorage to
  // ensure the app requires a fresh Spotify connection on each start.
  useEffect(() => {
    // Intentionally left blank.
    return () => {};
  }, []);

  return <>{children}</>;
};
