import { 
  createNetworkError, 
  createAuthError, 
  createValidationError, 
  createAPIError, 
  createAppError,
  isNetworkError,
  isAuthError,
  isValidationError,
  isAPIError
} from '../types/errors';

class ErrorService {
  constructor() {
    this.errorListeners = [];
    this.retryStrategies = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 100;
    
    // Setup default retry strategies
    this.setupDefaultRetryStrategies();
  }

  // Error logging and reporting
  logError(error, context = {}) {
    const errorEntry = {
      ...error,
      context,
      id: this.generateErrorId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date()
    };

    // Add to history
    this.addToHistory(errorEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${error.type}]: ${error.message}`);
      console.error('Error details:', errorEntry);
      console.groupEnd();
    }

    // Notify listeners
    this.notifyListeners(errorEntry);

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorEntry);
    }

    return errorEntry.id;
  }

  // Error categorization and user-friendly messages
  getUserFriendlyMessage(error) {
    if (isNetworkError(error)) {
      if (error.status === 0) {
        return 'Unable to connect to the internet. Please check your connection and try again.';
      }
      if (error.status >= 500) {
        return 'Server is temporarily unavailable. Please try again in a few moments.';
      }
      if (error.status === 429) {
        return 'Too many requests. Please wait a moment before trying again.';
      }
      if (error.status >= 400) {
        return 'There was a problem with your request. Please try again.';
      }
      return 'Network error occurred. Please check your connection.';
    }

    if (isAuthError(error)) {
      switch (error.reason) {
        case 'TOKEN_EXPIRED':
          return 'Your session has expired. Please log in again.';
        case 'INVALID_TOKEN':
          return 'Authentication failed. Please log in again.';
        case 'UNAUTHORIZED':
          return 'You don\'t have permission to access this resource.';
        case 'LOGIN_FAILED':
          return 'Login failed. Please try again.';
        default:
          return 'Authentication error. Please log in again.';
      }
    }

    if (isValidationError(error)) {
      if (error.field) {
        return `Invalid ${error.field}: ${error.message}`;
      }
      return `Validation error: ${error.message}`;
    }

    if (isAPIError(error)) {
      return 'Unable to connect to Spotify. Please try again.';
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  // Error recovery strategies
  setupDefaultRetryStrategies() {
    // Network errors - exponential backoff
    this.retryStrategies.set('NETWORK', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      shouldRetry: (error, attempt) => {
        if (isNetworkError(error)) {
          // Don't retry client errors (4xx)
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            return false;
          }
          return attempt < 3;
        }
        return false;
      }
    });

    // Auth errors - single retry after token refresh
    this.retryStrategies.set('AUTH', {
      maxRetries: 1,
      baseDelay: 500,
      shouldRetry: (error, attempt) => {
        return isAuthError(error) && error.reason === 'TOKEN_EXPIRED' && attempt < 1;
      }
    });

    // API errors - limited retry
    this.retryStrategies.set('API', {
      maxRetries: 2,
      baseDelay: 2000,
      shouldRetry: (error, attempt) => {
        return isAPIError(error) && attempt < 2;
      }
    });
  }

  // Retry mechanism with exponential backoff
  async retryOperation(operation, errorType = 'NETWORK', customStrategy = null) {
    const strategy = customStrategy || this.retryStrategies.get(errorType);
    if (!strategy) {
      throw new Error(`No retry strategy found for error type: ${errorType}`);
    }

    let lastError;
    let attempt = 0;

    while (attempt <= strategy.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (!strategy.shouldRetry(error, attempt)) {
          break;
        }

        attempt++;
        
        if (attempt <= strategy.maxRetries) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            strategy.baseDelay * Math.pow(strategy.backoffFactor || 1, attempt - 1),
            strategy.maxDelay || strategy.baseDelay * 10
          );
          
          // Add jitter to prevent thundering herd
          const jitteredDelay = delay + Math.random() * 1000;
          
          console.log(`Retrying operation in ${Math.round(jitteredDelay)}ms (attempt ${attempt}/${strategy.maxRetries})`);
          await this.delay(jitteredDelay);
        }
      }
    }

    // All retries failed, log and throw the last error
    this.logError(lastError, { 
      operation: operation.name || 'anonymous',
      attempts: attempt,
      strategy: errorType
    });
    
    throw lastError;
  }

  // Error factory methods with automatic logging
  createAndLogNetworkError(message, status, statusText, details, context = {}) {
    const error = createNetworkError(message, status, statusText, details);
    this.logError(error, context);
    return error;
  }

  createAndLogAuthError(message, reason, details, context = {}) {
    const error = createAuthError(message, reason, details);
    this.logError(error, context);
    return error;
  }

  createAndLogValidationError(message, field, validationRules, details, context = {}) {
    const error = createValidationError(message, field, validationRules, details);
    this.logError(error, context);
    return error;
  }

  createAndLogAPIError(message, endpoint, method, response, details, context = {}) {
    const error = createAPIError(message, endpoint, method, response, details);
    this.logError(error, context);
    return error;
  }

  createAndLogAppError(type, message, details, code, context = {}) {
    const error = createAppError(type, message, details, code);
    this.logError(error, context);
    return error;
  }

  // Error listeners for UI components
  addErrorListener(listener) {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  notifyListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  // Error history management
  addToHistory(error) {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  getErrorHistory() {
    return [...this.errorHistory];
  }

  clearErrorHistory() {
    this.errorHistory = [];
  }

  // Utility methods
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // External logging service integration
  async sendToLoggingService(error) {
    try {
      // In a real app, this would send to services like Sentry, LogRocket, etc.
      // For now, we'll just simulate the call
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          error_type: error.type
        });
      }
    } catch (err) {
      console.error('Failed to send error to logging service:', err);
    }
  }

  // Error recovery helpers
  async handleSpotifyAPIError(error, endpoint, method) {
    if (error.response?.status === 401) {
      return this.createAndLogAuthError(
        'Spotify authentication failed',
        'UNAUTHORIZED',
        error.response.data,
        { endpoint, method }
      );
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return this.createAndLogNetworkError(
        'Rate limited by Spotify API',
        429,
        'Too Many Requests',
        { retryAfter },
        { endpoint, method }
      );
    }

    if (error.response?.status >= 500) {
      return this.createAndLogNetworkError(
        'Spotify server error',
        error.response.status,
        error.response.statusText,
        error.response.data,
        { endpoint, method }
      );
    }

    return this.createAndLogAPIError(
      error.message || 'Spotify API error',
      endpoint,
      method,
      error.response?.data,
      error,
      { endpoint, method }
    );
  }

  // Debugging helpers
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      recent: this.errorHistory.slice(0, 10)
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

// Export the class and create singleton instance
export { ErrorService };

// Create singleton instance
const errorService = new ErrorService();

export default errorService;