import { renderHook, act } from '@testing-library/react';
import { useDragHandlers } from '../useDragHandlers';
import { DragSourceType } from '../../../types/dragAndDrop';

// Mock console methods to avoid noise in tests
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('useDragHandlers', () => {
  const mockTrack = {
    id: 'track-1',
    name: 'Test Track',
    artists: [{ name: 'Test Artist' }],
    duration_ms: 180000,
  };

  const mockInternalTrackData = {
    track: mockTrack,
    index: 0,
  };

  const mockModalTrackData = {
    track: mockTrack,
    source: 'test-playlist',
  };

  const mockSearchTrackData = {
    track: mockTrack,
    query: 'test search',
  };

  describe('createDragItem', () => {
    it('should create internal-track drag item correctly', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
        })
      );

      const dragItem = result.current.createDragItem();

      expect(dragItem.type).toBe('internal-track');
      expect(dragItem.id).toBe('internal-track-track-1');
      expect(dragItem.payload).toEqual({
        track: mockTrack,
        index: 0,
      });
      expect(dragItem.timestamp).toBeGreaterThan(0);
    });

    it('should create modal-track drag item correctly', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'modal-track' as DragSourceType,
          data: mockModalTrackData,
        })
      );

      const dragItem = result.current.createDragItem();

      expect(dragItem.type).toBe('modal-track');
      expect(dragItem.id).toBe('modal-track-track-1');
      expect(dragItem.payload).toEqual({
        track: mockTrack,
        source: 'test-playlist',
      });
    });

    it('should create search-track drag item correctly', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'search-track' as DragSourceType,
          data: mockSearchTrackData,
        })
      );

      const dragItem = result.current.createDragItem();

      expect(dragItem.type).toBe('search-track');
      expect(dragItem.id).toBe('search-track-track-1');
      expect(dragItem.payload).toEqual({
        track: mockTrack,
        query: 'test search',
      });
    });

    it('should use custom ID generator when provided', () => {
      const customIdGenerator = jest.fn(() => 'custom-id');

      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          generateId: customIdGenerator,
        })
      );

      const dragItem = result.current.createDragItem();

      expect(customIdGenerator).toHaveBeenCalledWith(mockInternalTrackData);
      expect(dragItem.id).toBe('custom-id');
    });

    it('should throw error for invalid data', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: null,
        })
      );

      expect(() => result.current.createDragItem()).toThrow();
    });
  });

  describe('canDrag', () => {
    it('should return false when disabled', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          disabled: true,
        })
      );

      expect(result.current.canDrag()).toBe(false);
    });

    it('should return false when data is null', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: null,
        })
      );

      expect(result.current.canDrag()).toBe(false);
    });

    it('should return true for valid data', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
        })
      );

      expect(result.current.canDrag()).toBe(true);
    });
  });

  describe('HTML5 drag handlers', () => {
    it('should handle drag start correctly', () => {
      const onDragStart = jest.fn();
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          onDragStart,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: jest.fn(),
        },
      } as any;

      const dragItem = result.current.handleHTML5DragStart(mockEvent);

      expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'application/json',
        JSON.stringify(dragItem)
      );
      expect(onDragStart).toHaveBeenCalledWith(dragItem);
    });

    it('should prevent drag when disabled', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          disabled: true,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: jest.fn(),
        },
      } as any;

      const dragItem = result.current.handleHTML5DragStart(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(dragItem).toBeNull();
    });

    it('should handle drag end correctly', () => {
      const onDragEnd = jest.fn();
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          onDragEnd,
        })
      );

      const mockDragItem = result.current.createDragItem();
      const mockEvent = {
        dataTransfer: {
          dropEffect: 'move',
        },
      } as any;

      act(() => {
        result.current.handleHTML5DragEnd(mockEvent, mockDragItem);
      });

      // Use setTimeout to match the implementation
      setTimeout(() => {
        expect(onDragEnd).toHaveBeenCalledWith(mockDragItem, true);
      }, 0);
    });

    it('should detect unsuccessful drag', () => {
      const onDragEnd = jest.fn();
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          onDragEnd,
        })
      );

      const mockDragItem = result.current.createDragItem();
      const mockEvent = {
        dataTransfer: {
          dropEffect: 'none',
        },
      } as any;

      act(() => {
        result.current.handleHTML5DragEnd(mockEvent, mockDragItem);
      });

      setTimeout(() => {
        expect(onDragEnd).toHaveBeenCalledWith(mockDragItem, false);
      }, 0);
    });
  });

  describe('getCurrentDragItem', () => {
    it('should return null initially', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
        })
      );

      expect(result.current.getCurrentDragItem()).toBeNull();
    });

    it('should return current drag item after creation', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
        })
      );

      const dragItem = result.current.createDragItem();
      expect(result.current.getCurrentDragItem()).toEqual(dragItem);
    });
  });

  describe('error handling', () => {
    it('should handle dataTransfer errors gracefully', () => {
      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: jest.fn(() => {
            throw new Error('DataTransfer error');
          }),
        },
      } as any;

      // Should not throw, should handle error gracefully
      const dragItem = result.current.handleHTML5DragStart(mockEvent);
      expect(dragItem).not.toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const onDragStart = jest.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() =>
        useDragHandlers({
          type: 'internal-track' as DragSourceType,
          data: mockInternalTrackData,
          onDragStart,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: jest.fn(),
        },
      } as any;

      // Should not throw, should handle callback error gracefully
      const dragItem = result.current.handleHTML5DragStart(mockEvent);
      expect(dragItem).not.toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
