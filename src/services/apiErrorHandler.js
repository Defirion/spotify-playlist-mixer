/**
 * Centralized API Error Handling Service
 * Provides consistent error handling, user-friendly messages, and retry logic
 */

/**
 * Error types for different categories of API errors
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Retry configuration for different error types
 */
const RETRY_CONFIG = {
  [ERROR_TYPES.NETWORK]: { maxRetries: 3, baseDelay: 1000, exponential: true },
  [ERROR_TYPES.RATE_LIMIT]: {
    maxRetries: 3,
    baseDelay: 2000,
    exponential: true,
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    maxRetries: 2,
    baseDelay: 1500,
    exponential: true,
  },
  [ERROR_TYPES.TIMEOUT]: { maxRetries: 2, baseDelay: 1000, exponential: false },
  [ERROR_TYPES.AUTHENTICATION]: {
    maxRetries: 0,
    baseDelay: 0,
    exponential: false,
  },
  [ERROR_TYPES.AUTHORIZATION]: {
    maxRetries: 0,
    baseDelay: 0,
    exponential: false,
  },
  [ERROR_TYPES.NOT_FOUND]: { maxRetries: 0, baseDelay: 0, exponential: false },
  [ERROR_TYPES.BAD_REQUEST]: {
    maxRetries: 0,
    baseDelay: 0,
    exponential: false,
  },
  [ERROR_TYPES.UNKNOWN]: { maxRetries: 1, baseDelay: 1000, exponential: false },
};

/**
 * User-friendly error messages for different error types
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: '🌐 Network Error',
    message: "Unable to connect to Spotify's servers.",
    suggestions: [
      'Check your internet connection',
      'Try again in a few moments',
      "Spotify's API might be temporarily unavailable",
    ],
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    title: '🔑 Authentication Error',
    message: 'Your Spotify session has expired or is invalid.',
    suggestions: [
      'Try refreshing the page and logging in again',
      'Make sure you have a valid Spotify account',
      'Check if you need to re-authorize the app',
    ],
  },
  [ERROR_TYPES.AUTHORIZATION]: {
    title: '🚫 Access Denied',
    message: "You don't have permission to access this resource.",
    suggestions: [
      'Make sure the playlist is public or you have access to it',
      'Try making your playlist public temporarily',
      'Contact the playlist owner for access',
    ],
  },
  [ERROR_TYPES.RATE_LIMIT]: {
    title: '⏱️ Too Many Requests',
    message: "You're making requests too quickly.",
    suggestions: [
      'Wait a minute before trying again',
      'Try creating smaller playlists',
      'Spotify has temporary rate limits to prevent abuse',
    ],
  },
  [ERROR_TYPES.NOT_FOUND]: {
    title: '📋 Not Found',
    message: 'The requested resource could not be found.',
    suggestions: [
      'Check if the playlist URL is correct',
      'Make sure the playlist still exists',
      'Try copying the URL directly from Spotify',
    ],
  },
  [ERROR_TYPES.BAD_REQUEST]: {
    title: '⚠️ Invalid Request',
    message: 'The request contains invalid data.',
    suggestions: [
      'Check your input and try again',
      'Make sure all required fields are filled',
      'Try refreshing the page',
    ],
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    title: '🔧 Server Error',
    message: "Spotify's servers are experiencing issues.",
    suggestions: [
      'Try again in a few minutes',
      'Check Spotify status page for known issues',
      'The issue should resolve automatically',
    ],
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: '⏰ Request Timeout',
    message: 'The request took too long to complete.',
    suggestions: [
      'Try again with a smaller request',
      'Check your internet connection',
      'The server might be overloaded',
    ],
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: '❓ Unknown Error',
    message: 'An unexpected error occurred.',
    suggestions: [
      'Try refreshing the page',
      'Check your internet connection',
      'Try again in a few moments',
    ],
  },
};

/**
 * Enhanced API Error class with additional metadata
 */
