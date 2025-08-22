import { ApiError, ApiErrorHandler, ERROR_TYPES } from './apiErrorHandler';

describe('ApiErrorHandler & ApiError', () => {
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
  });

  it('maps HTTP status codes to types', () => {
    const h = new ApiErrorHandler({ enableLogging: false });
    const notFound = { response: { status: 404 }, message: 'not found' } as any;
    expect(h.classifyError(notFound).type).toBe(ERROR_TYPES.NOT_FOUND);

    const auth = { response: { status: 401 }, message: 'auth' } as any;
    expect(h.classifyError(auth).type).toBe(ERROR_TYPES.AUTHENTICATION);

    const server = { response: { status: 503 }, message: 'srv' } as any;
    expect(h.classifyError(server).type).toBe(ERROR_TYPES.SERVER_ERROR);
  });

  it('ApiError exposes retry config and toJSON', () => {
    const err = new ApiError(ERROR_TYPES.RATE_LIMIT, new Error('too many'));
    expect(err.retryable).toBe(true);
    const cfg = err.getRetryConfig();
    expect(cfg.maxRetries).toBeGreaterThanOrEqual(1);
    const json = err.toJSON();
    expect(json.type).toBe(ERROR_TYPES.RATE_LIMIT);
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
});
