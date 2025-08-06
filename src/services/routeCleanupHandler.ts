import { dragCleanupManager } from './dragCleanupManager';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dragErrorRecoveryService } from './dragErrorRecovery';

/**
 * Route Change Cleanup Handler
 *
 * This service handles cleanup operations when the user navigates to different
 * routes or when the application state changes significantly. It ensures that
 * drag operations are properly terminated and resources are cleaned up to
 * prevent memory leaks and stuck states across route changes.
 */

export interface RouteChangeCleanupOptions {
  cleanupDragState?: boolean;
  cleanupResources?: boolean;
  cancelActiveOperations?: boolean;
  resetVisualFeedback?: boolean;
  logCleanup?: boolean;
}

class RouteCleanupHandler {
  private isInitialized = false;
  private cleanupOptions: RouteChangeCleanupOptions = {
    cleanupDragState: true,
    cleanupResources: true,
    cancelActiveOperations: true,
    resetVisualFeedback: true,
    logCleanup: true,
  };

  private originalPushState: typeof window.history.pushState;
  private originalReplaceState: typeof window.history.replaceState;
  private currentPath: string;

  constructor() {
    this.originalPushState = window.history.pushState.bind(window.history);
    this.originalReplaceState = window.history.replaceState.bind(
      window.history
    );
    this.currentPath = window.location.pathname;
  }

  /**
   * Initialize route change monitoring
   */
  initialize(options: Partial<RouteChangeCleanupOptions> = {}): void {
    if (this.isInitialized) {
      console.warn('[RouteCleanupHandler] Already initialized');
      return;
    }

    this.cleanupOptions = { ...this.cleanupOptions, ...options };
    this.setupRouteChangeDetection();
    this.setupBeforeUnloadHandler();
    this.setupVisibilityChangeHandler();

    this.isInitialized = true;

    if (this.cleanupOptions.logCleanup) {
      console.log(
        '[RouteCleanupHandler] Initialized with options:',
        this.cleanupOptions
      );
    }
  }

