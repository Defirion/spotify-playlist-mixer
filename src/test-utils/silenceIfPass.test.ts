import { silenceIfPass } from './silenceIfPass';

describe('silenceIfPass', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('success with non-mock console: swallows calls and restores original', async () => {
    const originalLog = console.log;
    let originalCalled = 0;
    (console as any).log = (..._args: any[]) => {
      originalCalled++;
    };

    try {
      const res = await silenceIfPass(() => {
        console.log('this should be captured');
        return 'ok';
      });
      expect(res).toBe('ok');
      // original console should not have been called while fn succeeded
      expect(originalCalled).toBe(0);
    } finally {
      console.log = originalLog;
    }
  });

  test('failure with non-mock console: replays captured logs to original on throw', async () => {
    const originalLog = console.log;
    let originalCalled = 0;
    (console as any).log = (..._args: any[]) => {
      originalCalled++;
    };

    try {
      await expect(
        silenceIfPass(() => {
          console.log('will be replayed');
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      // after failure the captured logs should have been replayed to original
      expect(originalCalled).toBeGreaterThanOrEqual(1);
    } finally {
      console.log = originalLog;
    }
  });

  test('preserves jest mock identity and replays mock.calls on failure', async () => {
    const mockLog = jest.fn();
    const orig = console.log;
    (console as any).log = mockLog;

    try {
      await expect(
        silenceIfPass(() => {
          console.log('from mock');
          throw new Error('fail-mock');
        })
      ).rejects.toThrow('fail-mock');

      // Ensure mock recorded calls
      expect(Array.isArray(mockLog.mock.calls)).toBe(true);
      expect(mockLog.mock.calls.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.log = orig;
    }
  });

  test('works correctly with async function that resolves', async () => {
    const originalWarn = console.warn;
    let called = 0;
    (console as any).warn = (..._args: any[]) => {
      called++;
    };

    try {
      const res = await silenceIfPass(async () => {
        console.warn('async warn');
        return 123;
      });
      expect(res).toBe(123);
      expect(called).toBe(0);
    } finally {
      console.warn = originalWarn;
    }
  });

  test('failure replays all replaced console methods (error,warn,info,log)', async () => {
    const originals = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log,
    };
    const counts: Record<string, number> = {
      error: 0,
      warn: 0,
      info: 0,
      log: 0,
    };
    (console as any).error = (..._args: any[]) => {
      counts.error++;
    };
    (console as any).warn = (..._args: any[]) => {
      counts.warn++;
    };
    (console as any).info = (..._args: any[]) => {
      counts.info++;
    };
    (console as any).log = (..._args: any[]) => {
      counts.log++;
    };

    try {
      await expect(
        silenceIfPass(() => {
          console.error('e');
          console.warn('w');
          console.info('i');
          console.log('l');
          throw new Error('replay-all');
        })
      ).rejects.toThrow('replay-all');

      // each original should have been called when replayed
      expect(counts.error).toBeGreaterThanOrEqual(1);
      expect(counts.warn).toBeGreaterThanOrEqual(1);
      expect(counts.info).toBeGreaterThanOrEqual(1);
      expect(counts.log).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = originals.error;
      console.warn = originals.warn;
      console.info = originals.info;
      console.log = originals.log;
    }
  });

  test('failure replays mock.calls for multiple mocked console methods', async () => {
    const mockError = jest.fn();
    const mockWarn = jest.fn();
    const mockInfo = jest.fn();
    const mockLog = jest.fn();

    const origs = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log,
    };

    (console as any).error = mockError;
    (console as any).warn = mockWarn;
    (console as any).info = mockInfo;
    (console as any).log = mockLog;

    try {
      await expect(
        silenceIfPass(() => {
          console.error('me');
          console.warn('you');
          console.info('them');
          console.log('all');
          throw new Error('mock-replay');
        })
      ).rejects.toThrow('mock-replay');

      // mocks should have recorded original calls
      expect(mockError.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockWarn.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockInfo.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockLog.mock.calls.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = origs.error;
      console.warn = origs.warn;
      console.info = origs.info;
      console.log = origs.log;
    }
  });

  test('mixed mocked and replaced console methods replay correctly', async () => {
    const orig = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log,
    };

    const counts: Record<string, number> = {
      error: 0,
      warn: 0,
      info: 0,
      log: 0,
    };
    // make error/warn normal functions (will be replaced into buffer)
    (console as any).error = (..._args: any[]) => {
      counts.error++;
    };
    (console as any).warn = (..._args: any[]) => {
      counts.warn++;
    };
    // make info/log jest mocks (should be recorded in mockCaptures)
    const mockInfo = jest.fn();
    const mockLog = jest.fn();
    (console as any).info = mockInfo;
    (console as any).log = mockLog;

    try {
      await expect(
        silenceIfPass(() => {
          console.error('e');
          console.warn('w');
          console.info('i');
          console.log('l');
          throw new Error('mixed');
        })
      ).rejects.toThrow('mixed');

      // replaced functions should have been replayed to original
      expect(counts.error).toBeGreaterThanOrEqual(1);
      expect(counts.warn).toBeGreaterThanOrEqual(1);
      // mocks should have recorded calls
      expect(mockInfo.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockLog.mock.calls.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = orig.error;
      console.warn = orig.warn;
      console.info = orig.info;
      console.log = orig.log;
    }
  });

  test('replays fake jest-like mock.calls on failure when global.jest identifies mock', async () => {
    const orig = { log: console.log };
    const calls: unknown[] = [];
    // spy the original console.log to capture replayed args
    (console as any).log = (...args: unknown[]) => calls.push(args);

    // backup any existing global.jest
    const originalGlobalJest = (global as any).jest;
    try {
      // make global.jest delegate to real jest.isMockFunction so jest.fn() is detected
      (global as any).jest = { isMockFunction: jest.isMockFunction };

      // create a real jest mock function that also pushes to our spy when invoked
      const fakeMock = jest.fn((...args: unknown[]) => calls.push(args));
      // Pre-populate mock.calls so silenceIfPass will replay them
      fakeMock.mock.calls = [['replayed', 'value']];
      (console as any).log = fakeMock;

      await expect(
        silenceIfPass(() => {
          throw new Error('fake-mock-failure');
        })
      ).rejects.toThrow('fake-mock-failure');

      // original console.log should have been called with the fake mock's recorded calls
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0]).toEqual(['replayed', 'value']);
    } finally {
      // restore
      (console as any).log = orig.log;
      (global as any).jest = originalGlobalJest;
    }
  });

  test('does not throw when mock.mock.calls is not an array', async () => {
    const orig = { log: console.log };
    const calls: unknown[] = [];
    (console as any).log = (...args: unknown[]) => calls.push(args);

    const originalGlobalJest = (global as any).jest;
    try {
      // use a custom global.jest detector so we can safely use a plain object with mock.calls = null
      (global as any).jest = {
        isMockFunction: (fn: any) => !!(fn && fn.__isFakeMock),
      };

      // fake mock with mock.calls not an array — plain object to avoid jest internals
      const fakeMock = { __isFakeMock: true, mock: { calls: null } } as any;
      (console as any).log = fakeMock;

      await expect(
        silenceIfPass(() => {
          throw new Error('non-array-calls');
        })
      ).rejects.toThrow('non-array-calls');

      // nothing should have been pushed to the original console via mock calls
      expect(calls.length).toBe(0);
    } finally {
      (console as any).log = orig.log;
      (global as any).jest = originalGlobalJest;
    }
  });
});
