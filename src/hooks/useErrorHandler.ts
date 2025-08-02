import { useState, useCallback } from 'react';

// Error types for the hook
export type ErrorType = Error | string | null;

export interface UseErrorHandlerOptions {
  onError?: (error: Error, errorInfo?: any) => void;
  fallback?: any;
  resetOnPropsChange?: boolean;
  resetKeys?: any[];
}

export interface UseErrorHandlerReturn {
  error: Error | null;
  isRetrying: boolean;
  hasError: boolean;
  handleError: (error: ErrorType) => void;
  clearError: () => void;
  retry: (retryFn?: () => Promise<void>) => Promise<void>;
  withErrorHandling: <T extends (...args: any[]) => Promise<any>>(
    asyncFn: T
  ) => T;
}

/**
 * Custom hook for handling errors in functional components
 * Provides error state management and recovery mechanisms
 */
const useErrorHandler = (
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn => {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  /**
   * Handle an error by setting it in state
   * @param error - The error to handle (Error object, string, or null)
   */
  const handleError = useCallback(
    (error: ErrorType) => {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      console.error('Error handled by useErrorHandler:', errorObj);
      setError(errorObj);
      setIsRetrying(false);

      // Call optional error callback
      if (options.onError) {
        options.onError(errorObj);
      }
    },
    [options.onError]
  );

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  /**
   * Retry an operation after an error
   * @param retryFn - Function to retry (optional)
   */
  const retry = useCallback(
    async (retryFn?: () => Promise<void>): Promise<void> => {
      if (!retryFn) {
        clearError();
        return;
      }

      setIsRetrying(true);
      try {
        await retryFn();
        clearError();
      } catch (retryError) {
        handleError(retryError as Error);
      }
    },
    [clearError, handleError]
  );

  /**
   * Wrapper function that catches errors from async operations
   * @param asyncFn - Async function to wrap
   * @returns Wrapped function that handles errors
   */
  const withErrorHandling = useCallback(
    <T extends (...args: any[]) => Promise<any>>(asyncFn: T): T => {
      return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
          setError(null);
          return await asyncFn(...args);
        } catch (error) {
          handleError(error as Error);
          throw error; // Re-throw so calling code can handle if needed
        }
      }) as T;
    },
    [handleError]
  );

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
    withErrorHandling,
    hasError: !!error,
  };
};

export default useErrorHandler;
