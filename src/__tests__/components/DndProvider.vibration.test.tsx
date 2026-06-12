import React from 'react';
import { render } from '@testing-library/react';
import DndProvider from '../../components/DndProvider';
import * as useDragSensorsModule from '../../hooks/useDragSensors';

describe('DndProvider - vibration interceptor (dev only)', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.resetModules();
    // ensure non-production behavior (dev/test)
    process.env.NODE_ENV = 'test';

    // mock useDragSensors to a stable value
    vi.spyOn(useDragSensorsModule, 'useDragSensors').mockReturnValue([] as any);
    // silence noisy dev-only haptics interceptor logs during tests
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: false,
    });
    vi.restoreAllMocks();
  });

  test('wraps navigator.vibrate and sets __vibrateWrapped when navigator.vibrate exists', () => {
    const mockVibrate = vi.fn(() => 'ok');
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, vibrate: mockVibrate },
      configurable: true,
    });

    render(
      <DndProvider>
        <div>child</div>
      </DndProvider>
    );

    // wrapper should be installed and callable; it should return the underlying
    // vibrate result (our mock returns 'ok')
    expect(typeof (global.window as any).navigator.vibrate).toBe('function');
    const res = (global.window as any).navigator.vibrate(123);
    expect(res).toBe('ok');
  });

  test('does not throw when navigator.vibrate is absent', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      configurable: true,
    });

    expect(() =>
      render(
        <DndProvider>
          <div />
        </DndProvider>
      )
    ).not.toThrow();
  });
});
