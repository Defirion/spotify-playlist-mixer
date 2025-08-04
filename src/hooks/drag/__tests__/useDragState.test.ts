import { renderHook } from '@testing-library/react';
import { useDragState } from '../useDragState';
import { DraggedItem } from '../../../types/dragAndDrop';

// Import the mocked function
import { useDragState as mockUseDragState } from '../../../store';

// Mock the store module
jest.mock('../../../store', () => ({
  useDragState: jest.fn(),
}));

describe('useDragState', () => {
  const mockStoreState = {
    isDragging: false,
    draggedItem: null,
    dragStartTime: null,
    startDrag: jest.fn(),
    endDrag: jest.fn(),
    cancelDrag: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUseDragState as jest.Mock).mockReturnValue(mockStoreState);
  });

  it('should return store state and utility functions', () => {
    const { result } = renderHook(() => useDragState());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedItem).toBeNull();
    expect(result.current.dragStartTime).toBeNull();
    expect(typeof result.current.startDrag).toBe('function');
    expect(typeof result.current.endDrag).toBe('function');
    expect(typeof result.current.cancelDrag).toBe('function');
    expect(typeof result.current.isCurrentlyDragged).toBe('function');
    expect(typeof result.current.isDragTypeActive).toBe('function');
    expect(typeof result.current.getCurrentDraggedItem).toBe('function');
    expect(typeof result.current.getDragDuration).toBe('function');
    expect(typeof result.current.isDragBlocked).toBe('function');
  });

  describe('isCurrentlyDragged', () => {
    it('should return false when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.isCurrentlyDragged('test-id')).toBe(false);
    });

    it('should return true when dragging the specific item', () => {
      const draggedItem: DraggedItem = {
        id: 'test-id',
        type: 'internal-track',
        payload: { track: {} as any, index: 0 },
        timestamp: Date.now(),
      };

      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
        draggedItem,
      });

      const { result } = renderHook(() => useDragState());

      expect(result.current.isCurrentlyDragged('test-id')).toBe(true);
      expect(result.current.isCurrentlyDragged('other-id')).toBe(false);
    });
  });

  describe('isDragTypeActive', () => {
    it('should return false when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.isDragTypeActive('internal-track')).toBe(false);
    });

    it('should return true when dragging item of specific type', () => {
      const draggedItem: DraggedItem = {
        id: 'test-id',
        type: 'modal-track',
        payload: { track: {} as any, source: 'test' },
        timestamp: Date.now(),
      };

      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
        draggedItem,
      });

      const { result } = renderHook(() => useDragState());

      expect(result.current.isDragTypeActive('modal-track')).toBe(true);
      expect(result.current.isDragTypeActive('internal-track')).toBe(false);
    });
  });

  describe('getCurrentDraggedItem', () => {
    it('should return null when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.getCurrentDraggedItem()).toBeNull();
    });

    it('should return dragged item when dragging', () => {
      const draggedItem: DraggedItem = {
        id: 'test-id',
        type: 'search-track',
        payload: { track: {} as any, query: 'test query' },
        timestamp: Date.now(),
      };

      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
        draggedItem,
      });

      const { result } = renderHook(() => useDragState());

      expect(result.current.getCurrentDraggedItem()).toEqual(draggedItem);
    });
  });

  describe('getDragDuration', () => {
    it('should return 0 when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.getDragDuration()).toBe(0);
    });

    it('should return 0 when dragging but no start time', () => {
      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
        dragStartTime: null,
      });

      const { result } = renderHook(() => useDragState());

      expect(result.current.getDragDuration()).toBe(0);
    });

    it('should return duration when dragging with start time', () => {
      const startTime = Date.now() - 1000; // 1 second ago

      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
        dragStartTime: startTime,
      });

      const { result } = renderHook(() => useDragState());
      const duration = result.current.getDragDuration();

      expect(duration).toBeGreaterThan(900); // Should be around 1000ms
      expect(duration).toBeLessThan(1100);
    });
  });

  describe('isDragBlocked', () => {
    it('should return false when not dragging', () => {
      const { result } = renderHook(() => useDragState());

      expect(result.current.isDragBlocked()).toBe(false);
    });

    it('should return true when dragging', () => {
      (mockUseDragState as jest.Mock).mockReturnValue({
        ...mockStoreState,
        isDragging: true,
      });

      const { result } = renderHook(() => useDragState());

      expect(result.current.isDragBlocked()).toBe(true);
    });
  });

  describe('store integration', () => {
    it('should call the store hook and pass through actions', () => {
      const { result } = renderHook(() => useDragState());

      // Verify store hook is called
      expect(mockUseDragState).toHaveBeenCalled();

      // Verify actions are passed through
      expect(result.current.startDrag).toBe(mockStoreState.startDrag);
      expect(result.current.endDrag).toBe(mockStoreState.endDrag);
      expect(result.current.cancelDrag).toBe(mockStoreState.cancelDrag);
    });
  });
});
