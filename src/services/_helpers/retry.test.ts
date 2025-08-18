import retryWithBackoff from './retry';

describe('retryWithBackoff', () => {
  test('succeeds without retry', async () => {
    const fn = jest.fn().mockResolvedValue(42);
    const p = retryWithBackoff(fn, {
      maxRetries: 2,
      baseMs: 1,
      getRetryAfter: () => null,
    });
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
    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        baseMs: 1,
        getRetryAfter: () => null,
      })
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('respects Retry-After when provided', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    });
    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        baseMs: 1,
        getRetryAfter: () => 0.001,
      })
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('deterministic backoff timing with recorded delays and fixed jitter', async () => {
    const randSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter => 0
    const origSetTimeout = global.setTimeout;
    const recorded: number[] = [];
    // Override setTimeout to record requested delay but execute callback immediately
    // so test remains fast and deterministic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).setTimeout = (cb: any, ms?: number, ...args: any[]) => {
      recorded.push(typeof ms === 'number' ? ms : 0);
      // execute callback asynchronously to mimic actual timer behavior
      return origSetTimeout(cb, 0, ...args);
    };

    try {
      let calls = 0;
      const fn = jest.fn().mockImplementation(() => {
        calls++;
        if (calls < 2) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      });

      // baseMs 100 => expected wait on first retry: 100ms + jitter(0)
      const p = retryWithBackoff(fn, {
        maxRetries: 2,
        baseMs: 100,
        getRetryAfter: () => null,
      });

      await expect(p).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(recorded.length).toBeGreaterThanOrEqual(1);
      expect(recorded[0]).toBe(100);
    } finally {
      randSpy.mockRestore();
      (global as any).setTimeout = origSetTimeout;
    }
  });
});
