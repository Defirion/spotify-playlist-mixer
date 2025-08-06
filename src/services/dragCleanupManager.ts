/**
 * Drag Cleanup Manager Service
 *
 * This service provides comprehensive cleanup mechanisms for drag-and-drop operations.
 * It ensures that all timers, event listeners, animation frames, and other resources
 * are properly cleaned up to prevent memory leaks and stuck states.
 */

export interface CleanupResource {
  id: string;
  type:
    | 'timer'
    | 'interval'
    | 'animationFrame'
    | 'eventListener'
    | 'observer'
    | 'custom';
  cleanup: () => void;
  timestamp: number;
  component?: string;
  description?: string;
}

export interface EventListenerResource extends CleanupResource {
  type: 'eventListener';
  element: EventTarget;
  event: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

export interface TimerResource extends CleanupResource {
  type: 'timer' | 'interval';
  timerId: number;
}

export interface AnimationFrameResource extends CleanupResource {
  type: 'animationFrame';
  frameId: number;
}

export interface ObserverResource extends CleanupResource {
  type: 'observer';
  observer: MutationObserver | ResizeObserver | IntersectionObserver;
}

export interface CustomResource extends CleanupResource {
  type: 'custom';
  resource: any;
}

/**
 * Cleanup manager for drag-and-drop operations
 */
class DragCleanupManager {
  private resources = new Map<string, CleanupResource>();
  private componentResources = new Map<string, Set<string>>();
  private isCleaningUp = false;
  private cleanupCallbacks = new Set<() => void>();

  /**
   * Register a cleanup resource
   */
  register(resource: CleanupResource): string {
    this.resources.set(resource.id, resource);

    // Track by component if specified
    if (resource.component) {
      if (!this.componentResources.has(resource.component)) {
        this.componentResources.set(resource.component, new Set());
      }
      this.componentResources.get(resource.component)!.add(resource.id);
    }

    console.debug(
      `[DragCleanupManager] Registered ${resource.type} resource:`,
      {
        id: resource.id,
        type: resource.type,
        component: resource.component,
        description: resource.description,
      }
    );

    return resource.id;
  }

  /**
   * Register a timer (setTimeout)
   */
  registerTimer(
    timerId: number,
    component?: string,
    description?: string
  ): string {
    const id = `timer-${timerId}-${Date.now()}`;
    return this.register({
      id,
      type: 'timer',
      cleanup: () => clearTimeout(timerId),
      timestamp: Date.now(),
      component,
      description,
    } as TimerResource);
  }

  /**
   * Register an interval (setInterval)
   */
  registerInterval(
    intervalId: number,
    component?: string,
    description?: string
  ): string {
    const id = `interval-${intervalId}-${Date.now()}`;
    return this.register({
      id,
      type: 'interval',
      cleanup: () => clearInterval(intervalId),
      timestamp: Date.now(),
      component,
      description,
    } as TimerResource);
  }

  /**
   * Register an animation frame (requestAnimationFrame)
   */
  registerAnimationFrame(
    frameId: number,
    component?: string,
    description?: string
  ): string {
    const id = `frame-${frameId}-${Date.now()}`;
    return this.register({
      id,
      type: 'animationFrame',
      cleanup: () => cancelAnimationFrame(frameId),
      timestamp: Date.now(),
      component,
      description,
    } as AnimationFrameResource);
  }

