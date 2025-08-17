import React from 'react';
import ErrorBoundary from './ui/ErrorBoundary';

type Props = { children: React.ReactNode };

export default function DragErrorBoundary({ children }: Props) {
  const fallback = (
    _error: Error | null,
    _errorInfo: React.ErrorInfo | null,
    handleRetry?: () => void
  ) => (
    <div role="alert" data-testid="drag-error-boundary">
      <p>Something went wrong with drag operations.</p>
      <button
        onClick={() => {
          if (handleRetry) handleRetry();
        }}
      >
        Retry
      </button>
    </div>
  );

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
