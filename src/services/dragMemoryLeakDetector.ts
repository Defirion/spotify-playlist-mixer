/**
 * Drag Memory Leak Detector
 *
 * This service monitors for potential memory leaks in drag-and-drop operations
 * by tracking resource usage, detecting stuck states, and providing warnings
 * when cleanup may not be working properly.
 */

import { dragCleanupManager } from './dragCleanupManager';

export interface MemoryLeakWarning {
  type:
    | 'resource_accumulation'
    | 'stuck_drag_state'
    | 'old_resources'
    | 'excessive_listeners';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: number;
  suggestions: string[];
}

export interface MemoryUsageSnapshot {
  timestamp: number;
  totalResources: number;
  resourcesByType: Record<string, number>;
  resourcesByComponent: Record<string, number>;
  oldestResourceAge: number | null;
  averageResourceAge: number | null;
  isDragging: boolean;
  dragDuration: number | null;
}

class DragMemoryLeakDetector {
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private snapshots: MemoryUsageSnapshot[] = [];
  private warnings: MemoryLeakWarning[] = [];
  private maxSnapshots = 100;
  private maxWarnings = 50;
  private monitoringIntervalMs = 5000; // 5 seconds

  // Thresholds for warnings
  private thresholds = {
    maxTotalResources: 100,
    maxResourceAge: 60000, // 1 minute
    maxDragDuration: 30000, // 30 seconds
    resourceGrowthRate: 10, // resources per minute
    maxEventListeners: 50,
    maxTimers: 20,
    maxAnimationFrames: 10,
  };

  /**
   * Start monitoring for memory leaks
   */
  startMonitoring(intervalMs = this.monitoringIntervalMs): void {
    if (this.isMonitoring) {
      console.warn('[DragMemoryLeakDetector] Already monitoring');
      return;
    }

    this.monitoringIntervalMs = intervalMs;
    this.isMonitoring = true;

    console.log(
      `[DragMemoryLeakDetector] Starting monitoring (interval: ${intervalMs}ms)`
    );

    this.monitoringInterval = window.setInterval(() => {
      this.takeSnapshot();
      this.analyzeSnapshots();
    }, intervalMs);

    // Take initial snapshot
    this.takeSnapshot();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('[DragMemoryLeakDetector] Stopped monitoring');
  }

  /**
   * Take a snapshot of current memory usage
   */
  private takeSnapshot(): void {
    const stats = dragCleanupManager.getStatistics();
    const now = Date.now();

    // Calculate resource ages
    let oldestResourceAge: number | null = null;
    let totalAge = 0;
    let resourceCount = 0;

    if (stats.oldestResource) {
      oldestResourceAge = now - stats.oldestResource;
    }

    const resources = dragCleanupManager.getResourceDetails();
    for (const resource of resources) {
      const age = now - resource.timestamp;
      totalAge += age;
      resourceCount++;
    }

    const averageResourceAge =
      resourceCount > 0 ? totalAge / resourceCount : null;

    // Get drag state if available
    let isDragging = false;
    let dragDuration: number | null = null;

    if (typeof window !== 'undefined' && (window as any).__DRAG_STORE__) {
      try {
        const store = (window as any).__DRAG_STORE__;
        const state = store.getState();
        isDragging = state.isDragging || false;

        if (isDragging && state.dragStartTime) {
          dragDuration = now - state.dragStartTime;
        }
      } catch (error) {
        console.warn(
          '[DragMemoryLeakDetector] Error accessing drag state:',
          error
        );
      }
    }

    const snapshot: MemoryUsageSnapshot = {
      timestamp: now,
      totalResources: stats.totalResources,
      resourcesByType: stats.resourcesByType,
      resourcesByComponent: stats.resourcesByComponent,
      oldestResourceAge,
      averageResourceAge,
      isDragging,
      dragDuration,
    };

    this.snapshots.push(snapshot);

    // Keep snapshots within limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    console.debug('[DragMemoryLeakDetector] Snapshot taken:', snapshot);
  }

  /**
   * Analyze snapshots for potential memory leaks
   */
  private analyzeSnapshots(): void {
    if (this.snapshots.length < 2) {
      return;
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];

    // Check for resource accumulation
    this.checkResourceAccumulation(latest, previous);

    // Check for stuck drag state
    this.checkStuckDragState(latest);

    // Check for old resources
    this.checkOldResources(latest);

    // Check for excessive listeners
    this.checkExcessiveListeners(latest);

    // Check for resource growth rate
    this.checkResourceGrowthRate();
  }

