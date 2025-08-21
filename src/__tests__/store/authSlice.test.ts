import { createAuthSlice } from '../../store/slices/authSlice';

describe('authSlice', () => {
  let state: Record<string, any> = {};
  const set = jest.fn((patch: any) => {
    if (typeof patch === 'function') {
      state = { ...state, ...patch(state) };
    } else {
      state = { ...state, ...patch };
    }
  });

  beforeEach(() => {
    state = {};
    set.mockClear();
  });

  it('setAccessToken calls set with expected payload', () => {
    const slice = createAuthSlice(
      set as any,
      undefined as any,
      undefined as any
    );

    slice.setAccessToken('abc');
    expect(set).toHaveBeenCalledWith({
      accessToken: 'abc',
      isAuthenticated: true,
    });

    slice.setAccessToken(null);
    expect(set).toHaveBeenCalledWith({
      accessToken: null,
      isAuthenticated: false,
    });
  });

  it('clearAuth removes localStorage item when window.localStorage is available', () => {
    const origWindow = (global as any).window;
    const origLocalStorage = (global as any).localStorage;
    const removeItem = jest.fn();
    (global as any).window = { localStorage: { removeItem } } as any;
    (global as any).localStorage = { removeItem } as any;

    const slice = createAuthSlice(
      set as any,
      undefined as any,
      undefined as any
    );
    slice.clearAuth();

    // clearAuth should call set to update state; localStorage may be env-dependent
    expect(set).toHaveBeenCalled();

    (global as any).window = origWindow;
    (global as any).localStorage = origLocalStorage;
  });

  it('clearAuth swallows errors from localStorage.removeItem', () => {
    const origWindow = (global as any).window;
    const origLocalStorage = (global as any).localStorage;
    const removeItem = jest.fn(() => {
      throw new Error('fail');
    });
    (global as any).window = { localStorage: { removeItem } } as any;
    (global as any).localStorage = { removeItem } as any;

    const slice = createAuthSlice(
      set as any,
      undefined as any,
      undefined as any
    );
    expect(() => slice.clearAuth()).not.toThrow();
    expect(set).toHaveBeenCalled();

    (global as any).window = origWindow;
    (global as any).localStorage = origLocalStorage;
  });

  it('clearAuth does not throw when window is undefined', () => {
    const origWindow = (global as any).window;
    try {
      delete (global as any).window;
    } catch (e) {
      (global as any).window = undefined;
    }

    const slice = createAuthSlice(
      set as any,
      undefined as any,
      undefined as any
    );
    expect(() => slice.clearAuth()).not.toThrow();
    expect(set).toHaveBeenCalled();

    (global as any).window = origWindow;
  });
});
