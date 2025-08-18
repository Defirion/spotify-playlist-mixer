import retryWithBackoff from './retry';

describe('retryWithBackoff', () => {
  test('succeeds without retry', async () => {
    const fn = jest.fn().mockResolvedValue(42);
    const p = retryWithBackoff(fn, { maxRetries: 2, baseMs: 1, getRetryAfter: () => null });
    await expect(p).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries and then succeeds', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    });
    await expect(retryWithBackoff(fn, { maxRetries: 3, baseMs: 1, getRetryAfter: () => null })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('respects Retry-After when provided', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    });
    await expect(retryWithBackoff(fn, { maxRetries: 3, baseMs: 1, getRetryAfter: () => 0.001 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
