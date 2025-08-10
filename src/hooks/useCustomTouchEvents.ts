import { useEffect, useCallback } from 'react';
import { DraggedItem } from '../types/dragAndDrop';

interface CustomTouchEventDetail {
  clientX: number;
  clientY: number;
  draggedItem: DraggedItem | null;
}

interface UseCustomTouchEventsOptions {
  containerRef: React.RefObject<HTMLElement>;
  onTouchDragOver?: (detail: CustomTouchEventDetail) => void;
  onTouchDrop?: (detail: CustomTouchEventDetail) => void;
}

/**
 * Hook for handling custom touch drag events
 *
 * This system bridges the gap between HTML5 drag events and touch interactions.
 * When touch drag operations occur, they dispatch custom events that this hook
 * listens for to provide consistent drag behavior across input methods.
 *
 * Custom events used:
 * - 'externalDragOver' / 'internalDragOver': Touch drag over events
 * - 'externalDrop' / 'internalDrop': Touch drop events
 */
export const useCustomTouchEvents = ({
  containerRef,
  onTouchDragOver,
  onTouchDrop,
}: UseCustomTouchEventsOptions) => {
  const handleTouchDragOver = useCallback(
    (e: CustomEvent<CustomTouchEventDetail>) => {
      const { clientX, clientY, draggedItem } = e.detail;

      console.log('[CustomTouchEvents] Touch drag over:', {
        clientY,
        draggedItem: draggedItem?.type,
        eventType: e.type,
        timestamp: Date.now(),
      });

      onTouchDragOver?.(e.detail);
    },
    [onTouchDragOver]
  );

  const handleTouchDrop = useCallback(
    (e: CustomEvent<CustomTouchEventDetail>) => {
      const { clientX, clientY, draggedItem } = e.detail;

      console.log('[CustomTouchEvents] Touch drop event received:', {
        clientY,
        draggedItem: draggedItem?.type,
        timestamp: Date.now(),
      });

      if (!draggedItem) {
        console.warn(
          '[CustomTouchEvents] Touch drop event without draggedItem'
        );
        return;
      }

      onTouchDrop?.(e.detail);
    },
    [onTouchDrop]
  );

  // Add custom event listeners for touch drag events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listeners for both internal and external touch drag events
    container.addEventListener(
      'externalDragOver',
      handleTouchDragOver as EventListener
    );
    container.addEventListener(
      'internalDragOver',
      handleTouchDragOver as EventListener
    );
    container.addEventListener(
      'externalDrop',
      handleTouchDrop as EventListener
    );
    container.addEventListener(
      'internalDrop',
      handleTouchDrop as EventListener
    );

    return () => {
      container.removeEventListener(
        'externalDragOver',
        handleTouchDragOver as EventListener
      );
      container.removeEventListener(
        'internalDragOver',
        handleTouchDragOver as EventListener
      );
      container.removeEventListener(
        'externalDrop',
        handleTouchDrop as EventListener
      );
      container.removeEventListener(
        'internalDrop',
        handleTouchDrop as EventListener
      );
    };
  }, [containerRef, handleTouchDragOver, handleTouchDrop]);

  return {
    // Expose handlers for manual event dispatch if needed
    handleTouchDragOver,
    handleTouchDrop,
  };
};
