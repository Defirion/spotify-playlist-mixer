import { useCallback, useRef } from 'react';
import { DraggedItem, DragSourceType } from '../../types/dragAndDrop';

/**
 * Keyboard state interface for tracking keyboard drag operations
 */
interface KeyboardState {
  isActive: boolean;
  selectedIndex: number;
  isDragging: boolean;
}

/**
 * Options for configuring keyboard drag behavior
 */
interface UseKeyboardDragOptions<T extends DragSourceType> {
  /** Whether keyboard drag is disabled */
  disabled?: boolean;
  /** Function to create drag item when keyboard drag starts */
  createDragItem: () => DraggedItem<T>;
  /** Whether this specific item is currently being dragged */
  isCurrentlyDragged: boolean;
  /** Callback when keyboard drag starts */
  onDragStart?: (item: DraggedItem<T>) => void;
  /** Callback when keyboard drag ends */
  onDragEnd?: (item: DraggedItem<T> | null, success: boolean) => void;
  /** Callback for keyboard navigation during drag (arrow keys) */
  onMove?: (direction: 'up' | 'down') => void;
}

/**
 * Return type for useKeyboardDrag hook
 */
interface UseKeyboardDragReturn {
  /** Keyboard event handler for drag operations */
  handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  /** Current keyboard state (for testing and debugging) */
  keyboardState: KeyboardState;
}

/**
 * Hook for handling keyboard-based drag operations
 *
 * Supports:
 * - Spacebar: Start/end drag operation
 * - Arrow Up/Down: Navigate during drag
 * - Escape: Cancel drag operation
 *
 * Maintains ARIA attributes and accessibility support for screen readers.
 *
 * @param options Configuration options for keyboard drag behavior
 * @returns Keyboard event handlers and state
 */
export const useKeyboardDrag = <T extends DragSourceType>({
  disabled = false,
  createDragItem,
  isCurrentlyDragged,
  onDragStart,
  onDragEnd,
  onMove,
}: UseKeyboardDragOptions<T>): UseKeyboardDragReturn => {
  // Track the dragged item for proper cleanup
  const dragItemRef = useRef<DraggedItem<T> | null>(null);

  // Internal keyboard state tracking
  const keyboardStateRef = useRef<KeyboardState>({
    isActive: false,
    selectedIndex: -1,
    isDragging: false,
  });

  /**
   * Handle keyboard events for drag operations
   * Implements the same keyboard behavior as the original useDraggable hook
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return;

      const { key } = e;

      switch (key) {
        case ' ': // Spacebar - toggle drag state
          e.preventDefault();

          if (!isCurrentlyDragged) {
            // Start drag operation
            keyboardStateRef.current.isDragging = true;
            keyboardStateRef.current.isActive = true;

            const dragItem = createDragItem();
            dragItemRef.current = dragItem;

            onDragStart?.(dragItem);
          } else {
            // End drag operation (drop)
            keyboardStateRef.current.isDragging = false;
            keyboardStateRef.current.isActive = false;

            onDragEnd?.(dragItemRef.current, true);
            dragItemRef.current = null;
          }
          break;

        case 'ArrowUp':
          // Navigate up during drag
          if (isCurrentlyDragged) {
            e.preventDefault();
            onMove?.('up');
          }
          break;

        case 'ArrowDown':
          // Navigate down during drag
          if (isCurrentlyDragged) {
            e.preventDefault();
            onMove?.('down');
          }
          break;

        case 'Escape':
          // Cancel drag operation
          if (isCurrentlyDragged) {
            e.preventDefault();

            keyboardStateRef.current.isDragging = false;
            keyboardStateRef.current.isActive = false;

            onDragEnd?.(dragItemRef.current, false);
            dragItemRef.current = null;
          }
          break;

        default:
          // No action for other keys
          break;
      }
    },
    [
      disabled,
      isCurrentlyDragged,
      createDragItem,
      onDragStart,
      onDragEnd,
      onMove,
    ]
  );

  return {
    handleKeyDown,
    keyboardState: keyboardStateRef.current,
  };
};
