import { useRef, useCallback } from 'react';

interface UseAutoScrollOptions {
  scrollContainer?: HTMLElement | null;
  scrollThreshold?: number;
  minScrollSpeed?: number;
  maxScrollSpeed?: number;
}

export const useAutoScroll = ({
  scrollContainer,
  scrollThreshold = 80,
  minScrollSpeed = 2,
  maxScrollSpeed = 20,
}: UseAutoScrollOptions = {}) => {
  const autoScrollRef = useRef<number | null>(null);
  const currentScrollSpeed = useRef<number>(0);

  const calculateScrollSpeed = useCallback(
    (
      distanceFromEdge: number,
      maxDistance: number,
      isOutOfBounds = false
    ): number => {
      if (isOutOfBounds) {
        // Out-of-bounds scrolling with dynamic acceleration
        const outOfBoundsDistance = Math.abs(distanceFromEdge);
        const baseOutOfBoundsSpeed = 30;
        const maxOutOfBoundsSpeed = 60;
        const outOfBoundsAcceleration = Math.min(1, outOfBoundsDistance / 100);
        return (
          baseOutOfBoundsSpeed +
          (maxOutOfBoundsSpeed - baseOutOfBoundsSpeed) * outOfBoundsAcceleration
        );
      }

      // Normal scrolling with proximity-based acceleration
      const normalizedDistance = Math.max(
        0,
        Math.min(1, distanceFromEdge / maxDistance)
      );
      const proximity = 1 - normalizedDistance;
      const accelerationFactor = Math.pow(proximity, 2);
      return (
        minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * accelerationFactor
      );
    },
    [minScrollSpeed, maxScrollSpeed]
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    currentScrollSpeed.current = 0;
  }, []);

  const startAutoScroll = useCallback(
    (direction: 'up' | 'down', targetSpeed: number) => {
      if (!scrollContainer) return;

      // Update speed if already scrolling
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

        // Continue scrolling if there's still room to scroll
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
      const outOfBoundsBuffer = 5;

      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      // Check for out-of-bounds scrolling (cursor outside container)
      if (
        clientY < containerRect.top + outOfBoundsBuffer &&
        scrollContainer.scrollTop > 0
      ) {
        const speed = calculateScrollSpeed(
          distanceFromTop,
          scrollThreshold,
          true
        );
        startAutoScroll('up', speed);
      } else if (
        clientY > containerRect.bottom - outOfBoundsBuffer &&
        scrollContainer.scrollTop <
          scrollContainer.scrollHeight - scrollContainer.clientHeight
      ) {
        const speed = calculateScrollSpeed(
          distanceFromBottom,
          scrollThreshold,
          true
        );
        startAutoScroll('down', speed);
      }
      // Check for normal threshold-based scrolling (cursor inside container but near edges)
      else if (
        distanceFromTop < scrollThreshold &&
        distanceFromTop >= outOfBoundsBuffer &&
        scrollContainer.scrollTop > 0
      ) {
        const speed = calculateScrollSpeed(
          distanceFromTop,
          scrollThreshold,
          false
        );
        startAutoScroll('up', speed);
      } else if (
        distanceFromBottom < scrollThreshold &&
        distanceFromBottom >= outOfBoundsBuffer &&
        scrollContainer.scrollTop <
          scrollContainer.scrollHeight - scrollContainer.clientHeight
      ) {
        const speed = calculateScrollSpeed(
          distanceFromBottom,
          scrollThreshold,
          false
        );
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
    stopAutoScroll,
    startAutoScroll,
  };
};