  /**
   * Check for resource accumulation
   */
  private checkResourceAccumulation(
    latest: MemoryUsageSnapshot,
    previous: MemoryUsageSnapshot
  ): void {
    const resourceIncrease = latest.totalResources - previous.totalResources;

    if (latest.totalResources > this.thresholds.maxTotalResources) {
      this.addWarning({
        type: 'resource_accumulation',
        severity:
          latest.totalResources > this.thresholds.maxTotalResources * 2
            ? 'critical'
            : 'high',
        message: `High number of registered resources: ${latest.totalResources}`,
        details: {
          totalResources: latest.totalResources,
          resourcesByType: latest.resourcesByType,
          resourcesByComponent: latest.resourcesByComponent,
          increase: resourceIncrease,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check if components are properly cleaning up resources on unmount',
          'Look for components that register resources but never unregister them',
          'Consider reducing the number of simultaneous drag operations',
          'Review resource registration patterns in frequently used components',
        ],
      });
    }
  }

  /**
   * Check for stuck drag state
   */
  private checkStuckDragState(latest: MemoryUsageSnapshot): void {
    if (
      latest.isDragging &&
      latest.dragDuration &&
      latest.dragDuration > this.thresholds.maxDragDuration
    ) {
      this.addWarning({
        type: 'stuck_drag_state',
        severity:
          latest.dragDuration > this.thresholds.maxDragDuration * 2
            ? 'critical'
            : 'high',
        message: `Drag operation has been active for ${Math.round(latest.dragDuration / 1000)} seconds`,
        details: {
          dragDuration: latest.dragDuration,
          isDragging: latest.isDragging,
          timestamp: latest.timestamp,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check if drag end events are being properly handled',
          'Look for JavaScript errors that might prevent drag completion',
          'Verify that touch/mouse event handlers are working correctly',
          'Consider implementing automatic drag timeout mechanisms',
        ],
      });
    }
  }

  /**
   * Check for old resources
   */
  private checkOldResources(latest: MemoryUsageSnapshot): void {
    if (
      latest.oldestResourceAge &&
      latest.oldestResourceAge > this.thresholds.maxResourceAge
    ) {
      this.addWarning({
        type: 'old_resources',
        severity:
          latest.oldestResourceAge > this.thresholds.maxResourceAge * 2
            ? 'high'
            : 'medium',
        message: `Old resources detected (oldest: ${Math.round(latest.oldestResourceAge / 1000)} seconds)`,
        details: {
          oldestResourceAge: latest.oldestResourceAge,
          averageResourceAge: latest.averageResourceAge,
          totalResources: latest.totalResources,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check if cleanup is being called properly when components unmount',
          'Look for long-running operations that should be cleaned up',
          'Consider implementing periodic cleanup of old resources',
          'Review component lifecycle management',
        ],
      });
    }
  }

  /**
   * Check for excessive listeners
   */
  private checkExcessiveListeners(latest: MemoryUsageSnapshot): void {
    const eventListeners = latest.resourcesByType.eventListener || 0;
    const timers =
      (latest.resourcesByType.timer || 0) +
      (latest.resourcesByType.interval || 0);
    const animationFrames = latest.resourcesByType.animationFrame || 0;

    if (eventListeners > this.thresholds.maxEventListeners) {
      this.addWarning({
        type: 'excessive_listeners',
        severity:
          eventListeners > this.thresholds.maxEventListeners * 2
            ? 'high'
            : 'medium',
        message: `High number of event listeners: ${eventListeners}`,
        details: {
          eventListeners,
          resourcesByType: latest.resourcesByType,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check for event listeners that are not being removed',
          'Look for components that add multiple listeners for the same event',
          'Consider using event delegation instead of individual listeners',
          'Review event listener cleanup in component unmount handlers',
        ],
      });
    }

    if (timers > this.thresholds.maxTimers) {
      this.addWarning({
        type: 'excessive_listeners',
        severity: timers > this.thresholds.maxTimers * 2 ? 'high' : 'medium',
        message: `High number of active timers: ${timers}`,
        details: {
          timers,
          resourcesByType: latest.resourcesByType,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check for timers that are not being cleared',
          'Look for components that create multiple timers',
          'Consider using requestAnimationFrame instead of setTimeout for animations',
          'Review timer cleanup in component unmount handlers',
        ],
      });
    }

    if (animationFrames > this.thresholds.maxAnimationFrames) {
      this.addWarning({
        type: 'excessive_listeners',
        severity: 'medium',
        message: `High number of active animation frames: ${animationFrames}`,
        details: {
          animationFrames,
          resourcesByType: latest.resourcesByType,
        },
        timestamp: latest.timestamp,
        suggestions: [
          'Check for animation frames that are not being canceled',
          'Look for recursive animation frame calls that never end',
          'Consider throttling animation frame requests',
          'Review animation frame cleanup logic',
        ],
      });
    }
  }

