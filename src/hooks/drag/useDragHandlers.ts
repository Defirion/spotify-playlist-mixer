import { useCallback, useRef } from 'react';
import {
  DraggedItem,
  DragSourceType,
  DraggedItemPayload,
  isValidDragPayload,
} from '../../types/dragAndDrop';

/**
 * Configuration options for the drag handlers hook
 */
interface UseDragHandlersOptions<T extends DragSourceType> {
  /** Type of drag source - determines payload structure */
  type: T;
  /** Data associated with the draggable item */
  data: any;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: (item: DraggedItem<T>) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: DraggedItem<T> | null, success: boolean) => void;
  /** Custom drag item ID generator */
  generateId?: (data: any) => string;
}

/**
 * Return type for the drag handlers hook
 */
interface UseDragHandlersReturnType<T extends DragSourceType> {
  /** Creates a properly typed drag item from current data */
  createDragItem: () => DraggedItem<T>;
  /** HTML5 drag start event handler */
  handleHTML5DragStart: (
    e: React.DragEvent<HTMLElement>
  ) => DraggedItem<T> | null;
  /** HTML5 drag end event handler */
  handleHTML5DragEnd: (
    e: React.DragEvent<HTMLElement>,
    draggedItem: DraggedItem<T> | null
  ) => void;
  /** Validates if data can be used for dragging */
  canDrag: () => boolean;
  /** Gets the current drag item without creating a new one */
  getCurrentDragItem: () => DraggedItem<T> | null;
}

/**
 * Hook for managing HTML5 drag event handlers and drag item creation
 *
 * This hook provides a clean interface for handling HTML5 drag events while
 * ensuring proper payload creation for different drag source types. It includes
 * comprehensive error handling and validation to prevent invalid drag operations.
 *
 * Features:
 * - Type-safe drag item creation for different source types
 * - Comprehensive error handling and validation
 * - HTML5 dataTransfer management
 * - Edge case handling for invalid data states
 * - Performance optimized with useCallback
 *
 * @param options Configuration options for drag behavior
 * @returns Object containing drag handlers and utilities
 */
