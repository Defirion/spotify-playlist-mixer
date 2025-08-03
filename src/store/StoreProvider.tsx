import React, { useEffect } from 'react';
import { useAppStore } from './index';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Store provider component that handles initialization and persistence
 * This component can be used to set up store subscriptions, persistence, etc.
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const setAccessToken = useAppStore(state => state.setAccessToken);

  useEffect(() => {
    // Initialize store with any persisted data
    // For now, we'll just handle the access token from localStorage if needed
    const persistedToken = localStorage.getItem('spotify_access_token');
    if (persistedToken) {
      setAccessToken(persistedToken);
    }

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
  }, [setAccessToken]);

  return <>{children}</>;
};
