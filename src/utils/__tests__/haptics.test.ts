import { isVibrationSupported, vibrate } from '../haptics';

describe('haptics', () => {
  const originalNavigator: any = global.navigator;

  afterEach(() => {
    (global as any).navigator = originalNavigator;
  });

  test('isVibrationSupported false without vibrate', () => {
    delete (global as any).navigator;
    (global as any).navigator = { userAgent: 'jest' };
    expect(isVibrationSupported()).toBe(false);
  });

  test('isVibrationSupported true with vibrate', () => {
    delete (global as any).navigator;
    (global as any).navigator = { userAgent: 'jest' };
    Object.defineProperty((global as any).navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
    });
    expect(isVibrationSupported()).toBe(true);
  });

  test('vibrate calls underlying navigator.vibrate when supported', () => {
    const spy = vi.fn();
    delete (global as any).navigator;
    (global as any).navigator = { userAgent: 'jest' };
    Object.defineProperty((global as any).navigator, 'vibrate', {
      value: spy,
      configurable: true,
    });
    vibrate(50);
    expect(spy).toHaveBeenCalledWith(50);
  });

  test('vibrate swallows errors', () => {
    const spy = vi.fn(() => {
      throw new Error('boom');
    });
    delete (global as any).navigator;
    (global as any).navigator = { userAgent: 'jest' };
    Object.defineProperty((global as any).navigator, 'vibrate', {
      value: spy,
      configurable: true,
    });
    expect(() => vibrate([10, 20, 10])).not.toThrow();
  });
});
