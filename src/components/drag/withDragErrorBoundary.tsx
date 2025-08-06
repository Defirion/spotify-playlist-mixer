import React, { ComponentType, ErrorInfo } from 'react';
import DragErrorBoundary from './DragErrorBoundary';

interface WithDragErrorBoundaryProps {
  onDragError?: (error: Error, errorInfo: ErrorInfo) => void;
  dragErrorFallback?: (
    error: Error | null,
    errorInfo: ErrorInfo | null,
    handleRetry: () => void
  ) => React.ReactNode;
  [key: string]: any;
}

interface DragErrorBoundarySpecificProps {
  onDragError?: (error: Error, errorInfo: ErrorInfo) => void;
  dragErrorFallback?: (
    error: Error | null,
    errorInfo: ErrorInfo | null,
    handleRetry: () => void
  ) => React.ReactNode;
}

/**
 * Higher-order component that wraps a component with a DragErrorBoundary
 *
 * This HOC provides automatic error handling and drag state cleanup for
 * components that use drag-and-drop functionality. It's specifically designed
 * for drag-related components and provides specialized error recovery.
 *
 * @param WrappedComponent - Component to wrap with drag error boundary
 * @param dragErrorBoundaryProps - Props to pass to DragErrorBoundary
 * @returns Component wrapped with DragErrorBoundary
 *
 * @example
 * ```tsx
 * const SafeDraggableTrackList = withDragErrorBoundary(DraggableTrackList, {
 *   onDragError: (error, errorInfo) => {
 *     console.error('Drag error in TrackList:', error);
 *     // Report to error monitoring service
 *   }
 * });
 * ```
 */
const withDragErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  dragErrorBoundaryProps: WithDragErrorBoundaryProps = {}
) => {
  const WithDragErrorBoundaryComponent = (
    props: P & DragErrorBoundarySpecificProps
  ) => {
    // Destructure DragErrorBoundary specific props
    const { onDragError, dragErrorFallback, ...componentProps } = props;

    // Merge props with defaults
    const mergedProps = {
      ...dragErrorBoundaryProps,
      onError: onDragError || dragErrorBoundaryProps.onDragError,
      fallback: dragErrorFallback || dragErrorBoundaryProps.dragErrorFallback,
    };

    return (
      <DragErrorBoundary {...mergedProps}>
        <WrappedComponent {...(componentProps as P)} />
      </DragErrorBoundary>
    );
  };

  // Set display name for debugging
  WithDragErrorBoundaryComponent.displayName = `withDragErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithDragErrorBoundaryComponent;
};

export default withDragErrorBoundary;

/**
 * Convenience function for creating drag error boundary wrapped components
 * with common error handling patterns
 */
export const createDragSafeComponent = <P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    componentName?: string;
    logErrors?: boolean;
    reportToService?: (error: Error, errorInfo: ErrorInfo) => void;
  } = {}
) => {
  const { componentName, logErrors = true, reportToService } = options;

  return withDragErrorBoundary(WrappedComponent, {
    onDragError: (error: Error, errorInfo: ErrorInfo) => {
      if (logErrors) {
        console.error(
          `[${componentName || WrappedComponent.name}] Drag operation error:`,
          {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: Date.now(),
          }
        );
      }

      // Report to external error monitoring service
      if (reportToService) {
        try {
          reportToService(error, errorInfo);
        } catch (reportError) {
          console.error(
            'Failed to report drag error to monitoring service:',
            reportError
          );
        }
      }
    },
  });
};

/**
 * Pre-configured drag error boundary for track list components
 */
export const withTrackListErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>
) =>
  createDragSafeComponent(WrappedComponent, {
    componentName: 'TrackList',
    logErrors: true,
  });

/**
 * Pre-configured drag error boundary for modal components
 */
export const withModalErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>
) =>
  createDragSafeComponent(WrappedComponent, {
    componentName: 'Modal',
    logErrors: true,
  });

/**
 * Pre-configured drag error boundary for individual track components
 */
export const withTrackItemErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>
) =>
  createDragSafeComponent(WrappedComponent, {
    componentName: 'TrackItem',
    logErrors: process.env.NODE_ENV === 'development', // Only log in development for track items
  });
