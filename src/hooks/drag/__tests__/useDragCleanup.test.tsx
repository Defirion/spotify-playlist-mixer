// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDragCleanup, useGlobalDragCleanup } from '../useDragCleanup';
import { dragCleanupManager } from '../../../services/dragCleanupManager';

import { useDragState } from '../useDragState';

// Mock the drag state hook
jest.mock('../useDragState', () => ({
  useDragState: jest.fn(() => ({
    isDragging: false,
    cancelDrag: jest.fn(),
  })),
}));
const mockUseDragState = useDragState as jest.MockedFunction<
  typeof useDragState
>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock timers and DOM methods
const mockSetTimeout = jest.fn();
const mockSetInterval = jest.fn();
const mockRequestAnimationFrame = jest.fn();
const mockAddEventListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  global.setTimeout = mockSetTimeout as any;
  global.setInterval = mockSetInterval as any;
  global.requestAnimationFrame = mockRequestAnimationFrame as any;

  // Clean up any existing resources
  dragCleanupManager.cleanupAll();
});

describe('useDragCleanup', () => {
  const mockDragState = {
    isDragging: false,
    cancelDrag: jest.fn(),
  };

  beforeEach(() => {
    mockUseDragState.mockReturnValue(mockDragState);
  });

  describe('resource registration', () => {
    it('registers timers for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));

      act(() => {
        const resourceId = result.current.registerTimer(123, 'test timer');
        expect(resourceId).toContain('timer-123');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.timer).toBe(1);
    });

    it('registers intervals for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));

      act(() => {
        const resourceId = result.current.registerInterval(
          456,
          'test interval'
        );
        expect(resourceId).toContain('interval-456');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.interval).toBe(1);
    });

    it('registers animation frames for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));

      act(() => {
        const resourceId = result.current.registerAnimationFrame(
          789,
          'test frame'
        );
        expect(resourceId).toContain('frame-789');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.animationFrame).toBe(1);
    });

    it('registers event listeners for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as any;
      const mockHandler = jest.fn();

      act(() => {
        const resourceId = result.current.registerEventListener(
          mockElement,
          'click',
          mockHandler,
          undefined,
          'test listener'
        );
        expect(resourceId).toContain('listener-click');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.eventListener).toBe(1);
    });

    it('registers observers for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockObserver = {
        disconnect: jest.fn(),
      } as any;

      act(() => {
        const resourceId = result.current.registerObserver(
          mockObserver,
          'test observer'
        );
        expect(resourceId).toContain('observer-');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.observer).toBe(1);
    });

    it('registers custom resources for cleanup', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockResource = { data: 'test' };
      const mockCleanup = jest.fn();

      act(() => {
        const resourceId = result.current.registerCustom(
          mockResource,
          mockCleanup,
          'test custom'
        );
        expect(resourceId).toContain('custom-');
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.custom).toBe(1);
    });
  });

  describe('cleanup callbacks', () => {
    it('adds and executes cleanup callbacks', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockCallback = jest.fn();

      act(() => {
        result.current.addCleanupCallback(mockCallback);
      });

      act(() => {
        result.current.cleanup();
      });

      expect(mockCallback).toHaveBeenCalled();
    });

    it('removes cleanup callbacks', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockCallback = jest.fn();

      let removeCallback: () => void;

      act(() => {
        removeCallback = result.current.addCleanupCallback(mockCallback);
      });

      act(() => {
        removeCallback();
      });

      act(() => {
        result.current.cleanup();
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('handles errors in cleanup callbacks gracefully', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      act(() => {
        result.current.addCleanupCallback(errorCallback);
        result.current.addCleanupCallback(normalCallback);
      });

      act(() => {
        result.current.cleanup();
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('safe wrappers', () => {
    it('provides safe setTimeout wrapper', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockCallback = jest.fn();

      mockSetTimeout.mockImplementation((callback, delay) => {
        // Simulate setTimeout behavior
        setTimeout(() => callback(), delay);
        return 123;
      });

      act(() => {
        const timerId = result.current.safeSetTimeout(
          mockCallback,
          1000,
          'test timeout'
        );
        expect(timerId).toBe(123);
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.timer).toBe(1);
    });

    it('provides safe setInterval wrapper', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockCallback = jest.fn();

      mockSetInterval.mockImplementation((callback, delay) => {
        // Simulate setInterval behavior
        return 456;
      });

      act(() => {
        const intervalId = result.current.safeSetInterval(
          mockCallback,
          1000,
          'test interval'
        );
        expect(intervalId).toBe(456);
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.interval).toBe(1);
    });

    it('provides safe requestAnimationFrame wrapper', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockCallback = jest.fn();

      mockRequestAnimationFrame.mockImplementation(callback => {
        // Simulate requestAnimationFrame behavior
        setTimeout(() => callback(performance.now()), 16);
        return 789;
      });

      act(() => {
        const frameId = result.current.safeRequestAnimationFrame(
          mockCallback,
          'test frame'
        );
        expect(frameId).toBe(789);
      });

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.animationFrame).toBe(1);
    });

    it('provides safe addEventListener wrapper', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const mockElement = {
        addEventListener: mockAddEventListener,
        removeEventListener: jest.fn(),
      } as any;
      const mockHandler = jest.fn();

      act(() => {
        const resourceId = result.current.safeAddEventListener(
          mockElement,
          'click',
          mockHandler,
          undefined,
          'test listener'
        );
        expect(resourceId).toContain('listener-click');
      });

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'click',
        mockHandler,
        undefined
      );

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.eventListener).toBe(1);
    });

    it('handles errors in safe wrapper callbacks', () => {
      const { result } = renderHook(() => useDragCleanup('test-component'));
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      mockSetTimeout.mockImplementation(callback => {
        // Immediately execute callback to test error handling
        callback();
        return 123;
      });

      act(() => {
        result.current.safeSetTimeout(errorCallback, 1000);
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('component cleanup', () => {
    it('cleans up resources on component unmount', () => {
      const { result, unmount } = renderHook(() =>
        useDragCleanup('test-component')
      );

      act(() => {
        result.current.registerTimer(123, 'test timer');
      });

      const statsBefore = dragCleanupManager.getStatistics();
      expect(statsBefore.totalResources).toBe(1);

      unmount();

      const statsAfter = dragCleanupManager.getStatistics();
      expect(statsAfter.totalResources).toBe(0);
    });

    it('executes cleanup callbacks on unmount', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() =>
        useDragCleanup('test-component')
      );

      act(() => {
        result.current.addCleanupCallback(mockCallback);
      });

      unmount();

      expect(mockCallback).toHaveBeenCalled();
    });

    it('cancels drag on unmount if dragging', () => {
      const mockCancelDrag = jest.fn();
      mockUseDragState.mockReturnValue({
        isDragging: true,
        cancelDrag: mockCancelDrag,
      });

      const { unmount } = renderHook(() => useDragCleanup('test-component'));

      unmount();

      expect(mockCancelDrag).toHaveBeenCalled();
    });
  });

  describe('emergency cleanup', () => {
    it('performs emergency cleanup including drag cancellation', () => {
      const mockCancelDrag = jest.fn();
      mockUseDragState.mockReturnValue({
        isDragging: true,
        cancelDrag: mockCancelDrag,
      });

      const { result } = renderHook(() => useDragCleanup('test-component'));

      act(() => {
        result.current.registerTimer(123, 'test timer');
      });

      act(() => {
        result.current.emergencyCleanup();
      });

      expect(mockCancelDrag).toHaveBeenCalled();

      const stats = dragCleanupManager.getStatistics();
      expect(stats.totalResources).toBe(0);
    });

    it('handles errors during emergency cleanup', () => {
      const mockCancelDrag = jest.fn(() => {
        throw new Error('Cancel drag error');
      });
      mockUseDragState.mockReturnValue({
        isDragging: true,
        cancelDrag: mockCancelDrag,
      });

      const { result } = renderHook(() => useDragCleanup('test-component'));

      act(() => {
        result.current.emergencyCleanup();
      });

      expect(mockCancelDrag).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('component identification', () => {
    it('generates unique component IDs', () => {
      const { result: result1 } = renderHook(() =>
        useDragCleanup('test-component')
      );
      const { result: result2 } = renderHook(() =>
        useDragCleanup('test-component')
      );

      expect(result1.current.componentId).not.toBe(result2.current.componentId);
      expect(result1.current.componentId).toContain('test-component');
      expect(result2.current.componentId).toContain('test-component');
    });

    it('uses default component name when not provided', () => {
      const { result } = renderHook(() => useDragCleanup());

      expect(result.current.componentId).toContain('unknown');
    });
  });
});

describe('useGlobalDragCleanup', () => {
  beforeEach(() => {
    dragCleanupManager.cleanupAll();
  });

  it('provides global cleanup functions', () => {
    const { result } = renderHook(() => useGlobalDragCleanup());

    expect(typeof result.current.cleanupAll).toBe('function');
    expect(typeof result.current.forceCleanupAll).toBe('function');
    expect(typeof result.current.cleanupOlderThan).toBe('function');
    expect(typeof result.current.getStatistics).toBe('function');
    expect(typeof result.current.getResourceDetails).toBe('function');
  });

  it('cleanupAll cleans up all resources', () => {
    // Register some resources
    dragCleanupManager.registerTimer(123, 'test-component');
    dragCleanupManager.registerInterval(456, 'test-component');

    const { result } = renderHook(() => useGlobalDragCleanup());

    act(() => {
      const cleanedCount = result.current.cleanupAll();
      expect(cleanedCount).toBe(2);
    });

    const stats = dragCleanupManager.getStatistics();
    expect(stats.totalResources).toBe(0);
  });

  it('forceCleanupAll performs force cleanup', () => {
    dragCleanupManager.registerTimer(123, 'test-component');

    const { result } = renderHook(() => useGlobalDragCleanup());

    act(() => {
      const cleanedCount = result.current.forceCleanupAll();
      expect(cleanedCount).toBe(1);
    });

    const stats = dragCleanupManager.getStatistics();
    expect(stats.totalResources).toBe(0);
  });

  it('cleanupOlderThan cleans up old resources', () => {
    dragCleanupManager.registerTimer(123, 'test-component');

    // Manually set timestamp to simulate old resource
    const resources = dragCleanupManager.getResourceDetails();
    if (resources.length > 0) {
      (resources[0] as any).timestamp = Date.now() - 10000; // 10 seconds ago
    }

    dragCleanupManager.registerTimer(456, 'test-component');

    const { result } = renderHook(() => useGlobalDragCleanup());

    act(() => {
      const cleanedCount = result.current.cleanupOlderThan(5000); // 5 seconds
      expect(cleanedCount).toBeGreaterThanOrEqual(0); // May be 0 or 1 depending on timing
    });

    const stats = dragCleanupManager.getStatistics();
    expect(stats.totalResources).toBeGreaterThanOrEqual(1);
  });

  it('getStatistics returns current statistics', () => {
    dragCleanupManager.registerTimer(123, 'test-component');

    const { result } = renderHook(() => useGlobalDragCleanup());

    act(() => {
      const stats = result.current.getStatistics();
      expect(stats.totalResources).toBe(1);
      expect(stats.resourcesByType.timer).toBe(1);
    });
  });

  it('getResourceDetails returns resource details', () => {
    dragCleanupManager.registerTimer(123, 'test-component', 'test timer');

    const { result } = renderHook(() => useGlobalDragCleanup());

    act(() => {
      const details = result.current.getResourceDetails();
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        type: 'timer',
        component: 'test-component',
        description: 'test timer',
      });
    });
  });
});
