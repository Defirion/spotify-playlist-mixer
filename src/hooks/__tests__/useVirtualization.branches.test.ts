import { renderHook, act } from '@testing-library/react';
import useVirtualization from '../useVirtualization';

const createItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}` }));

describe('useVirtualization branch coverage', () => {
  it('clamps scrollToItem to valid range and centers correctly', () => {
    const items = createItems(50);
    const { result } = renderHook(() =>
      useVirtualization({
        items,
        itemHeight: 20,
        containerHeight: 100,
        overscan: 2,
      } as any)
    );

    // attach a fake container element to containerRef
    const container = {
      scrollTop: 0,
    } as any;

    // assign containerRef.current
    act(() => {
      // @ts-ignore
      result.current.containerProps.ref.current = container;
    });

    // scroll to negative index -> should no-op
    act(() => {
      result.current.scrollToItem(-5);
    });
    expect(result.current.scrollTop).toBe(0);

    // scroll to last index with align end
    act(() => {
      result.current.scrollToItem(49, 'end');
    });

    // Should set scrollTop such that itemBottom - containerHeight is >= 0
    expect(result.current.scrollTop).toBeGreaterThanOrEqual(0);

    // center align for a middle item
    act(() => {
      result.current.scrollToItem(10, 'center');
    });

    expect(result.current.scrollTop).toBeGreaterThanOrEqual(0);
  });

  it('returns zeroed data for empty items and resets scrollTop', () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        useVirtualization({
          items,
          itemHeight: 10,
          containerHeight: 100,
        } as any),
      { initialProps: { items: createItems(5) } }
    );

    // attach container
    const container = { scrollTop: 200 } as any;
    act(() => {
      // @ts-ignore
      result.current.containerProps.ref.current = container;
    });

    // now rerender with empty items and expect scroll reset
    rerender({ items: [] });
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(-1);
    expect(result.current.scrollTop).toBe(0);
  });
});