  /**
   * Check resource growth rate
   */
  private checkResourceGrowthRate(): void {
    if (this.snapshots.length < 10) {
      return; // Need more data points
    }

    const recent = this.snapshots.slice(-10);
    const oldest = recent[0];
    const latest = recent[recent.length - 1];

    const timeDiff = latest.timestamp - oldest.timestamp;
    const resourceDiff = latest.totalResources - oldest.totalResources;

    if (timeDiff > 0 && resourceDiff > 0) {
      const growthRate = (resourceDiff / timeDiff) * 60000; // resources per minute

      if (growthRate > this.thresholds.resourceGrowthRate) {
        this.addWarning({
          type: 'resource_accumulation',
          severity:
            growthRate > this.thresholds.resourceGrowthRate * 2
              ? 'high'
              : 'medium',
          message: `High resource growth rate: ${growthRate.toFixed(1)} resources/minute`,
          details: {
            growthRate,
            resourceDiff,
            timeDiff,
            oldestSnapshot: oldest,
            latestSnapshot: latest,
          },
          timestamp: latest.timestamp,
          suggestions: [
            'Check for components that continuously register resources',
            'Look for memory leaks in drag operation handlers',
            'Consider implementing resource pooling or reuse',
            'Review component mounting/unmounting patterns',
          ],
        });
      }
    }
  }

  /**
   * Add a warning
   */
  private addWarning(warning: MemoryLeakWarning): void {
    // Check if we already have a similar recent warning
    const recentSimilar = this.warnings.filter(
      w => w.type === warning.type && w.timestamp > Date.now() - 30000
    ).length; // Last 30 seconds

    if (recentSimilar > 0) {
      return; // Don't spam similar warnings
    }

    this.warnings.push(warning);

    // Keep warnings within limit
    if (this.warnings.length > this.maxWarnings) {
      this.warnings.shift();
    }

    // Log warning
    const logLevel =
      warning.severity === 'critical'
        ? 'error'
        : warning.severity === 'high'
          ? 'warn'
          : 'info';

    console[logLevel](
      `[DragMemoryLeakDetector] ${warning.severity.toUpperCase()}: ${warning.message}`,
      {
        details: warning.details,
        suggestions: warning.suggestions,
      }
    );
  }

  /**
   * Get current warnings
   */
  getWarnings(
    severityFilter?: MemoryLeakWarning['severity']
  ): MemoryLeakWarning[] {
    if (severityFilter) {
      return this.warnings.filter(w => w.severity === severityFilter);
    }
    return [...this.warnings];
  }

  /**
   * Get recent snapshots
   */
  getSnapshots(count = 10): MemoryUsageSnapshot[] {
    return this.snapshots.slice(-count);
  }

  /**
   * Clear warnings
   */
  clearWarnings(): void {
    this.warnings = [];
    console.log('[DragMemoryLeakDetector] Warnings cleared');
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    console.log('[DragMemoryLeakDetector] Snapshots cleared');
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log(
      '[DragMemoryLeakDetector] Thresholds updated:',
      this.thresholds
    );
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    monitoringIntervalMs: number;
    snapshotCount: number;
    warningCount: number;
    thresholds: typeof this.thresholds;
    latestSnapshot: MemoryUsageSnapshot | null;
  } {
    return {
      isMonitoring: this.isMonitoring,
      monitoringIntervalMs: this.monitoringIntervalMs,
      snapshotCount: this.snapshots.length,
      warningCount: this.warnings.length,
      thresholds: this.thresholds,
      latestSnapshot:
        this.snapshots.length > 0
          ? this.snapshots[this.snapshots.length - 1]
          : null,
    };
  }

  /**
   * Generate a memory leak report
   */
  generateReport(): {
    summary: {
      monitoringDuration: number;
      totalSnapshots: number;
      totalWarnings: number;
      warningsBySeverity: Record<string, number>;
      currentResourceCount: number;
      isDragging: boolean;
    };
    warnings: MemoryLeakWarning[];
    recentSnapshots: MemoryUsageSnapshot[];
    recommendations: string[];
  } {
    const now = Date.now();
    const firstSnapshot = this.snapshots[0];
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];

    const monitoringDuration = firstSnapshot
      ? now - firstSnapshot.timestamp
      : 0;

    const warningsBySeverity = this.warnings.reduce(
      (acc, warning) => {
        acc[warning.severity] = (acc[warning.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const recommendations: string[] = [];

    if (this.warnings.some(w => w.type === 'resource_accumulation')) {
      recommendations.push(
        'Implement more aggressive resource cleanup strategies'
      );
    }

    if (this.warnings.some(w => w.type === 'stuck_drag_state')) {
      recommendations.push('Add automatic drag timeout mechanisms');
    }

    if (this.warnings.some(w => w.type === 'old_resources')) {
      recommendations.push('Implement periodic cleanup of old resources');
    }

    if (this.warnings.some(w => w.type === 'excessive_listeners')) {
      recommendations.push(
        'Review event listener management and cleanup patterns'
      );
    }

    return {
      summary: {
        monitoringDuration,
        totalSnapshots: this.snapshots.length,
        totalWarnings: this.warnings.length,
        warningsBySeverity,
        currentResourceCount: latestSnapshot?.totalResources || 0,
        isDragging: latestSnapshot?.isDragging || false,
      },
      warnings: this.warnings,
      recentSnapshots: this.getSnapshots(20),
      recommendations,
    };
  }
}

// Create singleton instance
export const dragMemoryLeakDetector = new DragMemoryLeakDetector();

// Export for testing
export { DragMemoryLeakDetector };
