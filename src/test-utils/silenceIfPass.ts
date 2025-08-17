/**
 * Run a function while capturing console output and only replay the output
 * if the function throws. Useful in tests to avoid noisy logs for passing
 * tests while still showing logs for failing ones.
 */
export async function silenceIfPass<T>(fn: () => T | Promise<T>): Promise<T> {
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log,
  };

  const buffer = {
    error: [] as unknown[],
    warn: [] as unknown[],
    info: [] as unknown[],
    log: [] as unknown[],
  };

  // Keep references to any jest mocks we detect so we can replay their
  // recorded calls on failure without replacing them (which would break
  // Jest mock identity).
  const mockCaptures: Partial<Record<keyof typeof buffer, unknown>> = {};

  // Helper to determine if a function is a Jest mock (if running under Jest)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isJestMock = (fn: any): boolean => {
    // jest.isMockFunction is available in test runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (
      typeof (global as any).jest !== 'undefined' &&
      (global as any).jest.isMockFunction(fn)
    );
  };

  // Replace or wrap console methods to capture calls.
  // If a method is already a Jest mock, wrap it so calls still register on the mock.
  const replace = (key: keyof typeof buffer) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current: any = console[key as keyof Console];
    if (isJestMock(current)) {
      // If it's already a Jest mock, don't replace it — record it so we can
      // replay its recorded calls on failure. Replacing would break Jest's
      // internal mock identity and make toHaveBeenCalled assertions fail.
      (mockCaptures as any)[key] = current;
      return;
    }

    // Not a jest mock — replace with a capture-only function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (console as any)[key] = (...args: any[]) => buffer[key].push(args);
  };

  replace('error');
  replace('warn');
  replace('info');
  replace('log');

  try {
    const result = await fn();
    // on success, swallow the captured logs
    return result;
  } catch (err) {
    // on failure, replay captured logs to the original console so they appear in test output
    // First, replay captures from replaced functions
    buffer.error.forEach(args =>
      originalConsole.error.apply(console, args as any)
    );
    buffer.warn.forEach(args =>
      originalConsole.warn.apply(console, args as any)
    );
    buffer.info.forEach(args =>
      originalConsole.info.apply(console, args as any)
    );
    buffer.log.forEach(args => originalConsole.log.apply(console, args as any));

    // Then, for any console methods that were Jest mocks, replay their mock.calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Object.keys(mockCaptures) as Array<keyof typeof buffer>).forEach(k => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = (mockCaptures as any)[k];
      if (mock && mock.mock && Array.isArray(mock.mock.calls)) {
        mock.mock.calls.forEach((args: unknown[]) => {
          (originalConsole as any)[k].apply(console, args as any);
        });
      }
    });
    throw err;
  } finally {
    // restore original consoles (only needed if we replaced them)
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.log = originalConsole.log;
  }
}
