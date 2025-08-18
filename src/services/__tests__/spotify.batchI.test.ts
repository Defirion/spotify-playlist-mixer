/**
 * @jest-environment node
 */

import { ApiErrorHandler, ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

describe('ApiErrorHandler - Batch I (classification, retry config, wrappers)', () => {
  test('classifyError maps HTTP statuses to correct types', () => {
    const handler = new ApiErrorHandler({ enableLogging: false });

    const makeResp = (status: number) => ({
      name: 'AxiosError',
      message: `E${status}`,
      response: { status, statusText: 's', data: {} },
      config: {},
    } as any);

    expect(handler.classifyError(makeResp(401)).type).toBe(ERROR_TYPES.AUTHENTICATION);
    expect(handler.classifyError(makeResp(403)).type).toBe(ERROR_TYPES.AUTHORIZATION);
    expect(handler.classifyError(makeResp(404)).type).toBe(ERROR_TYPES.NOT_FOUND);
    expect(handler.classifyError(makeResp(400)).type).toBe(ERROR_TYPES.BAD_REQUEST);
    expect(handler.classifyError(makeResp(429)).type).toBe(ERROR_TYPES.RATE_LIMIT);
    expect(handler.classifyError(makeResp(500)).type).toBe(ERROR_TYPES.SERVER_ERROR);
    expect(handler.classifyError({ message: 'Network Error' } as any).type).toBe(ERROR_TYPES.NETWORK);
  });

  test('getRetryDelay exponential behavior and shouldRetry boundaries', () => {
    const handler = new ApiErrorHandler({ enableLogging: false });
    const err = handler.classifyError({ response: { status: 500 }, message: 'server' } as any);

    // Stub Math.random to remove jitter
    const orig = Math.random;
    // @ts-ignore
    Math.random = () => 0;

    try {
      const d0 = err.getRetryDelay(0);
      const d1 = err.getRetryDelay(1);
      expect(d1).toBeGreaterThanOrEqual(d0);
      expect(err.shouldRetry(0)).toBe(true);
      // For server error maxRetries = 2, so shouldRetry at attempt 2 should be false
      expect(err.shouldRetry(2)).toBe(false);
    } finally {
      Math.random = orig;
    }
  });

  test('wrapApiCall handles errors via handler and rethrows ApiError', async () => {
    const handler = new ApiErrorHandler({ enableLogging: false });
    const wrapped = handler.wrapApiCall(async () => {
      throw { name: 'Error', message: 'auth', response: { status: 401 } } as any;
    }, { context: 'x' });

    await expect(wrapped()).rejects.toBeInstanceOf(ApiError);
  });

  test('wrapApiCallWithRetry retries and eventually fails if non-retryable', async () => {
    const handler = new ApiErrorHandler({ enableLogging: false });

    // Function that always throws 400 (bad request) which is non-retryable
    const wrapped = handler.wrapApiCallWithRetry(async () => {
      throw { name: 'Error', message: 'bad', response: { status: 400 } } as any;
    });

    await expect(wrapped()).rejects.toBeInstanceOf(ApiError);
  });
});
