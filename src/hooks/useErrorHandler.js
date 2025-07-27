import { useState, useCallback } from 'react';

/**
 * Custom hook for handling errors in functional components
 * Provides error state management and recovery mechanisms
 */
const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Handle an error by setting it in state
   * @param {Error|string} error - The error to handle
   */
  const handleError = useCallback(error => {
    console.error('Error handled by useErrorHandler:', error);
    setError(error);
    setIsRetrying(false);
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  /**
   * Retry an operation after an error
   * @param {Function} retryFn - Function to retry
   */
  const retry = useCallback(
    async retryFn => {
      if (!retryFn) {
        clearError();
        return;
      }

      setIsRetrying(true);
      try {
        await retryFn();
        clearError();
      } catch (retryError) {
        handleError(retryError);
      }
    },
    [clearError, handleError]
  );

  /**
   * Wrapper function that catches errors from async operations
   * @param {Function} asyncFn - Async function to wrap
   * @returns {Function} Wrapped function that handles errors
   */
  const withErrorHandling = useCallback(
    asyncFn => {
      return async (...args) => {
        try {
          setError(null);
          return await asyncFn(...args);
        } catch (error) {
          handleError(error);
          throw error; // Re-throw so calling code can handle if needed
        }
      };
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
