import { useState, useCallback, useRef } from 'react';
import {
  ApiErrorHandler,
  ApiError,
  ERROR_TYPES,
} from '../services/apiErrorHandler';

// Hook options interface
export interface UseApiErrorHandlerOptions {
  onError?: (error: ApiError) => void;
  enableLogging?: boolean;
}

// Error information interface for display
export interface ErrorInfo {
  title: string;
  message: string;
  suggestions: string[];
  retryable: boolean;
  type: keyof typeof ERROR_TYPES;
  timestamp: string;
}

// Hook return type
export interface UseApiErrorHandlerReturn {
  // State
  error: ApiError | null;
  isRetrying: boolean;
  hasError: boolean;

  // Error information
  getErrorInfo: () => ErrorInfo | null;
  canRetry: () => boolean;
  getRetryDelay: (attemptNumber?: number) => number;

  // Actions
  clearError: () => void;
  handleError: (error: Error, context?: Record<string, any>) => ApiError;
  retry: <T>(retryFn?: () => Promise<T>) => Promise<T | void>;

  // API call wrappers
  wrapApiCall: <T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    context?: Record<string, any>
  ) => T;
  wrapApiCallWithRetry: <T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    context?: Record<string, any>
  ) => T;
  withRetry: <T>(
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ) => Promise<T>;

  // Direct access to error handler (for advanced use cases)
  errorHandler: ApiErrorHandler;
}

/**
 * React hook for handling API errors with user-friendly messages and retry logic
 */
const useApiErrorHandler = (
  options: UseApiErrorHandlerOptions = {}
): UseApiErrorHandlerReturn => {
  const [error, setError] = useState<ApiError | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const errorHandlerRef = useRef<ApiErrorHandler | null>(null);

  // Initialize error handler
  if (!errorHandlerRef.current) {
    errorHandlerRef.current = new ApiErrorHandler({
      enableLogging:
        options.enableLogging !== false &&
        process.env.NODE_ENV === 'development',
      onError: (apiError: ApiError) => {
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
  const clearError = useCallback((): void => {
    setError(null);
    setIsRetrying(false);
  }, []);

  /**
   * Handle an error manually
   */
  const handleError = useCallback(
    (error: Error, context: Record<string, any> = {}): ApiError => {
      return errorHandlerRef.current!.handleError(error, context);
    },
    []
  );

  /**
   * Retry a failed operation
   */
  const retry = useCallback(
    async <T>(retryFn?: () => Promise<T>): Promise<T | void> => {
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
        const apiError = handleError(retryError as Error, { isRetry: true });
        throw apiError;
      }
    },
    [clearError, handleError]
  );

  /**
   * Wrap an API call with error handling
   */
  const wrapApiCall = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      apiCall: T,
      context: Record<string, any> = {}
    ): T => {
      return errorHandlerRef.current!.wrapApiCall(apiCall, context) as T;
    },
    []
  );

  /**
   * Wrap an API call with error handling and retry logic
   */
  const wrapApiCallWithRetry = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      apiCall: T,
      context: Record<string, any> = {}
    ): T => {
      return errorHandlerRef.current!.wrapApiCallWithRetry(
        apiCall,
        context
      ) as T;
    },
    []
  );

  /**
   * Execute an API call with automatic retry logic
   */
  const withRetry = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      context: Record<string, any> = {}
    ): Promise<T> => {
      setError(null);
      setIsRetrying(false);

      try {
        return await errorHandlerRef.current!.withRetry(apiCall, context);
      } catch (apiError) {
        // Error is already handled by the error handler
        throw apiError;
      }
    },
    []
  );

  /**
   * Get user-friendly error information for display
   */
  const getErrorInfo = useCallback((): ErrorInfo | null => {
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
  const canRetry = useCallback((): boolean => {
    return error ? error.retryable : false;
  }, [error]);

  /**
   * Get retry delay for the current error
   */
  const getRetryDelay = useCallback(
    (attemptNumber: number = 0): number => {
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
    errorHandler: errorHandlerRef.current!,
  };
};

export default useApiErrorHandler;
