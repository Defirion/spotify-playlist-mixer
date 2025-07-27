import {
  ApiError,
  ApiErrorHandler,
  ERROR_TYPES,
  handleApiError,
  withRetry,
} from '../apiErrorHandler';

describe('ApiError', () => {
  it('creates an error with correct properties', () => {
    const originalError = new Error('Original error');
    originalError.response = { status: 404, statusText: 'Not Found' };

    const apiError = new ApiError(ERROR_TYPES.NOT_FOUND, originalError, {
      test: 'context',
    });

    expect(apiError.type).toBe(ERROR_TYPES.NOT_FOUND);
    expect(apiError.title).toBe('📋 Not Found');
    expect(apiError.message).toBe('The requested resource could not be found.');
    expect(apiError.suggestions).toHaveLength(3);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.context).toEqual({ test: 'context' });
    expect(apiError.status).toBe(404);
    expect(apiError.statusText).toBe('Not Found');
    expect(apiError.retryable).toBe(false);
  });

  it('calculates retry delay correctly', () => {
    const apiError = new ApiError(
      ERROR_TYPES.RATE_LIMIT,
      new Error('Rate limited')
    );

    const delay1 = apiError.getRetryDelay(0);
    const delay2 = apiError.getRetryDelay(1);

    expect(delay1).toBeGreaterThan(2000); // Base delay + jitter
    expect(delay2).toBeGreaterThan(delay1); // Exponential backoff
  });

  it('determines retry eligibility correctly', () => {
    const retryableError = new ApiError(
      ERROR_TYPES.NETWORK,
      new Error('Network error')
    );
    const nonRetryableError = new ApiError(
      ERROR_TYPES.AUTHENTICATION,
      new Error('Auth error')
    );

    expect(retryableError.shouldRetry(0)).toBe(true);
    expect(retryableError.shouldRetry(3)).toBe(false); // Exceeds max retries
    expect(nonRetryableError.shouldRetry(0)).toBe(false);
  });

  it('serializes to JSON correctly', () => {
    const apiError = new ApiError(
      ERROR_TYPES.SERVER_ERROR,
      new Error('Server error')
    );
    const json = apiError.toJSON();

    expect(json).toHaveProperty('name', 'ApiError');
    expect(json).toHaveProperty('type', ERROR_TYPES.SERVER_ERROR);
    expect(json).toHaveProperty('title');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('suggestions');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('retryable');
  });
});

describe('ApiErrorHandler', () => {
  let errorHandler;
  let mockOnError;

  beforeEach(() => {
    mockOnError = jest.fn();
    errorHandler = new ApiErrorHandler({
      onError: mockOnError,
      enableLogging: false,
    });
  });

  describe('classifyError', () => {
    it('classifies network errors correctly', () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      const apiError = errorHandler.classifyError(networkError);

      expect(apiError.type).toBe(ERROR_TYPES.NETWORK);
      expect(apiError.retryable).toBe(true);
    });

    it('classifies HTTP status errors correctly', () => {
      const httpError = new Error('HTTP Error');
      httpError.response = { status: 401, statusText: 'Unauthorized' };

      const apiError = errorHandler.classifyError(httpError);

      expect(apiError.type).toBe(ERROR_TYPES.AUTHENTICATION);
      expect(apiError.retryable).toBe(false);
    });

    it('classifies rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate Limited');
      rateLimitError.response = {
        status: 429,
        statusText: 'Too Many Requests',
      };

      const apiError = errorHandler.classifyError(rateLimitError);

      expect(apiError.type).toBe(ERROR_TYPES.RATE_LIMIT);
      expect(apiError.retryable).toBe(true);
    });

    it('classifies timeout errors correctly', () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';

      const apiError = errorHandler.classifyError(timeoutError);

      expect(apiError.type).toBe(ERROR_TYPES.TIMEOUT);
      expect(apiError.retryable).toBe(true);
    });

    it('falls back to unknown error type', () => {
      const unknownError = new Error('Unknown error');

      const apiError = errorHandler.classifyError(unknownError);

      expect(apiError.type).toBe(ERROR_TYPES.UNKNOWN);
    });
  });

  describe('handleError', () => {
    it('calls onError callback with classified error', () => {
      const originalError = new Error('Test error');
      originalError.response = { status: 500 };

      const apiError = errorHandler.handleError(originalError, {
        test: 'context',
      });

      expect(mockOnError).toHaveBeenCalledWith(apiError);
      expect(apiError.type).toBe(ERROR_TYPES.SERVER_ERROR);
      expect(apiError.context).toEqual({ test: 'context' });
    });
  });

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.withRetry(mockApiCall);

      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('retries on retryable errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      const mockApiCall = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn(fn => fn());

      try {
        const result = await errorHandler.withRetry(mockApiCall);

        expect(result).toBe('success');
        expect(mockApiCall).toHaveBeenCalledTimes(3);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('does not retry on non-retryable errors', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };

      const mockApiCall = jest.fn().mockRejectedValue(authError);

      await expect(errorHandler.withRetry(mockApiCall)).rejects.toThrow();
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalled();
    });

    it('stops retrying after max attempts', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      const mockApiCall = jest.fn().mockRejectedValue(networkError);

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn(fn => fn());

      try {
        await expect(errorHandler.withRetry(mockApiCall)).rejects.toThrow();
        expect(mockApiCall).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
        expect(mockOnError).toHaveBeenCalled();
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('wrapApiCall', () => {
    it('wraps successful API calls', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success');
      const wrappedCall = errorHandler.wrapApiCall(mockApiCall);

      const result = await wrappedCall('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('handles errors in wrapped API calls', async () => {
      const error = new Error('API Error');
      error.response = { status: 500 };

      const mockApiCall = jest.fn().mockRejectedValue(error);
      const wrappedCall = errorHandler.wrapApiCall(mockApiCall);

      await expect(wrappedCall()).rejects.toThrow();
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('wrapApiCallWithRetry', () => {
    it('wraps API calls with retry logic', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      const mockApiCall = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const wrappedCall = errorHandler.wrapApiCallWithRetry(mockApiCall);
      const result = await wrappedCall('arg1');

      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledTimes(2);
      expect(mockApiCall).toHaveBeenCalledWith('arg1');
    });
  });
});

describe('convenience functions', () => {
  it('handleApiError works correctly', () => {
    const error = new Error('Test error');
    error.response = { status: 404 };

    const apiError = handleApiError(error, { test: 'context' });

    expect(apiError).toBeInstanceOf(ApiError);
    expect(apiError.type).toBe(ERROR_TYPES.NOT_FOUND);
  });

  it('withRetry works correctly', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('success');

    const result = await withRetry(mockApiCall, { test: 'context' });

    expect(result).toBe('success');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });
});
