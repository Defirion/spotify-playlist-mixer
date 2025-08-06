import { DragCleanupManager, dragCleanupManager } from '../dragCleanupManager';

// Mock console methods
const originalConsoleDebug = console.debug;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.debug = originalConsoleDebug;
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock timers and animation frames
const mockClearTimeout = jest.fn();
const mockClearInterval = jest.fn();
const mockCancelAnimationFrame = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  global.clearTimeout = mockClearTimeout;
  global.clearInterval = mockClearInterval;
  global.cancelAnimationFrame = mockCancelAnimationFrame;
});

describe('DragCleanupManager', () => {
  let manager: DragCleanupManager;

  beforeEach(() => {
    manager = new DragCleanupManager();
  });

  describe('timer registration and cleanup', () => {
    it('registers and cleans up timers', () => {
      const timerId = 123;
      const resourceId = manager.registerTimer(
        timerId,
        'test-component',
        'test timer'
      );

      expect(resourceId).toContain('timer-123');

      const stats = manager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.timer).toBe(1);
      expect(stats.resourcesByComponent['test-component']).toBe(1);

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockClearTimeout).toHaveBeenCalledWith(timerId);
    });

    it('registers and cleans up intervals', () => {
      const intervalId = 456;
      const resourceId = manager.registerInterval(
        intervalId,
        'test-component',
        'test interval'
      );

      expect(resourceId).toContain('interval-456');

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockClearInterval).toHaveBeenCalledWith(intervalId);
    });

    it('registers and cleans up animation frames', () => {
      const frameId = 789;
      const resourceId = manager.registerAnimationFrame(
        frameId,
        'test-component',
        'test frame'
      );

      expect(resourceId).toContain('frame-789');

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(frameId);
    });
  });

  describe('event listener registration and cleanup', () => {
    it('registers and cleans up event listeners', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as any;

      const mockHandler = jest.fn();
      const options = { passive: true };

      const resourceId = manager.registerEventListener(
        mockElement,
        'click',
        mockHandler,
        options,
        'test-component',
        'test listener'
      );

      expect(resourceId).toContain('listener-click');

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        mockHandler,
        options
      );
    });
  });

  describe('observer registration and cleanup', () => {
    it('registers and cleans up observers', () => {
      const mockObserver = {
        disconnect: jest.fn(),
      } as any;

      const resourceId = manager.registerObserver(
        mockObserver,
        'test-component',
        'test observer'
      );

      expect(resourceId).toContain('observer-');

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('custom resource registration and cleanup', () => {
    it('registers and cleans up custom resources', () => {
      const mockResource = { data: 'test' };
      const mockCleanup = jest.fn();

      const resourceId = manager.registerCustom(
        mockResource,
        mockCleanup,
        'test-component',
        'test custom'
      );

      expect(resourceId).toContain('custom-');

      const cleaned = manager.unregister(resourceId);
      expect(cleaned).toBe(true);
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('component-based cleanup', () => {
    it('cleans up all resources for a component', () => {
      const component = 'test-component';

      // Register multiple resources for the same component
      manager.registerTimer(1, component);
      manager.registerInterval(2, component);
      manager.registerAnimationFrame(3, component);

      const stats = manager.getStatistics();
      expect(stats.resourcesByComponent[component]).toBe(3);

      const cleanedCount = manager.cleanupComponent(component);
      expect(cleanedCount).toBe(3);

      const statsAfter = manager.getStatistics();
      expect(statsAfter.totalResources).toBe(0);
      expect(statsAfter.resourcesByComponent[component]).toBeUndefined();
    });

    it('handles component cleanup with no resources', () => {
      const cleanedCount = manager.cleanupComponent('nonexistent-component');
      expect(cleanedCount).toBe(0);
    });
  });

  describe('cleanup all resources', () => {
    it('cleans up all registered resources', () => {
      // Register various types of resources
      manager.registerTimer(1, 'comp1');
      manager.registerInterval(2, 'comp1');
      manager.registerAnimationFrame(3, 'comp2');

      const mockCleanup = jest.fn();
      manager.registerCustom({}, mockCleanup, 'comp2');

      const stats = manager.getStatistics();
      expect(stats.totalResources).toBe(4);

      const cleanedCount = manager.cleanupAll();
      expect(cleanedCount).toBe(4);

      const statsAfter = manager.getStatistics();
      expect(statsAfter.totalResources).toBe(0);

      expect(mockClearTimeout).toHaveBeenCalledWith(1);
      expect(mockClearInterval).toHaveBeenCalledWith(2);
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(3);
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('prevents concurrent cleanup operations', () => {
      manager.registerTimer(1);

      // Start cleanup
      const promise1 = Promise.resolve(manager.cleanupAll());
      const promise2 = Promise.resolve(manager.cleanupAll());

      return Promise.all([promise1, promise2]).then(([count1, count2]) => {
        // Only one cleanup should have actually run
        expect(count1 + count2).toBeLessThanOrEqual(1);
      });
    });

    it('executes cleanup callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.onCleanup(callback1);
      manager.onCleanup(callback2);

      manager.cleanupAll();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('cleanup by age', () => {
    it('cleans up resources older than specified age', async () => {
      // Register a resource
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const resourceId1 = manager.registerTimer(1, 'comp1');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Register another resource
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const resourceId2 = manager.registerTimer(2, 'comp1');

      const stats = manager.getStatistics();
      expect(stats.totalResources).toBe(2);

      // Clean up resources older than 5ms
      const cleanedCount = manager.cleanupOlderThan(5);
      expect(cleanedCount).toBe(1); // Only the first one should be cleaned

      const statsAfter = manager.getStatistics();
      expect(statsAfter.totalResources).toBe(1);
    });
  });

  describe('cleanup callbacks', () => {
    it('registers and unregisters cleanup callbacks', () => {
      const callback = jest.fn();
      const unregister = manager.onCleanup(callback);

      manager.cleanupAll();
      expect(callback).toHaveBeenCalled();

      callback.mockClear();
      unregister();

      manager.cleanupAll();
      expect(callback).not.toHaveBeenCalled();
    });

    it('handles errors in cleanup callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      manager.onCleanup(errorCallback);
      manager.onCleanup(normalCallback);

      // Should not throw even if callback throws
      expect(() => manager.cleanupAll()).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles cleanup errors gracefully', () => {
      const errorCleanup = jest.fn(() => {
        throw new Error('Cleanup error');
      });

      manager.registerCustom({}, errorCleanup, 'test-component');

      // Should not throw even if cleanup throws
      expect(() => manager.cleanupAll()).not.toThrow();

      expect(errorCleanup).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('returns false when unregistering nonexistent resource', () => {
      const result = manager.unregister('nonexistent-id');
      expect(result).toBe(false);
    });
  });

  describe('statistics and debugging', () => {
    it('provides accurate statistics', () => {
      manager.registerTimer(1, 'comp1');
      manager.registerTimer(2, 'comp1');
      manager.registerInterval(3, 'comp2');
      manager.registerAnimationFrame(4, 'comp2');

      const stats = manager.getStatistics();

      expect(stats.totalResources).toBe(4);
      expect(stats.resourcesByType.timer).toBe(2);
      expect(stats.resourcesByType.interval).toBe(1);
      expect(stats.resourcesByType.animationFrame).toBe(1);
      expect(stats.resourcesByComponent.comp1).toBe(2);
      expect(stats.resourcesByComponent.comp2).toBe(2);
      expect(stats.oldestResource).toBeGreaterThan(0);
      expect(stats.newestResource).toBeGreaterThan(0);
    });

    it('provides detailed resource information', () => {
      manager.registerTimer(1, 'comp1', 'test timer');

      const details = manager.getResourceDetails();
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        type: 'timer',
        component: 'comp1',
        description: 'test timer',
      });
    });
  });

  describe('force cleanup', () => {
    it('performs force cleanup even when already cleaning up', () => {
      manager.registerTimer(1);

      // Simulate cleanup in progress
      (manager as any).isCleaningUp = true;

      const cleanedCount = manager.forceCleanupAll();
      expect(cleanedCount).toBe(1);
      expect(mockClearTimeout).toHaveBeenCalledWith(1);
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton instance', () => {
      expect(dragCleanupManager).toBeInstanceOf(DragCleanupManager);
    });

    it('maintains state across calls', () => {
      dragCleanupManager.registerTimer(999, 'singleton-test');

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBeGreaterThan(0);

      // Clean up for other tests
      dragCleanupManager.cleanupAll();
    });
  });
});
