import { useEffect, useRef } from 'react';

interface UseScrollDebuggerOptions {
  containerRef: React.RefObject<HTMLElement>;
  tracks: any[];
  enabled?: boolean;
}

/**
 * Hook for debugging scroll behavior and monitoring DOM changes
 * Only active in development mode to avoid performance impact in production
 */
export const useScrollDebugger = ({
  containerRef,
  tracks,
  enabled = process.env.NODE_ENV === 'development',
}: UseScrollDebuggerOptions) => {
  const lastScrollTopRef = useRef<number>(0);

  // Monitor scroll container ref changes and track scroll position changes
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const currentScrollTop = container.scrollTop;

    // Check if scroll position changed unexpectedly
    if (currentScrollTop !== lastScrollTopRef.current) {
      console.log('[ScrollDebugger] Scroll position changed', {
        previousScrollTop: lastScrollTopRef.current,
        currentScrollTop,
        difference: currentScrollTop - lastScrollTopRef.current,
        containerHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        timestamp: Date.now(),
      });
      lastScrollTopRef.current = currentScrollTop;
    }
  });

  // Add a mutation observer to detect DOM changes that might cause scroll jumps
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    let initialScrollTop = container.scrollTop;

    const observer = new MutationObserver(() => {
      const newScrollTop = container.scrollTop;
      if (newScrollTop !== initialScrollTop) {
        console.log('[ScrollDebugger] DOM mutation caused scroll change', {
          initialScrollTop,
          newScrollTop,
          difference: newScrollTop - initialScrollTop,
          timestamp: Date.now(),
        });
        initialScrollTop = newScrollTop;
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [enabled, containerRef, tracks]);

  // Monitor page-level scroll changes that might be causing the viewport jump
  useEffect(() => {
    if (!enabled) return;

    let initialPageScrollY = window.scrollY;

    const handlePageScroll = () => {
      const newPageScrollY = window.scrollY;
      if (Math.abs(newPageScrollY - initialPageScrollY) > 10) {
        const stackTrace = new Error().stack;
        console.log('[ScrollDebugger] Page scroll detected', {
          initialPageScrollY,
          newPageScrollY,
          difference: newPageScrollY - initialPageScrollY,
          stackTrace: stackTrace?.split('\n').slice(0, 8).join('\n'),
          timestamp: Date.now(),
        });
        initialPageScrollY = newPageScrollY;
      }
    };

    window.addEventListener('scroll', handlePageScroll);

    // Also check for programmatic page scroll changes
    const checkPageScroll = () => {
      const currentPageScrollY = window.scrollY;
      if (Math.abs(currentPageScrollY - initialPageScrollY) > 10) {
        const stackTrace = new Error().stack;
        console.log('[ScrollDebugger] Programmatic page scroll detected', {
          initialPageScrollY,
          currentPageScrollY,
          difference: currentPageScrollY - initialPageScrollY,
          stackTrace: stackTrace?.split('\n').slice(0, 8).join('\n'),
          timestamp: Date.now(),
        });
        initialPageScrollY = currentPageScrollY;
      }
    };

    const interval = setInterval(checkPageScroll, 100);

    return () => {
      window.removeEventListener('scroll', handlePageScroll);
      clearInterval(interval);
    };
  }, [enabled, tracks]);

  // Monitor focus changes that might cause scroll jumps
  useEffect(() => {
    if (!enabled) return;

    const handleFocusChange = (e: FocusEvent) => {
      if (e.target && e.target !== document.body) {
        console.log('[ScrollDebugger] Focus change detected', {
          targetElement: (e.target as Element).tagName,
          targetId: (e.target as Element).id,
          targetClass: (e.target as Element).className,
          pageScrollY: window.scrollY,
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [enabled, tracks]);

  // Return scroll event handler for container
  const handleScrollEvent = enabled
    ? (e: React.UIEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        const stackTrace = new Error().stack;
        console.log('[ScrollDebugger] Scroll event detected', {
          scrollTop: target.scrollTop,
          previousScrollTop: lastScrollTopRef.current,
          stackTrace: stackTrace?.split('\n').slice(0, 5).join('\n'),
          timestamp: Date.now(),
        });
        lastScrollTopRef.current = target.scrollTop;
      }
    : undefined;

  return {
    handleScrollEvent,
    isEnabled: enabled,
  };
};
