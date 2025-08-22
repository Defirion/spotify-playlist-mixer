import { ApiError, ApiErrorHandler, ERROR_TYPES } from './apiErrorHandler';

describe('ApiErrorHandler & ApiError', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('classifies network-like errors and timeout', () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    const netErr: any = { code: 'ENOTFOUND', message: 'getaddr' };
    const ae = h.classifyError(netErr);
    expect(ae.type).toBe(ERROR_TYPES.NETWORK);

    const timeoutErr: any = {
      code: 'ECONNABORTED',
      message: 'timeout of 0ms exceeded',
    };
    const ae2 = h.classifyError(timeoutErr);
    expect(ae2.type).toBe(ERROR_TYPES.TIMEOUT);

    // Test Network Error message classification
    const networkMsgErr: any = { message: 'Network Error' };
    const ae3 = h.classifyError(networkMsgErr);
    expect(ae3.type).toBe(ERROR_TYPES.NETWORK);

    // Test timeout message classification
    const timeoutMsgErr: any = { message: 'timeout exceeded' };
    const ae4 = h.classifyError(timeoutMsgErr);
    expect(ae4.type).toBe(ERROR_TYPES.TIMEOUT);

    // Test request property without response (network-like)
    const requestErr: any = { request: {}, code: 'ECONN' };
    const ae5 = h.classifyError(requestErr);
    expect(ae5.type).toBe(ERROR_TYPES.NETWORK);
  });

  it('maps HTTP status codes to types', () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    const notFound = { response: { status: 404 }, message: 'not found' } as any;
    expect(h.classifyError(notFound).type).toBe(ERROR_TYPES.NOT_FOUND);

    const auth = { response: { status: 401 }, message: 'auth' } as any;
    expect(h.classifyError(auth).type).toBe(ERROR_TYPES.AUTHENTICATION);

    const server = { response: { status: 503 }, message: 'srv' } as any;
    expect(h.classifyError(server).type).toBe(ERROR_TYPES.SERVER_ERROR);

    // Test additional HTTP status codes for branch coverage
    const forbidden = {
      response: { status: 403 },
      message: 'forbidden',
    } as any;
    expect(h.classifyError(forbidden).type).toBe(ERROR_TYPES.AUTHORIZATION);

    const badRequest = { response: { status: 400 }, message: 'bad' } as any;
    expect(h.classifyError(badRequest).type).toBe(ERROR_TYPES.BAD_REQUEST);

    const rateLimit = { response: { status: 429 }, message: 'rate' } as any;
    expect(h.classifyError(rateLimit).type).toBe(ERROR_TYPES.RATE_LIMIT);

    const serverError500 = {
      response: { status: 500 },
      message: 'internal',
    } as any;
    expect(h.classifyError(serverError500).type).toBe(ERROR_TYPES.SERVER_ERROR);

    const serverError502 = {
      response: { status: 502 },
      message: 'bad gateway',
    } as any;
    expect(h.classifyError(serverError502).type).toBe(ERROR_TYPES.SERVER_ERROR);

    const serverError504 = {
      response: { status: 504 },
      message: 'gateway error',
    } as any;
    expect(h.classifyError(serverError504).type).toBe(ERROR_TYPES.SERVER_ERROR);

    // Test unknown status code fallback
    const unknown = { response: { status: 418 }, message: 'teapot' } as any;
    expect(h.classifyError(unknown).type).toBe(ERROR_TYPES.UNKNOWN);
  });

  it('ApiError exposes retry config and toJSON', () => {
    const err = new ApiError(ERROR_TYPES.RATE_LIMIT, new Error('too many'));
    expect(err.retryable).toBe(true);
    const cfg = err.getRetryConfig();
    expect(cfg.maxRetries).toBeGreaterThanOrEqual(1);
    const json = err.toJSON();
    expect(json.type).toBe(ERROR_TYPES.RATE_LIMIT);

    // Test non-retryable error
    const nonRetryable = new ApiError(
      ERROR_TYPES.AUTHENTICATION,
      new Error('auth')
    );
    expect(nonRetryable.retryable).toBe(false);
    expect(nonRetryable.shouldRetry(0)).toBe(false);

    // Test retry eligibility with attempt counts
    expect(err.shouldRetry(0)).toBe(true);
    expect(err.shouldRetry(5)).toBe(false); // exceeds maxRetries

    // Test retry delay calculation
    const delay1 = err.getRetryDelay(0);
    const delay2 = err.getRetryDelay(1);
    expect(delay1).toBeGreaterThan(0);
    expect(delay2).toBeGreaterThanOrEqual(delay1); // exponential backoff

    // Test non-exponential retry (TIMEOUT)
    const timeoutErr = new ApiError(ERROR_TYPES.TIMEOUT, new Error('timeout'));
    const timeoutDelay1 = timeoutErr.getRetryDelay(0);
    const timeoutDelay2 = timeoutErr.getRetryDelay(1);
    expect(timeoutDelay1).toBe(timeoutDelay2); // should be same (non-exponential)

    // Test ApiError with AxiosError-like shape
    const axiosErr: any = {
      response: {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'missing' },
      },
      config: { url: '/test' },
    };
    const apiErr = new ApiError(ERROR_TYPES.NOT_FOUND, axiosErr, {
      context: 'test',
    });
    expect(apiErr.status).toBe(404);
    expect(apiErr.statusText).toBe('Not Found');
    expect(apiErr.data).toEqual({ error: 'missing' });
    expect(apiErr.context).toEqual({ context: 'test' });

    // Test error without response property but with status directly
    const directStatusErr: any = {
      status: 500,
      statusText: 'Error',
      data: 'failed',
    };
    const directApiErr = new ApiError(
      ERROR_TYPES.SERVER_ERROR,
      directStatusErr
    );
    expect(directApiErr.status).toBe(500);
    expect(directApiErr.statusText).toBe('Error');
    expect(directApiErr.data).toBe('failed');
  });

  it('withRetry retries and eventually returns successful result', async () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    let calls = 0;
    const apiCall = async () => {
      calls++;
      if (calls < 2) {
        const e: any = { response: { status: 500 }, message: 'server' };
        throw e;
      }
      return 'ok';
    };

    // speed up delays by stubbing getRetryDelay to 0
    jest.spyOn(ApiError.prototype, 'getRetryDelay').mockReturnValue(0 as any);

    const res = await h.withRetry(apiCall);
    expect(res).toBe('ok');
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('withRetry stops retrying when max attempts reached', async () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    let calls = 0;
    const apiCall = async () => {
      calls++;
      const e: any = { response: { status: 500 }, message: 'always fails' };
      throw e;
    };

    jest.spyOn(ApiError.prototype, 'getRetryDelay').mockReturnValue(0 as any);

    await expect(h.withRetry(apiCall)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBeGreaterThan(1); // should have retried
  });

  it('withRetry does not retry non-retryable errors', async () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    let calls = 0;
    const apiCall = async () => {
      calls++;
      const e: any = { response: { status: 400 }, message: 'bad request' };
      throw e;
    };

    await expect(h.withRetry(apiCall)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1); // should not have retried
  });

  it('wrapApiCall turns thrown errors into ApiError', async () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    const bad = async () => {
      const e: any = new Error('bad request');
      e.response = { status: 400 };
      throw e;
    };
    const wrapped = h.wrapApiCall(bad);
    await expect(wrapped()).rejects.toHaveProperty(
      'type',
      ERROR_TYPES.BAD_REQUEST
    );
  });

  it('wrapApiCallWithRetry combines wrapping and retry logic', async () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 2) {
        const e: any = new Error('server error');
        e.response = { status: 500 };
        throw e;
      }
      return 'success';
    };

    jest.spyOn(ApiError.prototype, 'getRetryDelay').mockReturnValue(0 as any);

    const wrapped = h.wrapApiCallWithRetry(flaky);
    const result = await wrapped();
    expect(result).toBe('success');
    expect(calls).toBe(2);
  });

  it('handleError calls onError callback and returns ApiError', () => {
    const mockOnError = jest.fn();
    const h = new ApiErrorHandler({
      onError: mockOnError,
      enableLogging: false,
    });

    const originalError = new Error('test') as any;
    originalError.response = { status: 404 };

    const result = h.handleError(originalError);

    expect(mockOnError).toHaveBeenCalledWith(result);
    expect(result).toBeInstanceOf(ApiError);
    expect(result.type).toBe(ERROR_TYPES.NOT_FOUND);
  });

  it('classifies errors without message property safely', () => {
    const h = new ApiErrorHandler({ enableLogging: false });

    // Test error object without message property
    const noMessage: any = { code: 'ECONNREFUSED' };
    const classified = h.classifyError(noMessage);
    expect(classified.type).toBe(ERROR_TYPES.NETWORK);

    // Test with null/undefined message
    const nullMessage: any = { message: null, response: { status: 500 } };
    const classified2 = h.classifyError(nullMessage);
    expect(classified2.type).toBe(ERROR_TYPES.SERVER_ERROR);
  });

  it('logs network messages with deduplication', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const h = new ApiErrorHandler({ enableLogging: true });

    const networkErr1: any = {
      code: 'ECONNREFUSED',
      message: 'connection refused',
    };
    const networkErr2: any = {
      code: 'ECONNREFUSED',
      message: 'connection refused',
    };
    const networkErr3: any = { code: 'ENOTFOUND', message: 'host not found' };

    // First occurrence should log
    h.classifyError(networkErr1);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockClear();

    // Same message should not log again (deduplication)
    h.classifyError(networkErr2);
    expect(consoleSpy).not.toHaveBeenCalled();

    // Different message should log
    h.classifyError(networkErr3);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('uses default error handler when none provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const h = new ApiErrorHandler({ enableLogging: true });

    const err: any = { response: { status: 500 } };
    h.handleError(err);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles non-response error properties gracefully', () => {
    // Test error with response-like shape but not axios error
    const mockErr: any = {
      response: { status: 403, statusText: 'Forbidden', data: 'access denied' },
    };
    const apiErr = new ApiError(ERROR_TYPES.AUTHORIZATION, mockErr);
    expect(apiErr.status).toBe(403);
    expect(apiErr.statusText).toBe('Forbidden');
    expect(apiErr.data).toBe('access denied');
  });
});
