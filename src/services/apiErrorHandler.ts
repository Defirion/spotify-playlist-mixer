/**
 * Centralized API Error Handling Service
 * Provides consistent error handling, user-friendly messages, and retry logic
 */

import { AxiosError } from 'axios';

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
} as const;

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

/**
 * Retry configuration interface
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  exponential: boolean;
}

/**
 * Error message interface
 */
interface ErrorMessage {
  title: string;
  message: string;
  suggestions: string[];
}

/**
 * Error context interface
 */
interface ErrorContext {
  [key: string]: any;
  attemptNumber?: number;
}

/**
 * API call function type
 */
type ApiCallFunction<T = any> = (...args: any[]) => Promise<T>;

/**
 * Error handler function type
 */
type ErrorHandlerFunction = (error: ApiError) => void;

/**
 * API Error Handler options
 */
interface ApiErrorHandlerOptions {
  onError?: ErrorHandlerFunction;
  enableLogging?: boolean;
}

/**
 * Retry configuration for different error types
 */
const RETRY_CONFIG: Record<ErrorType, RetryConfig> = {
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
const ERROR_MESSAGES: Record<ErrorType, ErrorMessage> = {
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
  public readonly name = 'ApiError';
  public readonly type: ErrorType;
  public readonly title: string;
  public readonly suggestions: string[];
  public readonly originalError: Error | AxiosError;
  public readonly context: ErrorContext;
  public readonly timestamp: string;
  public readonly retryable: boolean;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly data?: any;

  constructor(
    type: ErrorType,
    originalError: Error | AxiosError,
    context: ErrorContext = {}
  ) {
    const errorInfo =
      ERROR_MESSAGES[type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    super(errorInfo.message);

    this.type = type;
    this.title = errorInfo.title;
    this.suggestions = errorInfo.suggestions;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.retryable = RETRY_CONFIG[type].maxRetries > 0;

    // Preserve original error properties
    if (this.isAxiosError(originalError)) {
      this.status = originalError.response?.status;
      this.statusText = originalError.response?.statusText;
      this.data = originalError.response?.data;
    } else if ('status' in originalError) {
      this.status = (originalError as any).status;
      this.statusText = (originalError as any).statusText;
      this.data = (originalError as any).data;
    }
  }

  private isAxiosError(error: Error | AxiosError): error is AxiosError {
    return 'response' in error && 'config' in error;
  }

  /**
   * Get retry configuration for this error type
   */
  getRetryConfig(): RetryConfig {
    return RETRY_CONFIG[this.type];
  }

  /**
   * Check if this error should be retried
   */
  shouldRetry(attemptNumber: number = 0): boolean {
    const config = this.getRetryConfig();
    return attemptNumber < config.maxRetries;
  }

  /**
   * Calculate delay for next retry attempt
   */
  getRetryDelay(attemptNumber: number = 0): number {
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
  toJSON(): Record<string, any> {
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
  private onError: ErrorHandlerFunction;
  private enableLogging: boolean;

  constructor(options: ApiErrorHandlerOptions = {}) {
    this.onError = options.onError || this.defaultErrorHandler;
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Default error handler that logs errors
   */
  private defaultErrorHandler = (error: ApiError): void => {
    if (this.enableLogging) {
      console.error('API Error:', error.toJSON());
    }
  };

  /**
   * Classify an error based on its properties
   */
  classifyError(
    error: Error | AxiosError,
    context: ErrorContext = {}
  ): ApiError {
    // Network/connection errors
    if (
      !('response' in error) &&
      (('code' in error && error.code === 'NETWORK_ERROR') ||
        error.message.includes('Network Error'))
    ) {
      return new ApiError(ERROR_TYPES.NETWORK, error, context);
    }

    // Timeout errors
    if (
      ('code' in error && error.code === 'ECONNABORTED') ||
      error.message.includes('timeout')
    ) {
      return new ApiError(ERROR_TYPES.TIMEOUT, error, context);
    }

    // HTTP status-based classification
    if ('response' in error && error.response) {
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
  handleError(error: Error | AxiosError, context: ErrorContext = {}): ApiError {
    const apiError = this.classifyError(error, context);
    this.onError(apiError);
    return apiError;
  }

  /**
   * Retry wrapper with intelligent retry logic
   */
  async withRetry<T>(
    apiCall: ApiCallFunction<T>,
    context: ErrorContext = {}
  ): Promise<T> {
    let attemptNumber = 0;

    while (true) {
      try {
        return await apiCall();
      } catch (error) {
        const apiError = this.classifyError(error as Error | AxiosError, {
          ...context,
          attemptNumber,
        });

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
  wrapApiCall<T>(
    apiCall: ApiCallFunction<T>,
    context: ErrorContext = {}
  ): ApiCallFunction<T> {
    return async (...args: any[]): Promise<T> => {
      try {
        return await apiCall(...args);
      } catch (error) {
        const apiError = this.handleError(error as Error | AxiosError, context);
        throw apiError;
      }
    };
  }

  /**
   * Create a wrapper function with retry logic
   */
  wrapApiCallWithRetry<T>(
    apiCall: ApiCallFunction<T>,
    context: ErrorContext = {}
  ): ApiCallFunction<T> {
    return async (...args: any[]): Promise<T> => {
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
export const handleApiError = (
  error: Error | AxiosError,
  context: ErrorContext = {}
): ApiError => {
  return defaultApiErrorHandler.handleError(error, context);
};

/**
 * Convenience function for retry logic
 */
export const withRetry = <T>(
  apiCall: ApiCallFunction<T>,
  context: ErrorContext = {}
): Promise<T> => {
  return defaultApiErrorHandler.withRetry(apiCall, context);
};
