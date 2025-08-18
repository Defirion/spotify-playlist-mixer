import React from 'react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { StoreProvider } from './store/StoreProvider';

const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ErrorBoundary>
      <StoreProvider>{children}</StoreProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
