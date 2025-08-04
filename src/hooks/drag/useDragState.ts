import { useDragState as useStoreDragState } from '../../store';
import { DraggedItem } from '../../types/dragAndDrop';

/**
 * Core drag state hook that provides store integration and item-specific utilities
 *
 * This hook serves as the primary interface for components to interact with the
 * centralized drag state managed by Zustand. It provides optimized subscriptions
 * and utility functions for drag state management.
 *
 * Features:
 * - Optimized store subscriptions using shallow comparison
 * - Item-specific drag state checking
 * - Type-safe drag operations
 * - Performance optimized with minimal re-renders
 */
export const useDragState = () => {
  // Get drag state from the centralized Zustand store
  // This uses shallow comparison for optimal performance
  const storeState = useStoreDragState();

  /**
   * Utility function to check if a specific item is currently being dragged
   *
   * @param itemId - The unique identifier of the item to check
   * @returns boolean indicating if this specific item is being dragged
   *
   * This function provides a convenient way for components to determine if they
   * are the source of the current drag operation, enabling proper visual feedback
   * and interaction states.
   */
  const isCurrentlyDragged = (itemId: string): boolean => {
    return storeState.isDragging && storeState.draggedItem?.id === itemId;
  };

  /**
   * Utility function to check if a specific item type is currently being dragged
   *
   * @param itemType - The drag source type to check
   * @returns boolean indicating if an item of this type is being dragged
   *
   * Useful for components that need to respond to drag operations of specific types,
   * such as modals that should mute when external drags are active.
   */
  const isDragTypeActive = (itemType: string): boolean => {
    return storeState.isDragging && storeState.draggedItem?.type === itemType;
  };

  /**
   * Get the currently dragged item with type safety
   *
   * @returns The currently dragged item or null if no drag is active
   *
   * Provides type-safe access to the dragged item data, useful for drop zones
   * that need to inspect the dragged content to determine valid drop operations.
   */
  const getCurrentDraggedItem = (): DraggedItem | null => {
    return storeState.draggedItem;
  };

  /**
   * Get drag operation duration in milliseconds
   *
   * @returns Duration of current drag operation, or 0 if no drag is active
   *
   * Useful for performance monitoring and debugging drag operations.
   */
  const getDragDuration = (): number => {
    if (!storeState.isDragging || !storeState.dragStartTime) {
      return 0;
    }
    return Date.now() - storeState.dragStartTime;
  };

  /**
   * Check if drag operations are currently blocked
   *
   * @returns boolean indicating if new drag operations should be prevented
   *
   * This can be used by components to prevent starting new drag operations
   * when one is already in progress, maintaining system consistency.
   */
  const isDragBlocked = (): boolean => {
    return storeState.isDragging;
  };

  return {
    // Core drag state from store
    isDragging: storeState.isDragging,
    draggedItem: storeState.draggedItem,
    dragStartTime: storeState.dragStartTime,

    // Drag control actions
    startDrag: storeState.startDrag,
    endDrag: storeState.endDrag,
    cancelDrag: storeState.cancelDrag,

    // Utility functions for item-specific drag state
    isCurrentlyDragged,
    isDragTypeActive,
    getCurrentDraggedItem,
    getDragDuration,
    isDragBlocked,
  };
};

/**
 * Type definition for the return value of useDragState hook
 *
 * This ensures type safety when destructuring the hook's return value
 * and provides better IDE support and documentation.
 */
export type UseDragStateReturn = ReturnType<typeof useDragState>;
