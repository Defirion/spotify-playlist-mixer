import React, { useEffect } from 'react';
import { useAppStore, AppStore } from './index';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Store provider component that handles initialization and persistence
 * This component can be used to set up store subscriptions, persistence, etc.
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  useEffect(() => {
    // Set up store subscriptions for persistence
    const unsubscribe = useAppStore.subscribe(
      state => state.accessToken,
      accessToken => {
        if (accessToken) {
          localStorage.setItem('spotify_access_token', accessToken);
        } else {
          localStorage.removeItem('spotify_access_token');
        }
      }
    );

    return unsubscribe;
  }, []); // Empty dependency array - this should only run once

  return <>{children}</>;
};
