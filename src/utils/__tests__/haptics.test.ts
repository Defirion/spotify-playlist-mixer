import { isVibrationSupported, vibrate } from '../haptics';

describe('haptics', () => {
  const originalNavigator = (globalThis as any).navigator;
  const originalDebug = process.env.DEBUG_HAPTICS;

  afterEach(() => {
    try {
      if (originalNavigator === undefined) {
        // remove mocked navigator
        // @ts-ignore
        delete (globalThis as any).navigator;
      } else {
        Object.defineProperty(globalThis, 'navigator', {
          configurable: true,
          value: originalNavigator,
        });
      }
    } catch (e) {
      (globalThis as any).navigator = originalNavigator;
    }

    process.env.DEBUG_HAPTICS = originalDebug;
    vi.restoreAllMocks();
  });

  it('isVibrationSupported returns false when navigator is undefined', () => {
    try {
      // remove navigator if present
      // @ts-ignore
      delete (globalThis as any).navigator;
    } catch (e) {
      (globalThis as any).navigator = undefined;
    }
    expect(isVibrationSupported()).toBe(false);
  });

  it('isVibrationSupported returns true when navigator.vibrate exists', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate: () => {} },
    });
    expect(isVibrationSupported()).toBe(true);
  });

  it('vibrate calls navigator.vibrate when supported', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate: vibrateMock },
    });
    vibrate(100);
    expect(vibrateMock).toHaveBeenCalledWith(100);
  });

  it('vibrate does not throw when navigator.vibrate is absent', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    expect(() => vibrate(50)).not.toThrow();
  });

  it('vibrate logs debug info when DEBUG_HAPTICS=1', () => {
    process.env.DEBUG_HAPTICS = '1';
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate: vibrateMock },
    });
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vibrate([10, 20]);
    expect(vibrateMock).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();
  });
});
