// src/components/ui/withErrorBoundary.tsx
import React, { ComponentType, ErrorInfo } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface WithErrorBoundaryProps {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  [key: string]: any;
}

interface ErrorBoundarySpecificProps {
  fallback?: (
    error: Error | null,
    errorInfo: ErrorInfo | null,
    handleRetry: () => void
  ) => React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * @param WrappedComponent - Component to wrap
 * @param errorBoundaryProps - Props to pass to ErrorBoundary
 * @returns Component wrapped with ErrorBoundary
 */
const withErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps: WithErrorBoundaryProps = {}
) => {
  const WithErrorBoundaryComponent = (
    props: P & ErrorBoundarySpecificProps
  ) => {
    // Destructure ErrorBoundary specific props
    const { fallback, onError, ...componentProps } = props;

    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        fallback={fallback}
        onError={onError}
      >
        <WrappedComponent {...(componentProps as P)} />
      </ErrorBoundary>
    );
  };

  // Set display name for debugging
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

export default withErrorBoundary;
