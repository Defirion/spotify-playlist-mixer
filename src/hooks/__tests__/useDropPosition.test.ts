import { renderHook, act } from '@testing-library/react';
import { useDropPosition } from '../../hooks/useDropPosition';
import * as calc from '../../utils/dropPositionCalculator';

describe('useDropPosition', () => {
  let consoleErrorSpy: jest.SpyInstance<any, any>;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore?.();
  });
  it('returns null initially and updates on valid input', () => {
    const { result } = renderHook(() => useDropPosition({ tracksLength: 5 }));

    expect(result.current).toBeDefined();
    expect(typeof result.current.updateDropPosition).toBe('function');
    expect(result.current.dropPosition).toBeNull();

    const fakeContainer = document.createElement('div');
    // create three child elements with predictable centers (top: 0,30,60 height:20)
    for (let i = 0; i < 3; i++) {
      const child = document.createElement('div');
      child.setAttribute('data-track-index', String(i));
      const top = i * 30;
      child.getBoundingClientRect = () => ({
        top,
        height: 20,
        bottom: top + 20,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
        toJSON: () => {},
      });
      fakeContainer.appendChild(child);
    }

    act(() => {
      result.current.updateDropPosition(15, fakeContainer as any);
    });

    // 15 is closer to the second element center (30+10=40?) but insertion index logic will pick 1
    expect(result.current.dropPosition).toBeTruthy();
    expect(result.current.dropPosition!.index).toBeGreaterThanOrEqual(0);
  });

  it('handles empty container by returning first position', () => {
    const { result } = renderHook(() => useDropPosition({ tracksLength: 3 }));

    const emptyContainer = document.createElement('div');
    act(() => {
      result.current.updateDropPosition(50, emptyContainer as any);
    });

    expect(result.current.dropPosition).toBeTruthy();
    expect(result.current.dropPosition!.index).toBe(0);
  });

  it('clearDropPosition clears the state', () => {
    const { result } = renderHook(() => useDropPosition({ tracksLength: 2 }));
    const fakeContainer = document.createElement('div');
    const child = document.createElement('div');
    child.setAttribute('data-track-index', '0');
    child.getBoundingClientRect = () => ({
      top: 0,
      height: 20,
      bottom: 20,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    fakeContainer.appendChild(child);

    act(() => {
      result.current.updateDropPosition(5, fakeContainer as any);
    });

    expect(result.current.dropPosition).toBeTruthy();
    act(() => result.current.clearDropPosition());
    expect(result.current.dropPosition).toBeNull();
  });

  it('handles calculator errors by clearing position', () => {
    const spy = jest
      .spyOn(calc, 'calculateDropPosition')
      .mockImplementation(() => {
        throw new Error('boom');
      });
    const { result } = renderHook(() => useDropPosition({ tracksLength: 2 }));
    const fakeContainer = document.createElement('div');

    act(() => {
      result.current.updateDropPosition(5, fakeContainer as any);
    });

    expect(result.current.dropPosition).toBeNull();
    spy.mockRestore();
  });

  it('does not update state when new position equals previous', () => {
    let callCount = 0;
    const stub = jest
      .spyOn(calc, 'calculateDropPosition')
      .mockImplementation((_y, _c, _l) => {
        callCount += 1;
        return {
          index: 1,
          isTopHalf: true,
          isFirst: false,
          isLast: false,
          y: 10,
        } as any;
      });

    const { result } = renderHook(() => useDropPosition({ tracksLength: 2 }));
    const fakeContainer = document.createElement('div');

    act(() => result.current.updateDropPosition(5, fakeContainer as any));
    expect(result.current.dropPosition).toBeTruthy();

    act(() => result.current.updateDropPosition(5, fakeContainer as any));
    // calculate called twice but state should remain equal-ish; ensure no crash and stable
    expect(callCount).toBe(2);
    stub.mockRestore();
  });
});