export const useDragHandlers = <T extends DragSourceType>({
  type,
  data,
  disabled = false,
  onDragStart,
  onDragEnd,
  generateId,
}: UseDragHandlersOptions<T>): UseDragHandlersReturnType<T> => {
  // Store reference to current drag item to maintain consistency
  const currentDragItemRef = useRef<DraggedItem<T> | null>(null);

  /**
   * Default ID generator based on drag type and data
   */
  const defaultGenerateId = useCallback(
    (itemData: any): string => {
      try {
        // Use track ID if available, otherwise generate based on type and timestamp
        if (itemData?.id) {
          return `${type}-${itemData.id}`;
        }

        if (itemData?.track?.id) {
          return `${type}-${itemData.track.id}`;
        }

        // Fallback to timestamp-based ID
        return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } catch (error) {
        console.error('[useDragHandlers] Error generating drag item ID', {
          type,
          data: itemData,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        });

        // Ultimate fallback
        return `${type}-fallback-${Date.now()}`;
      }
    },
    [type]
  );

  /**
   * Creates a properly typed drag item payload based on the drag source type
   */
  const createDragPayload = useCallback(
    (itemData: any): DraggedItemPayload[T] => {
      try {
        switch (type) {
          case 'internal-track': {
            if (!itemData?.track) {
              throw new Error('Internal track drag requires track data');
            }

            const payload = {
              track: itemData.track,
              index: typeof itemData.index === 'number' ? itemData.index : 0,
            };

            if (!isValidDragPayload(payload, type)) {
              throw new Error('Invalid internal-track payload structure');
            }

            return payload as DraggedItemPayload[T];
          }

          case 'modal-track': {
            if (!itemData?.track) {
              throw new Error('Modal track drag requires track data');
            }

            const payload = {
              track: itemData.track,
              source: itemData.source || itemData.sourcePlaylist || 'unknown',
            };

            if (!isValidDragPayload(payload, type)) {
              throw new Error('Invalid modal-track payload structure');
            }

            return payload as DraggedItemPayload[T];
          }

          case 'search-track': {
            if (!itemData?.track) {
              throw new Error('Search track drag requires track data');
            }

            const payload = {
              track: itemData.track,
              query: itemData.query || itemData.searchQuery || '',
            };

            if (!isValidDragPayload(payload, type)) {
              throw new Error('Invalid search-track payload structure');
            }

            return payload as DraggedItemPayload[T];
          }

          default:
            throw new Error(`Unsupported drag source type: ${type}`);
        }
      } catch (error) {
        console.error('[useDragHandlers] Error creating drag payload', {
          type,
          data: itemData,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        });

        // Re-throw to prevent invalid drag operations
        throw error;
      }
    },
    [type]
  );

  /**
   * Creates a properly typed drag item from current data
   */
  const createDragItem = useCallback((): DraggedItem<T> => {
    try {
      if (!data) {
        throw new Error('Cannot create drag item: data is null or undefined');
      }

      const id = generateId ? generateId(data) : defaultGenerateId(data);
      const payload = createDragPayload(data);
      const timestamp = Date.now();

      const dragItem: DraggedItem<T> = {
        id,
        type,
        payload,
        timestamp,
      };

      // Store reference for consistency
      currentDragItemRef.current = dragItem;

      console.log('[useDragHandlers] Created drag item', {
        id,
        type,
        payload,
        timestamp,
      });

      return dragItem;
    } catch (error) {
      console.error('[useDragHandlers] Failed to create drag item', {
        type,
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });

      throw error;
    }
  }, [type, data, generateId, defaultGenerateId, createDragPayload]);

  /**
   * Validates if current data can be used for dragging
   */
  const canDrag = useCallback((): boolean => {
    try {
      if (disabled) {
        return false;
      }

      if (!data) {
        return false;
      }

      // Attempt to create drag payload to validate data structure
      createDragPayload(data);
      return true;
    } catch (error) {
      console.debug('[useDragHandlers] Cannot drag - invalid data', {
        type,
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }, [disabled, data, createDragPayload]);

  /**
   * Gets the current drag item without creating a new one
   */
  const getCurrentDragItem = useCallback((): DraggedItem<T> | null => {
    return currentDragItemRef.current;
  }, []);

  /**
   * HTML5 drag start event handler with comprehensive error handling
   */
  const handleHTML5DragStart = useCallback(
    (e: React.DragEvent<HTMLElement>): DraggedItem<T> | null => {
      try {
        // Prevent drag if disabled or data is invalid
        if (disabled) {
          console.debug('[useDragHandlers] Drag prevented - disabled', {
            type,
          });
          e.preventDefault();
          return null;
        }

        if (!canDrag()) {
          console.warn('[useDragHandlers] Drag prevented - invalid data', {
            type,
            data,
            timestamp: Date.now(),
          });
          e.preventDefault();
          return null;
        }

        // Create drag item
        const dragItem = createDragItem();

        // Configure HTML5 dataTransfer
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/json', JSON.stringify(dragItem));

          // Set a fallback text representation
          const fallbackText = `${type}: ${dragItem.id}`;
          e.dataTransfer.setData('text/plain', fallbackText);

          console.log('[useDragHandlers] HTML5 drag started', {
            dragItem,
            effectAllowed: e.dataTransfer.effectAllowed,
            timestamp: Date.now(),
          });
        } catch (dataTransferError) {
          console.error('[useDragHandlers] Error setting dataTransfer data', {
            error:
              dataTransferError instanceof Error
                ? dataTransferError.message
                : 'Unknown error',
            dragItem,
            timestamp: Date.now(),
          });

          // Continue with drag even if dataTransfer setup fails
        }

        // Call onDragStart callback
        try {
          onDragStart?.(dragItem);
        } catch (callbackError) {
          console.error('[useDragHandlers] Error in onDragStart callback', {
            error:
              callbackError instanceof Error
                ? callbackError.message
                : 'Unknown error',
            dragItem,
            timestamp: Date.now(),
          });

          // Don't prevent drag due to callback errors
        }

        return dragItem;
      } catch (error) {
        console.error(
          '[useDragHandlers] Critical error in handleHTML5DragStart',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            type,
            data,
            timestamp: Date.now(),
          }
        );

        // Prevent drag on critical errors
        e.preventDefault();
        return null;
      }
    },
    [disabled, canDrag, createDragItem, onDragStart, type, data]
  );

  /**
   * HTML5 drag end event handler with success detection and cleanup
   */
  const handleHTML5DragEnd = useCallback(
    (
      e: React.DragEvent<HTMLElement>,
      draggedItem: DraggedItem<T> | null
    ): void => {
      try {
        // Determine if drag was successful based on dropEffect
        const wasSuccessful = e.dataTransfer.dropEffect !== 'none';

        console.log('[useDragHandlers] HTML5 drag ended', {
          draggedItem,
          dropEffect: e.dataTransfer.dropEffect,
          wasSuccessful,
          timestamp: Date.now(),
        });

        // Clear current drag item reference
        currentDragItemRef.current = null;

        // Use setTimeout to ensure onDrop events fire before cleanup
        // This is critical for proper event ordering in HTML5 drag and drop
        setTimeout(() => {
          try {
            onDragEnd?.(draggedItem, wasSuccessful);
          } catch (callbackError) {
            console.error('[useDragHandlers] Error in onDragEnd callback', {
              error:
                callbackError instanceof Error
                  ? callbackError.message
                  : 'Unknown error',
              draggedItem,
              wasSuccessful,
              timestamp: Date.now(),
            });
          }
        }, 0);
      } catch (error) {
        console.error('[useDragHandlers] Error in handleHTML5DragEnd', {
          error: error instanceof Error ? error.message : 'Unknown error',
          draggedItem,
          timestamp: Date.now(),
        });

        // Ensure cleanup happens even on errors
        currentDragItemRef.current = null;

        setTimeout(() => {
          try {
            onDragEnd?.(draggedItem, false);
          } catch (callbackError) {
            console.error(
              '[useDragHandlers] Error in onDragEnd callback during error recovery',
              {
                error:
                  callbackError instanceof Error
                    ? callbackError.message
                    : 'Unknown error',
                timestamp: Date.now(),
              }
            );
          }
        }, 0);
      }
    },
    [onDragEnd]
  );

  return {
    createDragItem,
    handleHTML5DragStart,
    handleHTML5DragEnd,
    canDrag,
    getCurrentDragItem,
  };
};

/**
 * Type export for the hook's return value
 */
export type UseDragHandlersReturn<T extends DragSourceType> = ReturnType<
  typeof useDragHandlers<T>
>;
