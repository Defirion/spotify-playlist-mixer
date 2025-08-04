import { renderHook, act } from '@testing-library/react';
import { useAppStore, useDragState, useScrollPosition } from '../../index';
import { DraggedItem } from '../../../types/dragAndDrop';

// Mock console methods to avoid noise in tests
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
});

describe('DragSlice', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      isDragging: false,
      draggedItem: null,
      dragStartTime: null,
      scrollTop: null,
    });
  });

  describe('Drag State Management', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dragStartTime).toBeNull();
    });

    it('should start drag operation successfully', () => {
      const { result } = renderHook(() => useDragState());

      const testDragItem: DraggedItem<'internal-track'> = {
        id: 'test-track-1',
        type: 'internal-track',
        payload: {
          track: { id: 'track-1' } as any,
          index: 0,
        },
        timestamp: Date.now(),
      };

      act(() => {
        result.current.startDrag(testDragItem);
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem).toEqual(testDragItem);
      expect(result.current.dragStartTime).toBeGreaterThan(0);
    });

    it('should prevent concurrent drag operations', () => {
      const { result } = renderHook(() => useDragState());

      const firstDragItem: DraggedItem<'internal-track'> = {
        id: 'test-track-1',
        type: 'internal-track',
        payload: {
          track: { id: 'track-1' } as any,
          index: 0,
        },
        timestamp: Date.now(),
      };

      const secondDragItem: DraggedItem<'modal-track'> = {
        id: 'test-track-2',
        type: 'modal-track',
        payload: {
          track: { id: 'track-2' } as any,
          source: 'modal',
        },
        timestamp: Date.now(),
      };

      act(() => {
        result.current.startDrag(firstDragItem);
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem).toEqual(firstDragItem);

      // Attempt to start second drag should be prevented
      act(() => {
        result.current.startDrag(secondDragItem);
      });

      expect(result.current.draggedItem).toEqual(firstDragItem); // Should still be first item
      expect(console.warn).toHaveBeenCalledWith(
        '[DragSlice] Attempted to start drag while already dragging',
        expect.any(Object)
      );
    });

    it('should end drag operation successfully', () => {
      const { result } = renderHook(() => useDragState());

      const testDragItem: DraggedItem<'internal-track'> = {
        id: 'test-track-1',
        type: 'internal-track',
        payload: {
          track: { id: 'track-1' } as any,
          index: 0,
        },
        timestamp: Date.now(),
      };

      act(() => {
        result.current.startDrag(testDragItem);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.endDrag();
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dragStartTime).toBeNull();
    });

    it('should cancel drag operation successfully', () => {
      const { result } = renderHook(() => useDragState());

      const testDragItem: DraggedItem<'search-track'> = {
        id: 'test-track-1',
        type: 'search-track',
        payload: {
          track: { id: 'track-1' } as any,
          query: 'test query',
        },
        timestamp: Date.now(),
      };

      act(() => {
        result.current.startDrag(testDragItem);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.cancelDrag();
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dragStartTime).toBeNull();
    });

    it('should handle invalid drag items', () => {
      const { result } = renderHook(() => useDragState());

      act(() => {
        result.current.startDrag(null as any);
      });

      expect(result.current.isDragging).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[DragSlice] Invalid drag item provided',
        expect.any(Object)
      );
    });
  });

  describe('Scroll Position Management', () => {
    it('should initialize with null scroll position', () => {
      const { result } = renderHook(() => useScrollPosition());

      expect(result.current.scrollTop).toBeNull();
    });

    it('should capture scroll position successfully', () => {
      const { result } = renderHook(() => useScrollPosition());

      const mockContainer = {
        scrollTop: 150,
        clientHeight: 400,
        scrollHeight: 1000,
      } as HTMLElement;

      act(() => {
        result.current.captureScrollPosition(mockContainer);
      });

      expect(result.current.scrollTop).toBe(150);
    });

    it('should restore scroll position successfully', () => {
      const { result } = renderHook(() => useScrollPosition());

      const mockContainer = {
        scrollTop: 0,
        clientHeight: 400,
        scrollHeight: 1000,
      } as HTMLElement;

      // First capture a scroll position
      act(() => {
        result.current.captureScrollPosition({
          ...mockContainer,
          scrollTop: 150,
        } as HTMLElement);
      });

      expect(result.current.scrollTop).toBe(150);

      // Then restore it
      act(() => {
        result.current.restoreScrollPosition(mockContainer);
      });

      expect(mockContainer.scrollTop).toBe(150);
      expect(result.current.scrollTop).toBeNull(); // Should be cleared after restore
    });

    it('should handle null container gracefully', () => {
      const { result } = renderHook(() => useScrollPosition());

      act(() => {
        result.current.captureScrollPosition(null as any);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[DragSlice] Cannot capture scroll position: container is null',
        expect.any(Object)
      );

      act(() => {
        result.current.restoreScrollPosition(null as any);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[DragSlice] Cannot restore scroll position: container is null',
        expect.any(Object)
      );
    });

    it('should clear scroll position', () => {
      const { result } = renderHook(() => useScrollPosition());

      // First set a scroll position
      const mockContainer = {
        scrollTop: 150,
        clientHeight: 400,
        scrollHeight: 1000,
      } as HTMLElement;

      act(() => {
        result.current.captureScrollPosition(mockContainer);
      });

      expect(result.current.scrollTop).toBe(150);

      // Then clear it
      act(() => {
        result.current.clearScrollPosition();
      });

      expect(result.current.scrollTop).toBeNull();
    });

    it('should clamp scroll position to valid range', () => {
      const { result } = renderHook(() => useScrollPosition());

      const mockContainer = {
        scrollTop: 0,
        clientHeight: 400,
        scrollHeight: 800, // Max scroll = 800 - 400 = 400
      } as HTMLElement;

      // Capture a scroll position that exceeds the maximum
      act(() => {
        result.current.captureScrollPosition({
          ...mockContainer,
          scrollTop: 500, // Exceeds max of 400
        } as HTMLElement);
      });

      act(() => {
        result.current.restoreScrollPosition(mockContainer);
      });

      expect(mockContainer.scrollTop).toBe(400); // Should be clamped to max
    });
  });

  describe('Error Handling', () => {
    it('should warn when ending drag when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      act(() => {
        result.current.endDrag();
      });

      expect(console.warn).toHaveBeenCalledWith(
        '[DragSlice] Attempted to end drag when not dragging',
        expect.any(Object)
      );
    });

    it('should warn when canceling drag when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      act(() => {
        result.current.cancelDrag();
      });

      expect(console.warn).toHaveBeenCalledWith(
        '[DragSlice] Attempted to cancel drag when not dragging',
        expect.any(Object)
      );
    });

    it('should handle scroll position restoration errors', () => {
      const { result } = renderHook(() => useScrollPosition());

      // Mock container that throws error when setting scrollTop
      const mockContainer = {
        scrollTop: 0,
        clientHeight: 400,
        scrollHeight: 1000,
      } as HTMLElement;

      Object.defineProperty(mockContainer, 'scrollTop', {
        set: () => {
          throw new Error('Test error');
        },
        get: () => 0,
      });

      // First capture a scroll position
      act(() => {
        result.current.captureScrollPosition({
          scrollTop: 150,
          clientHeight: 400,
          scrollHeight: 1000,
        } as HTMLElement);
      });

      // Then try to restore it (should handle error)
      act(() => {
        result.current.restoreScrollPosition(mockContainer);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[DragSlice] Error restoring scroll position',
        expect.any(Object)
      );
      expect(result.current.scrollTop).toBeNull(); // Should be cleared even on error
    });
  });
});
