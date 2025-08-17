import {
  ApiError,
  ApiErrorHandler,
  ERROR_TYPES,
  defaultApiErrorHandler,
} from '../apiErrorHandler';

// Disable global/default handler logging for this test file so any tests that
// use the convenience functions (`handleApiError`, `withRetry`) don't emit
// console.error during passing runs. Individual tests can still assert on
// logging by mocking or re-enabling if needed.
(defaultApiErrorHandler as any).enableLogging = false;

describe('ApiError', () => {
  it('creates an error with correct properties', () => {
    const originalError = new Error('Original error') as any;
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
  let errorHandler: any;
  let mockOnError: any;

  beforeEach(() => {
    mockOnError = jest.fn();
    errorHandler = new ApiErrorHandler({
      onError: mockOnError,
      enableLogging: false,
    });
  });

  // Silence console.error for this suite to avoid clutter from default
  // error handler logging. Restored after each test.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('classifyError', () => {
    it('classifies network errors correctly', () => {
      const networkError = new Error('Network Error') as any;
      networkError.code = 'NETWORK_ERROR';

      const apiError = errorHandler.classifyError(networkError);

      expect(apiError.type).toBe(ERROR_TYPES.NETWORK);
      expect(apiError.retryable).toBe(true);
    });

    it('classifies HTTP status errors correctly', () => {
      const httpError = new Error('HTTP Error') as any;
      httpError.response = { status: 401, statusText: 'Unauthorized' };

      const apiError = errorHandler.classifyError(httpError);

      expect(apiError.type).toBe(ERROR_TYPES.AUTHENTICATION);
      expect(apiError.retryable).toBe(false);
    });

    it('classifies rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate Limited') as any;
      rateLimitError.response = {
        status: 429,
        statusText: 'Too Many Requests',
      };

      const apiError = errorHandler.classifyError(rateLimitError);

      expect(apiError.type).toBe(ERROR_TYPES.RATE_LIMIT);
      expect(apiError.retryable).toBe(true);
    });

    it('classifies timeout errors correctly', () => {
      const timeoutError = new Error('timeout of 5000ms exceeded') as any;
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
      const originalError = new Error('Test error') as any;
      originalError.response = { status: 500 };
    });
  });
});