  /**
   * Register an event listener
   */
  registerEventListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
    component?: string,
    description?: string
  ): string {
    const id = `listener-${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: 'eventListener',
      element,
      event,
      handler,
      options,
      cleanup: () => element.removeEventListener(event, handler, options),
      timestamp: Date.now(),
      component,
      description,
    } as EventListenerResource);
  }

  /**
   * Register an observer (MutationObserver, ResizeObserver, etc.)
   */
  registerObserver(
    observer: MutationObserver | ResizeObserver | IntersectionObserver,
    component?: string,
    description?: string
  ): string {
    const id = `observer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: 'observer',
      observer,
      cleanup: () => observer.disconnect(),
      timestamp: Date.now(),
      component,
      description,
    } as ObserverResource);
  }

  /**
   * Register a custom cleanup resource
   */
  registerCustom(
    resource: any,
    cleanup: () => void,
    component?: string,
    description?: string
  ): string {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: 'custom',
      resource,
      cleanup,
      timestamp: Date.now(),
      component,
      description,
    } as CustomResource);
  }

  /**
   * Unregister a specific resource
   */
  unregister(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    try {
      resource.cleanup();
      console.debug(`[DragCleanupManager] Cleaned up resource:`, {
        id: resourceId,
        type: resource.type,
        component: resource.component,
      });
    } catch (error) {
      console.error(
        `[DragCleanupManager] Error cleaning up resource ${resourceId}:`,
        error
      );
    }

    this.resources.delete(resourceId);

    // Remove from component tracking
    if (resource.component) {
      const componentSet = this.componentResources.get(resource.component);
      if (componentSet) {
        componentSet.delete(resourceId);
        if (componentSet.size === 0) {
          this.componentResources.delete(resource.component);
        }
      }
    }

    return true;
  }

  /**
   * Clean up all resources for a specific component
   */
  cleanupComponent(component: string): number {
    const resourceIds = this.componentResources.get(component);
    if (!resourceIds) {
      return 0;
    }

    let cleanedCount = 0;
    const idsToCleanup = Array.from(resourceIds); // Create copy to avoid modification during iteration

    for (const resourceId of idsToCleanup) {
      if (this.unregister(resourceId)) {
        cleanedCount++;
      }
    }

    console.log(
      `[DragCleanupManager] Cleaned up ${cleanedCount} resources for component: ${component}`
    );
    return cleanedCount;
  }

  /**
   * Clean up all registered resources
   */
  cleanupAll(): number {
    if (this.isCleaningUp) {
      console.warn(
        '[DragCleanupManager] Cleanup already in progress, skipping'
      );
      return 0;
    }

    this.isCleaningUp = true;
    let cleanedCount = 0;

    console.log(
      `[DragCleanupManager] Starting cleanup of ${this.resources.size} resources`
    );

    // Create a copy of resource IDs to avoid modification during iteration
    const resourceIds = Array.from(this.resources.keys());

    for (const resourceId of resourceIds) {
      try {
        if (this.unregister(resourceId)) {
          cleanedCount++;
        }
      } catch (error) {
        console.error(
          `[DragCleanupManager] Error during cleanup of resource ${resourceId}:`,
          error
        );
      }
    }

    // Execute cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[DragCleanupManager] Error in cleanup callback:', error);
      }
    }

    this.isCleaningUp = false;
    console.log(
      `[DragCleanupManager] Cleanup completed: ${cleanedCount} resources cleaned`
    );

    return cleanedCount;
  }

  /**
   * Clean up resources older than specified age (in milliseconds)
   */
  cleanupOlderThan(maxAge: number): number {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    const resourceIds = Array.from(this.resources.keys());

    for (const resourceId of resourceIds) {
      const resource = this.resources.get(resourceId);
      if (resource && resource.timestamp < cutoffTime) {
        if (this.unregister(resourceId)) {
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[DragCleanupManager] Cleaned up ${cleanedCount} resources older than ${maxAge}ms`
      );
    }

    return cleanedCount;
  }

  /**
   * Register a cleanup callback to be executed during cleanupAll
   */
  onCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);

    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Get statistics about registered resources
   */
  getStatistics(): {
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByComponent: Record<string, number>;
    oldestResource: number | null;
    newestResource: number | null;
  } {
    const resourcesByType: Record<string, number> = {};
    const resourcesByComponent: Record<string, number> = {};
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    for (const resource of this.resources.values()) {
      // Count by type
      resourcesByType[resource.type] =
        (resourcesByType[resource.type] || 0) + 1;

      // Count by component
      if (resource.component) {
        resourcesByComponent[resource.component] =
          (resourcesByComponent[resource.component] || 0) + 1;
      }

      // Track oldest and newest
      if (oldestTimestamp === null || resource.timestamp < oldestTimestamp) {
        oldestTimestamp = resource.timestamp;
      }
      if (newestTimestamp === null || resource.timestamp > newestTimestamp) {
        newestTimestamp = resource.timestamp;
      }
    }

    return {
      totalResources: this.resources.size,
      resourcesByType,
      resourcesByComponent,
      oldestResource: oldestTimestamp,
      newestResource: newestTimestamp,
    };
  }

  /**
   * Get detailed information about all resources (for debugging)
   */
  getResourceDetails(): CleanupResource[] {
    return Array.from(this.resources.values()).map(resource => ({
      id: resource.id,
      type: resource.type,
      timestamp: resource.timestamp,
      component: resource.component,
      description: resource.description,
      cleanup: resource.cleanup, // Include for debugging, but don't call it
    }));
  }

  /**
   * Check if cleanup manager is currently cleaning up
   */
  isCleaningUpResources(): boolean {
    return this.isCleaningUp;
  }

  /**
   * Force cleanup even if already in progress (emergency cleanup)
   */
  forceCleanupAll(): number {
    const wasCleaningUp = this.isCleaningUp;
    this.isCleaningUp = false; // Reset flag to allow cleanup

    console.warn('[DragCleanupManager] Force cleanup initiated');
    const result = this.cleanupAll();

    if (wasCleaningUp) {
      console.warn(
        '[DragCleanupManager] Force cleanup completed, previous cleanup was interrupted'
      );
    }

    return result;
  }
}

// Create singleton instance
export const dragCleanupManager = new DragCleanupManager();

// Export for testing
export { DragCleanupManager };
