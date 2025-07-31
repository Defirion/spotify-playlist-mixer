import { useCallback, useRef } from 'react';

interface UseAutoScrollOptions {
  scrollContainer?: HTMLElement | null;
  scrollThreshold?: number;
}

interface UseAutoScrollReturn {
  checkAutoScroll: (clientY: number) => void;
  startAutoScroll: (direction: 'up' | 'down', speed: number) => void;
  stopAutoScroll: () => void;
}

/**
 * Custom hook for managing auto-scroll functionality during drag operations
 * Handles smooth scrolling when dragging near container edges
 */
export const useAutoScroll = ({
  scrollContainer,
  scrollThreshold = 80,
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const autoScrollRef = useRef<number | null>(null);
  const currentScrollSpeed = useRef<number>(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    currentScrollSpeed.current = 0;
  }, []);

  const calculateScrollSpeed = useCallback(
    (distanceFromEdge: number, maxDistance: number): number => {
      const normalizedDistance = Math.max(
        0,
        Math.min(1, distanceFromEdge / maxDistance)
      );
      const proximity = 1 - normalizedDistance;
      const accelerationFactor = Math.pow(proximity, 2);
      const minSpeed = 2;
      const maxSpeed = 20;
      return minSpeed + (maxSpeed - minSpeed) * accelerationFactor;
    },
    []
  );

  const startAutoScroll = useCallback(
    (direction: 'up' | 'down', targetSpeed: number) => {
      if (!scrollContainer) return;

      if (autoScrollRef.current) {
        currentScrollSpeed.current = targetSpeed;
        return;
      }

      currentScrollSpeed.current = targetSpeed;

      const scroll = () => {
        const container = scrollContainer;
        if (!container) return;

        const scrollAmount = currentScrollSpeed.current;
        const currentScrollTop = container.scrollTop;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        if (direction === 'up' && currentScrollTop > 0) {
          container.scrollTop = Math.max(0, currentScrollTop - scrollAmount);
        } else if (direction === 'down' && currentScrollTop < maxScrollTop) {
          container.scrollTop = Math.min(
            maxScrollTop,
            currentScrollTop + scrollAmount
          );
        }

        if (
          (direction === 'up' && container.scrollTop > 0) ||
          (direction === 'down' && container.scrollTop < maxScrollTop)
        ) {
          autoScrollRef.current = requestAnimationFrame(scroll);
        } else {
          stopAutoScroll();
        }
      };

      autoScrollRef.current = requestAnimationFrame(scroll);
    },
    [scrollContainer, stopAutoScroll]
  );

  const checkAutoScroll = useCallback(
    (clientY: number) => {
      if (!scrollContainer) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      if (distanceFromTop < scrollThreshold && scrollContainer.scrollTop > 0) {
        const speed = calculateScrollSpeed(distanceFromTop, scrollThreshold);
        startAutoScroll('up', speed);
      } else if (
        distanceFromBottom < scrollThreshold &&
        scrollContainer.scrollTop <
          scrollContainer.scrollHeight - scrollContainer.clientHeight
      ) {
        const speed = calculateScrollSpeed(distanceFromBottom, scrollThreshold);
        startAutoScroll('down', speed);
      } else {
        stopAutoScroll();
      }
    },
    [
      scrollContainer,
      scrollThreshold,
      calculateScrollSpeed,
      startAutoScroll,
      stopAutoScroll,
    ]
  );

  return {
    checkAutoScroll,
    startAutoScroll,
    stopAutoScroll,
  };
};

export default useAutoScroll;
