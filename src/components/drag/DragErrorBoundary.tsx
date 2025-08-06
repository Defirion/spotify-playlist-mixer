import React from 'react';
import { useDragState } from '../../hooks/drag/useDragState';
import ErrorBoundary from '../ui/ErrorBoundary';
import styles from './DragErrorBoundary.module.css';

interface DragErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: (
    error: Error | null,
    errorInfo: React.ErrorInfo | null,
    handleRetry: () => void
  ) => React.ReactNode;
}

/**
 * Specialized error boundary for drag-and-drop operations
 *
 * This component wraps drag-related components and automatically cleans up
 * drag state when JavaScript errors occur during drag operations. It provides
 * specialized error handling and recovery mechanisms for drag failures.
 *
 * Features:
 * - Automatic drag state cleanup on errors
 * - Specialized error logging for drag operations
 * - User-friendly error messages for drag failures
 * - Recovery mechanisms specific to drag operations
 */
const DragErrorBoundary: React.FC<DragErrorBoundaryProps> = ({
  children,
  onError,
  fallback,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isDragging, draggedItem, endDrag, cancelDrag } = useDragState();

  const handleDragError = React.useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      // Log drag-specific error information
      console.error('[DragErrorBoundary] Drag operation error caught:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        isDragging,
        draggedItem: draggedItem
          ? {
              id: draggedItem.id,
              type: draggedItem.type,
              timestamp: draggedItem.timestamp,
            }
          : null,
        timestamp: Date.now(),
      });

      // Clean up drag state immediately to prevent stuck states
      try {
        if (isDragging) {
          console.log(
            '[DragErrorBoundary] Cleaning up drag state due to error'
          );
          cancelDrag();

          // Additional cleanup for visual feedback
          document.body.classList.remove('no-user-select', 'drag-active');
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
        }
      } catch (cleanupError) {
        console.error(
          '[DragErrorBoundary] Error during drag state cleanup:',
          cleanupError
        );
      }

      // Call the provided error handler
      onError?.(error, errorInfo);
    },
    [isDragging, draggedItem, cancelDrag, onError]
  );

  const dragSpecificFallback = React.useCallback(
    (
      error: Error | null,
      errorInfo: React.ErrorInfo | null,
      handleRetry: () => void
    ) => {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, handleRetry);
      }

      // Default drag-specific fallback UI
      return (
        <div className={`${styles.dragErrorContainer} drag-error-boundary`}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>🎵</div>
            <h3 className={styles.errorTitle}>Drag Operation Failed</h3>
            <p className={styles.errorMessage}>
              Something went wrong while moving your tracks. Don't worry - your
              playlist is safe!
            </p>

            <div className={styles.errorActions}>
              <button
                className={`${styles.retryButton} btn btn-primary`}
                onClick={handleRetry}
                type="button"
              >
                Try Again
              </button>
            </div>

            <div className={styles.errorTips}>
              <p className={styles.tipTitle}>💡 Tips:</p>
              <ul className={styles.tipsList}>
                <li>Try refreshing the page if the problem persists</li>
                <li>Make sure you have a stable internet connection</li>
                <li>Try using smaller drag movements</li>
              </ul>
            </div>

            {/* Development mode details */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className={styles.developerDetails}>
                <summary className={styles.developerSummary}>
                  🔧 Developer Details
                </summary>
                <div className={styles.developerContent}>
                  <div className={styles.errorDetails}>
                    <strong>Error:</strong> {error.message}
                  </div>
                  <div className={styles.dragContext}>
                    <strong>Drag Context:</strong>
                    <pre className={styles.contextPre}>
                      {JSON.stringify(
                        {
                          isDragging,
                          draggedItem: draggedItem
                            ? {
                                id: draggedItem.id,
                                type: draggedItem.type,
                                timestamp: draggedItem.timestamp,
                              }
                            : null,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  {error.stack && (
                    <div className={styles.stackTrace}>
                      <strong>Stack Trace:</strong>
                      <pre className={styles.stackPre}>{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    },
    [fallback, isDragging, draggedItem]
  );

  return (
    <ErrorBoundary onError={handleDragError} fallback={dragSpecificFallback}>
      {children}
    </ErrorBoundary>
  );
};

export default DragErrorBoundary;
