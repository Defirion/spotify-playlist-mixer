import { useState, useCallback } from 'react';
import {
  calculateDropPosition,
  DropPosition,
} from '../utils/dropPositionCalculator';

interface UseDropPositionOptions {
  tracksLength: number;
}

/**
 * Hook for managing drop position state and calculations
 */
export const useDropPosition = ({ tracksLength }: UseDropPositionOptions) => {
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  const updateDropPosition = useCallback(
    (clientY: number, containerElement: HTMLElement): DropPosition | null => {
      try {
        const newDropPosition = calculateDropPosition(
          clientY,
          containerElement,
          tracksLength
        );

        // Only update if position actually changed to reduce re-renders
        setDropPosition(prevPosition => {
          if (
            !prevPosition ||
            prevPosition.index !== newDropPosition.index ||
            prevPosition.isTopHalf !== newDropPosition.isTopHalf
          ) {
            return newDropPosition;
          }
          return prevPosition;
        });

        return newDropPosition;
      } catch (error) {
        console.error('Error calculating drop position:', error);
        setDropPosition(null);
        return null;
      }
    },
    [tracksLength]
  );

  const clearDropPosition = useCallback(() => {
    setDropPosition(null);
  }, []);

  return {
    dropPosition,
    updateDropPosition,
    clearDropPosition,
  };
};