  /**
   * Cleanup and destroy the route handler
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    // Restore original history methods
    window.history.pushState = this.originalPushState;
    window.history.replaceState = this.originalReplaceState;

    // Remove event listeners
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );

    this.isInitialized = false;

    if (this.cleanupOptions.logCleanup) {
      console.log('[RouteCleanupHandler] Destroyed');
    }
  }

  /**
   * Setup route change detection
   */
  private setupRouteChangeDetection(): void {
    // Override window.history.pushState
    window.history.pushState = (
      state: any,
      title: string,
      url?: string | URL | null
    ) => {
      const oldPath = this.currentPath;
      this.originalPushState(state, title, url);
      const newPath = window.location.pathname;

      if (oldPath !== newPath) {
        this.handleRouteChange(oldPath, newPath, 'pushState');
      }

      this.currentPath = newPath;
    };

    // Override window.history.replaceState
    window.history.replaceState = (
      state: any,
      title: string,
      url?: string | URL | null
    ) => {
      const oldPath = this.currentPath;
      this.originalReplaceState(state, title, url);
      const newPath = window.location.pathname;

      if (oldPath !== newPath) {
        this.handleRouteChange(oldPath, newPath, 'replaceState');
      }

      this.currentPath = newPath;
    };

    // Handle browser back/forward buttons
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Setup beforeunload handler for page refresh/close
   */
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Setup visibility change handler for tab switching
   */
  private setupVisibilityChangeHandler(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle popstate events (back/forward navigation)
   */
  private handlePopState = (event: PopStateEvent): void => {
    const oldPath = this.currentPath;
    const newPath = window.location.pathname;

    if (oldPath !== newPath) {
      this.handleRouteChange(oldPath, newPath, 'popstate');
    }

    this.currentPath = newPath;
  };

  /**
   * Handle beforeunload events (page refresh/close)
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    this.performCleanup('beforeunload');
  };

  /**
   * Handle visibility change events (tab switching)
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.performCleanup('visibilitychange');
    }
  };

  /**
   * Handle route changes
   */
  private handleRouteChange(
    oldPath: string,
    newPath: string,
    trigger: string
  ): void {
    if (this.cleanupOptions.logCleanup) {
      console.log(`[RouteCleanupHandler] Route change detected:`, {
        from: oldPath,
        to: newPath,
        trigger,
        timestamp: Date.now(),
      });
    }

    this.performCleanup(trigger, { oldPath, newPath });
  }

  /**
   * Perform cleanup operations
   */
  private performCleanup(
    trigger: string,
    context: { oldPath?: string; newPath?: string } = {}
  ): void {
    const startTime = Date.now();
    let cleanupResults: any = {};

    try {
      if (this.cleanupOptions.logCleanup) {
        console.log(
          `[RouteCleanupHandler] Starting cleanup due to: ${trigger}`,
          context
        );
      }

      // Cancel active drag operations
      if (this.cleanupOptions.cancelActiveOperations) {
        cleanupResults.dragStateCanceled = this.cancelActiveDragOperations();
      }

      // Reset visual feedback
      if (this.cleanupOptions.resetVisualFeedback) {
        cleanupResults.visualFeedbackReset = this.resetVisualFeedback();
      }

      // Clean up registered resources
      if (this.cleanupOptions.cleanupResources) {
        cleanupResults.resourcesCleaned = this.cleanupRegisteredResources();
      }

      // Clean up drag state
      if (this.cleanupOptions.cleanupDragState) {
        cleanupResults.dragStateCleared = this.clearDragState();
      }

      const duration = Date.now() - startTime;

      if (this.cleanupOptions.logCleanup) {
        console.log(
          `[RouteCleanupHandler] Cleanup completed in ${duration}ms:`,
          {
            trigger,
            context,
            results: cleanupResults,
          }
        );
      }
    } catch (error) {
      console.error(`[RouteCleanupHandler] Error during cleanup:`, {
        trigger,
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Attempt emergency cleanup
      try {
        this.emergencyCleanup();
      } catch (emergencyError) {
        console.error(
          '[RouteCleanupHandler] Emergency cleanup also failed:',
          emergencyError
        );
      }
    }
  }

  /**
   * Cancel active drag operations
   */
  private cancelActiveDragOperations(): boolean {
    try {
      // Check if there's an active drag operation
      if (typeof window !== 'undefined' && (window as any).__DRAG_STORE__) {
        const store = (window as any).__DRAG_STORE__;
        const state = store.getState();

        if (state.isDragging) {
          console.log('[RouteCleanupHandler] Canceling active drag operation');
          state.cancelDrag();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Error canceling drag operations:',
        error
      );
      return false;
    }
  }

  /**
   * Reset visual feedback
   */
  private resetVisualFeedback(): boolean {
    try {
      // Reset body styles that might be stuck from drag operations
      document.body.classList.remove('no-user-select', 'drag-active');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';

      // Cancel any active animation frames
      if (typeof window !== 'undefined' && (window as any).__AUTO_SCROLL_ID__) {
        cancelAnimationFrame((window as any).__AUTO_SCROLL_ID__);
        delete (window as any).__AUTO_SCROLL_ID__;
      }

      return true;
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Error resetting visual feedback:',
        error
      );
      return false;
    }
  }

  /**
   * Clean up registered resources
   */
  private cleanupRegisteredResources(): number {
    try {
      return dragCleanupManager.cleanupAll();
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Error cleaning up resources:',
        error
      );
      return 0;
    }
  }

  /**
   * Clear drag state
   */
  private clearDragState(): boolean {
    try {
      if (typeof window !== 'undefined' && (window as any).__DRAG_STORE__) {
        const store = (window as any).__DRAG_STORE__;
        const state = store.getState();

        // Clear scroll position
        if (state.clearScrollPosition) {
          state.clearScrollPosition();
        }

        // Cancel any active drag
        if (state.isDragging && state.cancelDrag) {
          state.cancelDrag();
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('[RouteCleanupHandler] Error clearing drag state:', error);
      return false;
    }
  }

  /**
   * Emergency cleanup when normal cleanup fails
   */
  private emergencyCleanup(): void {
    console.warn('[RouteCleanupHandler] Performing emergency cleanup');

    try {
      // Force cleanup all resources
      dragCleanupManager.forceCleanupAll();
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Emergency resource cleanup failed:',
        error
      );
    }

    try {
      // Force reset visual feedback
      document.body.className = '';
      document.body.style.cssText = '';
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Emergency visual reset failed:',
        error
      );
    }

    try {
      // Clear any global drag references
      if (typeof window !== 'undefined') {
        delete (window as any).__AUTO_SCROLL_ID__;
        delete (window as any).__DRAG_ACTIVE__;
      }
    } catch (error) {
      console.error(
        '[RouteCleanupHandler] Emergency global cleanup failed:',
        error
      );
    }
  }

  /**
   * Get cleanup statistics
   */
  getStatistics(): {
    isInitialized: boolean;
    currentPath: string;
    cleanupOptions: RouteChangeCleanupOptions;
    resourceStatistics: ReturnType<typeof dragCleanupManager.getStatistics>;
  } {
    return {
      isInitialized: this.isInitialized,
      currentPath: this.currentPath,
      cleanupOptions: this.cleanupOptions,
      resourceStatistics: dragCleanupManager.getStatistics(),
    };
  }

  /**
   * Update cleanup options
   */
  updateOptions(options: Partial<RouteChangeCleanupOptions>): void {
    this.cleanupOptions = { ...this.cleanupOptions, ...options };

    if (this.cleanupOptions.logCleanup) {
      console.log(
        '[RouteCleanupHandler] Options updated:',
        this.cleanupOptions
      );
    }
  }

  /**
   * Manually trigger cleanup
   */
  manualCleanup(reason = 'manual'): void {
    this.performCleanup(reason);
  }
}

// Create singleton instance
export const routeCleanupHandler = new RouteCleanupHandler();

// Export for testing
export { RouteCleanupHandler };
