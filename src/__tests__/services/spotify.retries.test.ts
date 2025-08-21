import {
  ApiErrorHandler,
  ApiError,
  ERROR_TYPES,
} from '../../services/apiErrorHandler';

// These tests focus on retry & classification logic without incurring long real timeouts.
// We patch ApiError.prototype.getRetryDelay to return 0 so retries execute immediately.

describe('ApiErrorHandler retry & classification', () => {
  let delaySpy: jest.SpyInstance;
  beforeAll(() => {
    delaySpy = jest
      .spyOn(ApiError.prototype as any, 'getRetryDelay')
      .mockReturnValue(0);
  });
  afterAll(() => {
    delaySpy.mockRestore();
  });

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should retry on RATE_LIMIT (429) and succeed on third attempt', async () => {
    const handler = new ApiErrorHandler({ enableLogging: true });
    let attempt = 0;
    const result = await handler.withRetry(async () => {
      attempt++;
      if (attempt < 3) {
        const err: any = new Error('Too Many Requests');
        err.response = { status: 429 };
        throw err;
      }
      return 'success';
    });
    expect(result).toBe('success');
    expect(attempt).toBe(3);
  });

  it('should classify network-like errors and exhaust retries then throw ApiError(NETWORK)', async () => {
    const handler = new ApiErrorHandler({ enableLogging: false });
    let attempt = 0;
    await expect(
      handler.withRetry(async () => {
        attempt++;
        const netErr: any = new Error('Network Error');
        netErr.code = 'ECONNRESET'; // triggers NETWORK classification
        throw netErr;
      })
    ).rejects.toMatchObject({ type: ERROR_TYPES.NETWORK });
    // NETWORK maxRetries = 3 => attempts = 4 (0..3)
    expect(attempt).toBe(4);
  });
});
