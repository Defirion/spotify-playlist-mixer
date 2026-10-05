import React from 'react';

interface StoreProviderProps {
  children: React.ReactNode;
}

/** Composition wrapper; Zustand initializes at module load without persisting tokens. */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => (
  <>{children}</>
);
