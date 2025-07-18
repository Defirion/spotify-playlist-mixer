import { useState, useEffect, useCallback } from 'react';
import errorService from '../services/ErrorService';

export const useErrorHandler = () => {
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add error listener on mount
  useEffect(() => {
    const removeListener = errorService.addErrorListener((error) => {
      setErrors(prev => [error, ...prev.slice(0, 4)]); // Keep last 5 errors
    });

    return removeListener;
  }, []);

  // Handle errors with automatic retry
  const handleError = useCallback(async (error, context = {}) => {
    const errorId = errorService.logError(error, context);
    return errorId;
  }, []);

  // Retry operation with error handling
  const retryOperation = useCallback(async (operation, errorType = 'NETWORK', customStrategy = null) => {
    setIsLoading(true);
    try {
      const result = await errorService.retryOperation(operation, errorType, customStrategy);
      return result;
    } catch (error) {
      await handleError(error, { operation: operation.name });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error) => {
    return errorService.getUserFriendlyMessage(error);
  }, []);

  // Clear specific error
  const clearError = useCallback((errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Create and handle specific error types
  const createNetworkError = useCallback((message, status, statusText, details, context = {}) => {
    const error = errorService.createAndLogNetworkError(message, status, statusText, details, context);
    return error;
  }, []);

  const createAuthError = useCallback((message, reason, details, context = {}) => {
    const error = errorService.createAndLogAuthError(message, reason, details, context);
    return error;
  }, []);

  const createValidationError = useCallback((message, field, validationRules, details, context = {}) => {
    const error = errorService.createAndLogValidationError(message, field, validationRules, details, context);
    return error;
  }, []);

  const createAPIError = useCallback((message, endpoint, method, response, details, context = {}) => {
    const error = errorService.createAndLogAPIError(message, endpoint, method, response, details, context);
    return error;
  }, []);

  // Handle Spotify API errors specifically
  const handleSpotifyError = useCallback(async (error, endpoint, method) => {
    const spotifyError = await errorService.handleSpotifyAPIError(error, endpoint, method);
    return spotifyError;
  }, []);

  return {
    errors,
    isLoading,
    handleError,
    retryOperation,
    getUserFriendlyMessage,
    clearError,
    clearAllErrors,
    createNetworkError,
    createAuthError,
    createValidationError,
    createAPIError,
    handleSpotifyError
  };
};

export default useErrorHandler;