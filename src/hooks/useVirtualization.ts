import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UseVirtualizationReturn } from '../types';

interface VirtualizationOptions<T = any> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getItemHeight?: ((index: number, item: T) => number) | null;
}

interface VirtualizedData<T = any> {
  visibleItems: T[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  visibleCount: number;
}

/**
 * Custom hook for virtualizing large lists efficiently
 */
const useVirtualization = <T = any>({
  items = [],
  itemHeight = 64,
  containerHeight = 400,
  overscan = 5,
  getItemHeight = null,
}: VirtualizationOptions<T>): UseVirtualizationReturn => {
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate visible items and positions
  const virtualizedData = useMemo<VirtualizedData<T>>(() => {
    if (items.length === 0) {
      return {
        visibleItems: [],
        totalHeight: 0,
        startIndex: 0,
        endIndex: -1,
        offsetY: 0,
        visibleCount: 0,
      };
    }

    // For dynamic heights, we'd need to calculate cumulative heights
    // For now, we'll use fixed height for simplicity and performance
    const totalHeight = items.length * itemHeight;

    // Calculate visible range
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleCount + overscan * 2
    );

    // Get visible items
    const visibleItems = items.slice(startIndex, endIndex + 1);

    // Calculate offset for positioning
    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      totalHeight,
      startIndex,
      endIndex,
      offsetY,
      visibleCount,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const newScrollTop = (event.target as HTMLElement).scrollTop;
    setScrollTop(newScrollTop);

    // Set scrolling state
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to detect when scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Scroll to specific item
  const scrollToItem = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      if (!containerRef.current || index < 0 || index >= items.length) {
        return;
      }

      const itemTop = index * itemHeight;
      const itemBottom = itemTop + itemHeight;
      const containerTop = scrollTop;
      const containerBottom = scrollTop + containerHeight;

      let newScrollTop = scrollTop;

      if (align === 'start' || (align === 'auto' && itemTop < containerTop)) {
        newScrollTop = itemTop;
      } else if (
        align === 'end' ||
        (align === 'auto' && itemBottom > containerBottom)
      ) {
        newScrollTop = itemBottom - containerHeight;
      } else if (align === 'center') {
        newScrollTop = itemTop - (containerHeight - itemHeight) / 2;
      }

      // Clamp scroll position
      newScrollTop = Math.max(
        0,
        Math.min(newScrollTop, virtualizedData.totalHeight - containerHeight)
      );

      containerRef.current.scrollTop = newScrollTop;
      setScrollTop(newScrollTop);
    },
    [
      itemHeight,
      containerHeight,
      scrollTop,
      items.length,
      virtualizedData.totalHeight,
    ]
  );

  // Get item position info
  const getItemPosition = useCallback(
    (index: number) => {
      return {
        top: index * itemHeight,
        height: itemHeight,
      };
    },
    [itemHeight]
  );

  // Reset scroll position when items change significantly
  useEffect(() => {
    if (containerRef.current && items.length === 0) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Container props to be spread on the scrollable container
  const containerProps = {
    ref: containerRef,
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      position: 'relative' as const,
    },
  };

  // Spacer props for the total height container
  const spacerProps = {
    style: {
      height: virtualizedData.totalHeight,
      position: 'relative' as const,
    },
  };

  // Get props for individual items
  const getItemProps = useCallback(
    (index: number) => {
      const actualIndex = virtualizedData.startIndex + index;
      const position = getItemPosition(actualIndex);

      return {
        style: {
          position: 'absolute' as const,
          top: position.top,
          left: 0,
          right: 0,
          height: position.height,
        },
        'data-index': actualIndex,
      };
    },
    [virtualizedData.startIndex, getItemPosition]
  );

  return {
    // Virtualized data
    visibleItems: virtualizedData.visibleItems,
    totalHeight: virtualizedData.totalHeight,
    startIndex: virtualizedData.startIndex,
    endIndex: virtualizedData.endIndex,
    offsetY: virtualizedData.offsetY,
    visibleCount: virtualizedData.visibleCount,

    // State
    scrollTop,
    isScrolling,

    // Methods
    scrollToItem,
    getItemPosition,
    getItemProps,

    // Props to spread
    containerProps,
    spacerProps,
  };
};

export default useVirtualization;