export class ApiError extends Error {
  constructor(type, originalError, context = {}) {
    const errorInfo =
      ERROR_MESSAGES[type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    super(errorInfo.message);

    this.name = 'ApiError';
    this.type = type;
    this.title = errorInfo.title;
    this.suggestions = errorInfo.suggestions;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.retryable = RETRY_CONFIG[type].maxRetries > 0;

    // Preserve original error properties
    if (originalError) {
      this.status = originalError.response?.status || originalError.status;
      this.statusText =
        originalError.response?.statusText || originalError.statusText;
      this.data = originalError.response?.data || originalError.data;
    }
  }

  /**
   * Get retry configuration for this error type
   */
  getRetryConfig() {
    return RETRY_CONFIG[this.type];
  }

  /**
   * Check if this error should be retried
   */
  shouldRetry(attemptNumber = 0) {
    const config = this.getRetryConfig();
    return attemptNumber < config.maxRetries;
  }

  /**
   * Calculate delay for next retry attempt
   */
  getRetryDelay(attemptNumber = 0) {
    const config = this.getRetryConfig();
    if (!config.exponential) {
      return config.baseDelay;
    }

    const delay = config.baseDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Convert to a plain object for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      title: this.title,
      message: this.message,
      suggestions: this.suggestions,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      status: this.status,
      statusText: this.statusText,
    };
  }
}

/**
 * Centralized API Error Handler Service
 */
export class ApiErrorHandler {
  constructor(options = {}) {
    this.onError = options.onError || this.defaultErrorHandler;
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Default error handler that logs errors
   */
  defaultErrorHandler(error) {
    if (this.enableLogging) {
      console.error('API Error:', error.toJSON());
    }
  }

  /**
   * Classify an error based on its properties
   */
  classifyError(error, context = {}) {
    // Network/connection errors
    if (
      !error.response &&
      (error.code === 'NETWORK_ERROR' ||
        error.message.includes('Network Error'))
    ) {
      return new ApiError(ERROR_TYPES.NETWORK, error, context);
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new ApiError(ERROR_TYPES.TIMEOUT, error, context);
    }

    // HTTP status-based classification
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          return new ApiError(ERROR_TYPES.AUTHENTICATION, error, context);
        case 403:
          return new ApiError(ERROR_TYPES.AUTHORIZATION, error, context);
        case 404:
          return new ApiError(ERROR_TYPES.NOT_FOUND, error, context);
        case 400:
          return new ApiError(ERROR_TYPES.BAD_REQUEST, error, context);
        case 429:
          return new ApiError(ERROR_TYPES.RATE_LIMIT, error, context);
        case 500:
        case 502:
        case 503:
        case 504:
          return new ApiError(ERROR_TYPES.SERVER_ERROR, error, context);
        default:
          return new ApiError(ERROR_TYPES.UNKNOWN, error, context);
      }
    }

    return new ApiError(ERROR_TYPES.UNKNOWN, error, context);
  }

  /**
   * Handle an error with automatic classification and user notification
   */
  handleError(error, context = {}) {
    const apiError = this.classifyError(error, context);
    this.onError(apiError);
    return apiError;
  }

  /**
   * Retry wrapper with intelligent retry logic
   */
  async withRetry(apiCall, context = {}) {
    let lastError;
    let attemptNumber = 0;

    while (true) {
      try {
        return await apiCall();
      } catch (error) {
        const apiError = this.classifyError(error, {
          ...context,
          attemptNumber,
        });
        lastError = apiError;

        if (!apiError.shouldRetry(attemptNumber)) {
          this.handleError(apiError, context);
          throw apiError;
        }

        const delay = apiError.getRetryDelay(attemptNumber);

        if (this.enableLogging) {
          console.warn(
            `API call failed (attempt ${attemptNumber + 1}), retrying in ${Math.round(delay)}ms...`,
            { error: apiError.type, context }
          );
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        attemptNumber++;
      }
    }
  }

  /**
   * Create a wrapper function that automatically handles errors
   */
  wrapApiCall(apiCall, context = {}) {
    return async (...args) => {
      try {
        return await apiCall(...args);
      } catch (error) {
        const apiError = this.handleError(error, context);
        throw apiError;
      }
    };
  }

  /**
   * Create a wrapper function with retry logic
   */
  wrapApiCallWithRetry(apiCall, context = {}) {
    return async (...args) => {
      return this.withRetry(() => apiCall(...args), context);
    };
  }
}

/**
 * Default instance for global use
 */
export const defaultApiErrorHandler = new ApiErrorHandler();

/**
 * Convenience function for handling errors
 */
export const handleApiError = (error, context = {}) => {
  return defaultApiErrorHandler.handleError(error, context);
};

/**
 * Convenience function for retry logic
 */
export const withRetry = (apiCall, context = {}) => {
  return defaultApiErrorHandler.withRetry(apiCall, context);
};
