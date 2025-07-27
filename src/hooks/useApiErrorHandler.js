import { useState, useCallback, useRef } from 'react';
import { ApiErrorHandler } from '../services/apiErrorHandler';

/**
 * React hook for handling API errors with user-friendly messages and retry logic
 * @param {Object} options - Configuration options
 * @param {Function} options.onError - Custom error handler function
 * @param {boolean} options.enableLogging - Enable error logging (default: true in development)
 * @returns {Object} - Error handling utilities
 */
const useApiErrorHandler = (options = {}) => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const errorHandlerRef = useRef(null);

  // Initialize error handler
  if (!errorHandlerRef.current) {
    errorHandlerRef.current = new ApiErrorHandler({
      enableLogging:
        options.enableLogging !== false &&
        process.env.NODE_ENV === 'development',
      onError: apiError => {
        setError(apiError);
        setIsRetrying(false);

        // Call custom error handler if provided
        if (options.onError) {
          options.onError(apiError);
        }
      },
    });
  }

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  /**
   * Handle an error manually
   */
  const handleError = useCallback((error, context = {}) => {
    return errorHandlerRef.current.handleError(error, context);
  }, []);

  /**
   * Retry a failed operation
   */
  const retry = useCallback(
    async retryFn => {
      if (!retryFn) {
        clearError();
        return;
      }

      setIsRetrying(true);
      try {
        const result = await retryFn();
        clearError();
        return result;
      } catch (retryError) {
        const apiError = handleError(retryError, { isRetry: true });
        throw apiError;
      }
    },
    [clearError, handleError]
  );

  /**
   * Wrap an API call with error handling
   */
  const wrapApiCall = useCallback((apiCall, context = {}) => {
    return errorHandlerRef.current.wrapApiCall(apiCall, context);
  }, []);

  /**
   * Wrap an API call with error handling and retry logic
   */
  const wrapApiCallWithRetry = useCallback((apiCall, context = {}) => {
    return errorHandlerRef.current.wrapApiCallWithRetry(apiCall, context);
  }, []);

  /**
   * Execute an API call with automatic retry logic
   */
  const withRetry = useCallback(async (apiCall, context = {}) => {
    setError(null);
    setIsRetrying(false);

    try {
      return await errorHandlerRef.current.withRetry(apiCall, context);
    } catch (apiError) {
      // Error is already handled by the error handler
      throw apiError;
    }
  }, []);

  /**
   * Get user-friendly error information for display
   */
  const getErrorInfo = useCallback(() => {
    if (!error) return null;

    return {
      title: error.title,
      message: error.message,
      suggestions: error.suggestions,
      retryable: error.retryable,
      type: error.type,
      timestamp: error.timestamp,
    };
  }, [error]);

  /**
   * Check if the current error is retryable
   */
  const canRetry = useCallback(() => {
    return error && error.retryable;
  }, [error]);

  /**
   * Get retry delay for the current error
   */
  const getRetryDelay = useCallback(
    (attemptNumber = 0) => {
      if (!error) return 0;
      return error.getRetryDelay(attemptNumber);
    },
    [error]
  );

  return {
    // State
    error,
    isRetrying,
    hasError: !!error,

    // Error information
    getErrorInfo,
    canRetry,
    getRetryDelay,

    // Actions
    clearError,
    handleError,
    retry,

    // API call wrappers
    wrapApiCall,
    wrapApiCallWithRetry,
    withRetry,

    // Direct access to error handler (for advanced use cases)
    errorHandler: errorHandlerRef.current,
  };
};

export default useApiErrorHandler;
