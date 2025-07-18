import { MemoryManager, memoryManager } from '../MemoryManager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    // Create a fresh instance for each test
    manager = MemoryManager.getInstance();
    
    // Clear any existing memory tracking
    (manager as any).memoryUsage.clear();
    
    // Mock window events
    global.window = {
      dispatchEvent: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MemoryManager.getInstance();
      const instance2 = MemoryManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should export a global instance', () => {
      expect(memoryManager).toBeInstanceOf(MemoryManager);
      expect(memoryManager).toBe(MemoryManager.getInstance());
    });
  });

  describe('trackMemoryUsage', () => {
    it('should track memory usage for a key', () => {
      manager.trackMemoryUsage('test-key', 1024);
      
      expect(manager.getCurrentUsageMB()).toBeCloseTo(1024 / (1024 * 1024), 6);
    });

    it('should update existing memory usage', () => {
      manager.trackMemoryUsage('test-key', 1024);
      manager.trackMemoryUsage('test-key', 2048);
      
      expect(manager.getCurrentUsageMB()).toBeCloseTo(2048 / (1024 * 1024), 6);
    });

    it('should track multiple keys', () => {
      manager.trackMemoryUsage('key1', 1024);
      manager.trackMemoryUsage('key2', 2048);
      
      expect(manager.getCurrentUsageMB()).toBeCloseTo(3072 / (1024 * 1024), 6);
    });

    it('should trigger cleanup when threshold is exceeded', () => {
      const cleanupSpy = jest.spyOn(manager as any, 'performCleanup');
      
      // Track memory that exceeds 80% of 100MB limit (80MB)
      manager.trackMemoryUsage('large-key', 85 * 1024 * 1024); // 85MB
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('releaseMemory', () => {
    it('should release memory for a key', () => {
      manager.trackMemoryUsage('test-key', 1024);
      expect(manager.getCurrentUsageMB()).toBeGreaterThan(0);
      
      manager.releaseMemory('test-key');
      expect(manager.getCurrentUsageMB()).toBe(0);
    });

    it('should handle releasing non-existent keys gracefully', () => {
      expect(() => manager.releaseMemory('non-existent')).not.toThrow();
    });
  });

  describe('getCurrentUsageMB', () => {
    it('should return zero when no memory is tracked', () => {
      expect(manager.getCurrentUsageMB()).toBe(0);
    });

    it('should calculate total usage correctly', () => {
      manager.trackMemoryUsage('key1', 1024 * 1024); // 1MB
      manager.trackMemoryUsage('key2', 2 * 1024 * 1024); // 2MB
      
      expect(manager.getCurrentUsageMB()).toBeCloseTo(3, 6);
    });

    it('should handle fractional MB correctly', () => {
      manager.trackMemoryUsage('small-key', 512 * 1024); // 0.5MB
      
      expect(manager.getCurrentUsageMB()).toBeCloseTo(0.5, 6);
    });
  });

  describe('cleanup behavior', () => {
    it('should not cleanup when under threshold', () => {
      const cleanupSpy = jest.spyOn(manager as any, 'performCleanup');
      
      // Track memory under threshold (less than 80MB)
      manager.trackMemoryUsage('small-key', 10 * 1024 * 1024); // 10MB
      
      expect(cleanupSpy).not.toHaveBeenCalled();
    });

    it('should cleanup largest items first', () => {
      // Add items of different sizes
      manager.trackMemoryUsage('small', 1 * 1024 * 1024);   // 1MB
      manager.trackMemoryUsage('medium', 5 * 1024 * 1024);  // 5MB
      manager.trackMemoryUsage('large', 10 * 1024 * 1024);  // 10MB
      
      // Trigger cleanup by adding large item
      manager.trackMemoryUsage('trigger', 85 * 1024 * 1024); // 85MB
      
      // Large item should be cleaned up first
      const stats = manager.getMemoryStats();
      expect(stats.usage).toBeLessThan(100);
    });

    it('should clean down to 50% of limit', () => {
      // Fill memory to trigger cleanup
      manager.trackMemoryUsage('item1', 30 * 1024 * 1024);
      manager.trackMemoryUsage('item2', 30 * 1024 * 1024);
      manager.trackMemoryUsage('item3', 30 * 1024 * 1024);
      
      // Should clean down to ~50MB
      expect(manager.getCurrentUsageMB()).toBeLessThanOrEqual(50);
    });

    it('should dispatch cleanup events', () => {
      manager.trackMemoryUsage('item1', 50 * 1024 * 1024);
      manager.trackMemoryUsage('item2', 40 * 1024 * 1024); // This should trigger cleanup
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'memory-cleanup',
          detail: expect.objectContaining({
            key: expect.any(String)
          })
        })
      );
    });

    it('should handle cleanup when window is not available', () => {
      // Remove window object
      delete (global as any).window;
      
      expect(() => {
        manager.trackMemoryUsage('large-item', 90 * 1024 * 1024);
      }).not.toThrow();
    });
  });

  describe('getMemoryStats', () => {
    it('should return correct statistics', () => {
      manager.trackMemoryUsage('key1', 10 * 1024 * 1024); // 10MB
      manager.trackMemoryUsage('key2', 5 * 1024 * 1024);  // 5MB
      
      const stats = manager.getMemoryStats();
      
      expect(stats.usage).toBeCloseTo(15, 1);
      expect(stats.limit).toBe(100);
      expect(stats.entries).toBe(2);
    });

    it('should return zero stats when empty', () => {
      const stats = manager.getMemoryStats();
      
      expect(stats.usage).toBe(0);
      expect(stats.limit).toBe(100);
      expect(stats.entries).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero-size memory tracking', () => {
      manager.trackMemoryUsage('zero-key', 0);
      
      expect(manager.getCurrentUsageMB()).toBe(0);
      expect(manager.getMemoryStats().entries).toBe(1);
    });

    it('should handle negative memory values', () => {
      manager.trackMemoryUsage('negative-key', -1024);
      
      // Should still track the entry but with negative contribution
      expect(manager.getCurrentUsageMB()).toBeLessThan(0);
    });

    it('should handle very large memory values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      
      expect(() => {
        manager.trackMemoryUsage('huge-key', largeValue);
      }).not.toThrow();
    });

    it('should handle many small entries', () => {
      // Add 1000 small entries
      for (let i = 0; i < 1000; i++) {
        manager.trackMemoryUsage(`small-${i}`, 1024); // 1KB each
      }
      
      expect(manager.getMemoryStats().entries).toBe(1000);
      expect(manager.getCurrentUsageMB()).toBeCloseTo(1000 / 1024, 2); // ~1MB total
    });

    it('should handle rapid memory tracking', () => {
      const startTime = Date.now();
      
      // Rapidly track memory
      for (let i = 0; i < 100; i++) {
        manager.trackMemoryUsage(`rapid-${i}`, 1024 * 1024);
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(manager.getMemoryStats().entries).toBeGreaterThan(0);
    });
  });

  describe('cleanup threshold behavior', () => {
    it('should use correct cleanup threshold', () => {
      const cleanupSpy = jest.spyOn(manager as any, 'shouldCleanup');
      
      // Just under threshold (79MB)
      manager.trackMemoryUsage('under-threshold', 79 * 1024 * 1024);
      expect(cleanupSpy).toHaveReturnedWith(false);
      
      // Just over threshold (81MB)
      manager.trackMemoryUsage('over-threshold', 81 * 1024 * 1024);
      expect(cleanupSpy).toHaveReturnedWith(true);
    });

    it('should handle exactly at threshold', () => {
      const cleanupSpy = jest.spyOn(manager as any, 'performCleanup');
      
      // Exactly at threshold (80MB)
      manager.trackMemoryUsage('at-threshold', 80 * 1024 * 1024);
      
      expect(cleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('memory leak prevention', () => {
    it('should prevent unlimited memory growth', () => {
      // Continuously add memory
      for (let i = 0; i < 20; i++) {
        manager.trackMemoryUsage(`item-${i}`, 10 * 1024 * 1024); // 10MB each
      }
      
      // Should not exceed reasonable limits due to cleanup
      expect(manager.getCurrentUsageMB()).toBeLessThan(150); // Some buffer for cleanup
    });

    it('should maintain reasonable number of entries', () => {
      // Add many entries
      for (let i = 0; i < 1000; i++) {
        manager.trackMemoryUsage(`entry-${i}`, 100 * 1024); // 100KB each
      }
      
      const stats = manager.getMemoryStats();
      expect(stats.entries).toBeLessThan(1000); // Should have cleaned up some
    });
  });
});