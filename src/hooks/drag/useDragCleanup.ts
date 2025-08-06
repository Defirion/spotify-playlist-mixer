import { useEffect, useRef, useCallback } from 'react';
import { dragCleanupManager } from '../../services/dragCleanupManager';
import { useDragState } from '../drag/useDragState';

/**
 * Hook for managing drag-related cleanup operations
 *
 * This hook provides a React-friendly interface to the drag cleanup manager,
 * automatically handling component unmount cleanup and providing utilities
 * for registering and managing cleanup resources during drag operations.
 */
export const useDragCleanup = (componentName?: string) => {
  const componentId = useRef(
    `${componentName || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const { isDragging, cancelDrag } = useDragState();
  const cleanupCallbacksRef = useRef<Set<() => void>>(new Set());

  /**
   * Register a timer for cleanup
   */
  const registerTimer = useCallback(
    (timerId: number, description?: string): string => {
      return dragCleanupManager.registerTimer(
        timerId,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Register an interval for cleanup
   */
  const registerInterval = useCallback(
    (intervalId: number, description?: string): string => {
      return dragCleanupManager.registerInterval(
        intervalId,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Register an animation frame for cleanup
   */
  const registerAnimationFrame = useCallback(
    (frameId: number, description?: string): string => {
      return dragCleanupManager.registerAnimationFrame(
        frameId,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Register an event listener for cleanup
   */
  const registerEventListener = useCallback(
    (
      element: EventTarget,
      event: string,
      handler: EventListener,
      options?: boolean | AddEventListenerOptions,
      description?: string
    ): string => {
      return dragCleanupManager.registerEventListener(
        element,
        event,
        handler,
        options,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Register an observer for cleanup
   */
  const registerObserver = useCallback(
    (
      observer: MutationObserver | ResizeObserver | IntersectionObserver,
      description?: string
    ): string => {
      return dragCleanupManager.registerObserver(
        observer,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Register a custom cleanup resource
   */
  const registerCustom = useCallback(
    (resource: any, cleanup: () => void, description?: string): string => {
      return dragCleanupManager.registerCustom(
        resource,
        cleanup,
        componentId.current,
        description
      );
    },
    []
  );

  /**
   * Unregister a specific resource
   */
  const unregister = useCallback((resourceId: string): boolean => {
    return dragCleanupManager.unregister(resourceId);
  }, []);

  /**
   * Add a cleanup callback that will be executed when the component unmounts
   * or when cleanup is triggered
   */
  const addCleanupCallback = useCallback(
    (callback: () => void): (() => void) => {
      cleanupCallbacksRef.current.add(callback);

      // Return function to remove the callback
      return () => {
        cleanupCallbacksRef.current.delete(callback);
      };
    },
    []
  );

  /**
   * Manually trigger cleanup for this component
   */
  const cleanup = useCallback(() => {
    console.log(
      `[useDragCleanup] Manual cleanup triggered for component: ${componentId.current}`
    );

    // Execute component-specific cleanup callbacks
    for (const callback of cleanupCallbacksRef.current) {
      try {
        callback();
      } catch (error) {
        console.error(
          `[useDragCleanup] Error in cleanup callback for ${componentId.current}:`,
          error
        );
      }
    }

    // Clean up registered resources
    dragCleanupManager.cleanupComponent(componentId.current);
  }, []);

  /**
   * Emergency cleanup that also cancels any active drag operation
   */
  const emergencyCleanup = useCallback(() => {
    console.warn(
      `[useDragCleanup] Emergency cleanup triggered for component: ${componentId.current}`
    );

    // Cancel active drag if any
    if (isDragging) {
      try {
        cancelDrag();
      } catch (error) {
        console.error(
          `[useDragCleanup] Error canceling drag during emergency cleanup:`,
          error
        );
      }
    }

    // Perform regular cleanup
    cleanup();
  }, [isDragging, cancelDrag, cleanup]);

  /**
   * Safe setTimeout that automatically registers for cleanup
   */
  const safeSetTimeout = useCallback(
    (
      callback: () => void,
      delay: number,
      description?: string
    ): NodeJS.Timeout => {
      const timerId = setTimeout(() => {
        try {
          callback();
        } catch (error) {
          console.error(
            `[useDragCleanup] Error in setTimeout callback:`,
            error
          );
        } finally {
          // Auto-unregister after execution
          dragCleanupManager.unregister(`timer-${timerId}-${Date.now()}`);
        }
      }, delay);

      registerTimer(timerId as any, description || 'safeSetTimeout');
      return timerId;
    },
    [registerTimer]
  );

  /**
   * Safe setInterval that automatically registers for cleanup
   */
  const safeSetInterval = useCallback(
    (
      callback: () => void,
      delay: number,
      description?: string
    ): NodeJS.Timeout => {
      const intervalId = setInterval(() => {
        try {
          callback();
        } catch (error) {
          console.error(
            `[useDragCleanup] Error in setInterval callback:`,
            error
          );
          // Don't clear interval on error, let it continue
        }
      }, delay);

      registerInterval(intervalId as any, description || 'safeSetInterval');
      return intervalId;
    },
    [registerInterval]
  );

  /**
   * Safe requestAnimationFrame that automatically registers for cleanup
   */
  const safeRequestAnimationFrame = useCallback(
    (callback: (timestamp: number) => void, description?: string): number => {
      const frameId = requestAnimationFrame(timestamp => {
        try {
          callback(timestamp);
        } catch (error) {
          console.error(
            `[useDragCleanup] Error in requestAnimationFrame callback:`,
            error
          );
        } finally {
          // Auto-unregister after execution
          dragCleanupManager.unregister(`frame-${frameId}-${Date.now()}`);
        }
      });

      registerAnimationFrame(
        frameId,
        description || 'safeRequestAnimationFrame'
      );
      return frameId;
    },
    [registerAnimationFrame]
  );

  /**
   * Safe addEventListener that automatically registers for cleanup
   */
  const safeAddEventListener = useCallback(
    (
      element: EventTarget,
      event: string,
      handler: EventListener,
      options?: boolean | AddEventListenerOptions,
      description?: string
    ): string => {
      element.addEventListener(event, handler, options);
      return registerEventListener(
        element,
        event,
        handler,
        options,
        description || `safeAddEventListener-${event}`
      );
    },
    [registerEventListener]
  );

  // Cleanup on component unmount
  useEffect(() => {
    const currentComponentId = componentId.current;
    const currentCleanupCallbacks = cleanupCallbacksRef.current;

    return () => {
      console.log(
        `[useDragCleanup] Component unmounting, cleaning up: ${currentComponentId}`
      );

      // Execute cleanup callbacks
      for (const callback of currentCleanupCallbacks) {
        try {
          callback();
        } catch (error) {
          console.error(
            `[useDragCleanup] Error in unmount cleanup callback:`,
            error
          );
        }
      }

      // Clean up all registered resources for this component
      dragCleanupManager.cleanupComponent(currentComponentId);
    };
  }, []);

  // Emergency cleanup if component unmounts during active drag
  useEffect(() => {
    const currentIsDragging = isDragging;
    const currentCancelDrag = cancelDrag;

    return () => {
      if (currentIsDragging) {
        console.warn(
          `[useDragCleanup] Component unmounting during active drag, performing emergency cleanup`
        );
        try {
          currentCancelDrag();
        } catch (error) {
          console.error(
            `[useDragCleanup] Error canceling drag during unmount:`,
            error
          );
        }
      }
    };
  }, [isDragging, cancelDrag]);

  return {
    // Resource registration
    registerTimer,
    registerInterval,
    registerAnimationFrame,
    registerEventListener,
    registerObserver,
    registerCustom,
    unregister,

    // Cleanup management
    addCleanupCallback,
    cleanup,
    emergencyCleanup,

    // Safe wrappers
    safeSetTimeout,
    safeSetInterval,
    safeRequestAnimationFrame,
    safeAddEventListener,

    // Component info
    componentId: componentId.current,
  };
};

/**
 * Hook for global drag cleanup operations
 *
 * This hook provides access to global cleanup operations and statistics.
 * Should typically only be used by top-level components or error boundaries.
 */
export const useGlobalDragCleanup = () => {
  const cleanupAll = useCallback(() => {
    return dragCleanupManager.cleanupAll();
  }, []);

  const forceCleanupAll = useCallback(() => {
    return dragCleanupManager.forceCleanupAll();
  }, []);

  const cleanupOlderThan = useCallback((maxAge: number) => {
    return dragCleanupManager.cleanupOlderThan(maxAge);
  }, []);

  const getStatistics = useCallback(() => {
    return dragCleanupManager.getStatistics();
  }, []);

  const getResourceDetails = useCallback(() => {
    return dragCleanupManager.getResourceDetails();
  }, []);

  return {
    cleanupAll,
    forceCleanupAll,
    cleanupOlderThan,
    getStatistics,
    getResourceDetails,
  };
};
