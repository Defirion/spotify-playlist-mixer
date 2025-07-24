import { renderHook, act } from '@testing-library/react';
import useVirtualization from '../useVirtualization';

// Mock data for testing
const createMockItems = count => {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
  }));
};

describe('useVirtualization', () => {
  const defaultProps = {
    items: createMockItems(1000),
    itemHeight: 64,
    containerHeight: 400,
    overscan: 5,
  };

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    expect(result.current.scrollTop).toBe(0);
    expect(result.current.isScrolling).toBe(false);
    expect(result.current.totalHeight).toBe(1000 * 64); // 1000 items * 64px height
    expect(result.current.startIndex).toBe(0);
    expect(result.current.visibleItems.length).toBeGreaterThan(15); // Should render visible + overscan items
  });

  it('should calculate visible items correctly', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    // Initially should show items from start with overscan
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBeGreaterThan(0);
    expect(result.current.visibleItems[0].id).toBe('item-0');
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() =>
      useVirtualization({ ...defaultProps, items: [] })
    );

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(-1);
  });

  it('should provide correct container props', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    expect(result.current.containerProps).toHaveProperty('ref');
    expect(result.current.containerProps).toHaveProperty('onScroll');
    expect(result.current.containerProps.style).toEqual({
      height: 400,
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
    });
  });

  it('should provide correct spacer props', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    expect(result.current.spacerProps.style).toEqual({
      height: 64000, // 1000 items * 64px
      position: 'relative',
    });
  });

  it('should generate correct item props', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    const itemProps = result.current.getItemProps(0);
    expect(itemProps.style).toEqual({
      position: 'absolute',
      top: 0, // First item at top
      left: 0,
      right: 0,
      height: 64,
    });
    expect(itemProps['data-index']).toBe(0);

    const secondItemProps = result.current.getItemProps(1);
    expect(secondItemProps.style.top).toBe(64); // Second item 64px down
    expect(secondItemProps['data-index']).toBe(1);
  });

  it('should calculate item position correctly', () => {
    const { result } = renderHook(() => useVirtualization(defaultProps));

    const position = result.current.getItemPosition(10);
    expect(position).toEqual({
      top: 640, // 10 * 64px
      height: 64,
    });
  });

  it('should handle different item heights', () => {
    const customProps = { ...defaultProps, itemHeight: 100 };
    const { result } = renderHook(() => useVirtualization(customProps));

    expect(result.current.totalHeight).toBe(100000); // 1000 * 100px

    const itemProps = result.current.getItemProps(0);
    expect(itemProps.style.height).toBe(100);

    const position = result.current.getItemPosition(5);
    expect(position.top).toBe(500); // 5 * 100px
  });

  it('should handle different container heights', () => {
    const customProps = { ...defaultProps, containerHeight: 800 };
    const { result } = renderHook(() => useVirtualization(customProps));

    expect(result.current.containerProps.style.height).toBe(800);
    // Should show more visible items with larger container
    expect(result.current.visibleItems.length).toBeGreaterThan(17);
  });

  it('should handle overscan correctly', () => {
    const customProps = { ...defaultProps, overscan: 10 };
    const { result } = renderHook(() => useVirtualization(customProps));

    // With larger overscan, should render more items
    expect(result.current.visibleItems.length).toBeGreaterThan(17);
  });

  // Note: Testing scroll behavior would require more complex setup with jsdom
  // and mock DOM elements, which is beyond the scope of this basic test
});
