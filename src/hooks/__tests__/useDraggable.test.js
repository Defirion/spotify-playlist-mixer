import { renderHook, act } from '@testing-library/react';
import useDraggable from '../useDraggable';

// Import the mocked functions
import { useDragState } from '../drag/useDragState';
import { useDragHandlers } from '../drag/useDragHandlers';
import { useTouchDrag } from '../drag/useTouchDrag';
import { useKeyboardDrag } from '../drag/useKeyboardDrag';
import { useAutoScroll } from '../drag/useAutoScroll';
import { useDragVisualFeedback } from '../drag/useDragVisualFeedback';

// Mock all the modular drag hooks
jest.mock('../drag/useDragState', () => ({
  useDragState: jest.fn(),
}));

jest.mock('../drag/useDragHandlers', () => ({
  useDragHandlers: jest.fn(),
}));

jest.mock('../drag/useTouchDrag', () => ({
  useTouchDrag: jest.fn(),
}));

jest.mock('../drag/useKeyboardDrag', () => ({
  useKeyboardDrag: jest.fn(),
}));

jest.mock('../drag/useAutoScroll', () => ({
  useAutoScroll: jest.fn(),
}));

jest.mock('../drag/useDragVisualFeedback', () => ({
  useDragVisualFeedback: jest.fn(),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('useDraggable', () => {
  // Mock return values for all hooks
  const mockDragState = {
    isDragging: false,
    draggedItem: null,
    startDrag: jest.fn(),
    endDrag: jest.fn(),
    isCurrentlyDragged: jest.fn(),
  };

  const mockDragHandlers = {
    createDragItem: jest.fn(),
    handleHTML5DragStart: jest.fn(),
    handleHTML5DragEnd: jest.fn(),
    canDrag: jest.fn(),
  };

  const mockTouchDrag = {
    handleTouchStart: jest.fn(),
    handleTouchMove: jest.fn(),
    handleTouchEnd: jest.fn(),
    touchState: {
      isActive: false,
      isLongPress: false,
      startY: 0,
      currentY: 0,
      startX: 0,
      currentX: 0,
      longPressTimer: null,
      element: null,
    },
    cleanup: jest.fn(),
  };

  const mockKeyboardDrag = {
    handleKeyDown: jest.fn(),
    keyboardState: {
      isActive: false,
      selectedIndex: -1,
      isDragging: false,
    },
  };

  const mockAutoScroll = {
    checkAutoScroll: jest.fn(),
    stopAutoScroll: jest.fn(),
  };

  const mockVisualFeedback = {
    dragClasses: {
      'drag-active': false,
      'currently-dragged': false,
    },
    dragStyles: {
      opacity: 1,
      transform: 'scale(1)',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock implementations
    useDragState.mockReturnValue(mockDragState);
    useDragHandlers.mockReturnValue(mockDragHandlers);
    useTouchDrag.mockReturnValue(mockTouchDrag);
    useKeyboardDrag.mockReturnValue(mockKeyboardDrag);
    useAutoScroll.mockReturnValue(mockAutoScroll);
    useDragVisualFeedback.mockReturnValue(mockVisualFeedback);

    // Ensure functions return proper values by default
    mockDragHandlers.canDrag.mockReturnValue(true);
    mockDragState.isCurrentlyDragged.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDraggable());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedItem).toBe(null);
    expect(result.current.dropPosition).toBe(null);
    expect(result.current.touchState.isLongPress).toBe(false);
    expect(result.current.keyboardState.isDragging).toBe(false);

    // Verify that all modular hooks were called with correct default parameters
    expect(useDragState).toHaveBeenCalled();
    expect(useDragHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'internal-track',
        disabled: false,
      })
    );
    expect(useTouchDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: false,
        longPressDelay: 250,
      })
    );
    expect(useKeyboardDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: false,
      })
    );
    expect(useAutoScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollThreshold: 80,
      })
    );
    expect(useDragVisualFeedback).toHaveBeenCalled();
  });

  it('should provide drag handle props', () => {
    const { result } = renderHook(() => useDraggable());

    const dragHandleProps = result.current.dragHandleProps;

    expect(dragHandleProps).toHaveProperty('draggable', true);
    expect(dragHandleProps).toHaveProperty('onDragStart');
    expect(dragHandleProps).toHaveProperty('onDragEnd');
    expect(dragHandleProps).toHaveProperty(
      'onTouchStart',
      mockTouchDrag.handleTouchStart
    );
    expect(dragHandleProps).toHaveProperty(
      'onTouchMove',
      mockTouchDrag.handleTouchMove
    );
    expect(dragHandleProps).toHaveProperty(
      'onTouchEnd',
      mockTouchDrag.handleTouchEnd
    );
    expect(dragHandleProps).toHaveProperty(
      'onKeyDown',
      mockKeyboardDrag.handleKeyDown
    );
    expect(dragHandleProps).toHaveProperty('tabIndex', 0);
    expect(dragHandleProps).toHaveProperty('role', 'button');
    expect(dragHandleProps).toHaveProperty('aria-grabbed', false);
    expect(dragHandleProps).toHaveProperty('className', '');
    expect(dragHandleProps).toHaveProperty(
      'style',
      mockVisualFeedback.dragStyles
    );
  });

  it('should provide drop zone props', () => {
    const { result } = renderHook(() => useDraggable());

    expect(result.current.dropZoneProps).toHaveProperty('onDragOver');
    expect(result.current.dropZoneProps).toHaveProperty('onDrop');
    expect(result.current.dropZoneProps).toHaveProperty('onDragLeave');
  });

  it('should handle disabled state', () => {
    // Mock canDrag to return false when disabled
    mockDragHandlers.canDrag.mockReturnValue(false);

    const { result } = renderHook(() => useDraggable({ disabled: true }));

    expect(result.current.dragHandleProps.draggable).toBe(false);
    expect(result.current.dragHandleProps.tabIndex).toBe(-1);

    // Verify that disabled state was passed to modular hooks
    expect(useDragHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
    expect(useTouchDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
    expect(useKeyboardDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
  });

  it('should integrate with drag state management', () => {
    const onDragStart = jest.fn();
    const testData = { track: { id: 'test' }, index: 0 };

    // Mock drag state to simulate active drag
    mockDragState.isDragging = true;
    mockDragState.draggedItem = {
      id: 'test-item',
      type: 'internal-track',
      payload: testData,
    };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, data: testData, type: 'internal-track' })
    );

    expect(result.current.isDragging).toBe(true);
    expect(result.current.draggedItem).toEqual(mockDragState.draggedItem);

    // Verify that callbacks are properly wired to modular hooks
    expect(useDragHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        onDragStart: expect.any(Function),
        onDragEnd: expect.any(Function),
      })
    );
  });

  it('should handle drag lifecycle through modular hooks', () => {
    const onDragStart = jest.fn();
    const onDragEnd = jest.fn();
    const testData = { track: { id: 'test' }, index: 0 };

    renderHook(() =>
      useDraggable({
        onDragStart,
        onDragEnd,
        data: testData,
        type: 'internal-track',
      })
    );

    // Simulate drag start through useDragHandlers callback
    const dragHandlersCall = useDragHandlers.mock.calls[0][0];
    const mockDragItem = {
      id: 'test',
      type: 'internal-track',
      payload: testData,
    };

    act(() => {
      dragHandlersCall.onDragStart(mockDragItem);
    });

    expect(mockDragState.startDrag).toHaveBeenCalledWith(mockDragItem);
    expect(onDragStart).toHaveBeenCalledWith(mockDragItem);

    // Simulate drag end through useDragHandlers callback
    act(() => {
      dragHandlersCall.onDragEnd(mockDragItem, true);
    });

    expect(mockDragState.endDrag).toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledWith(mockDragItem, true);
  });

  it('should handle HTML5 drag events', () => {
    const testData = { track: { id: 'test' }, index: 0 };
    const mockDragItem = {
      id: 'test',
      type: 'internal-track',
      payload: testData,
    };

    mockDragHandlers.handleHTML5DragStart.mockReturnValue(mockDragItem);

    const { result } = renderHook(() =>
      useDraggable({ data: testData, type: 'internal-track' })
    );

    const mockEvent = {
      dataTransfer: {
        effectAllowed: '',
        setData: jest.fn(),
      },
      target: { outerHTML: '<div>test</div>' },
      preventDefault: jest.fn(),
    };

    act(() => {
      result.current.dragHandleProps.onDragStart(mockEvent);
    });

    expect(mockDragHandlers.handleHTML5DragStart).toHaveBeenCalledWith(
      mockEvent
    );

    // Test drag end
    act(() => {
      result.current.dragHandleProps.onDragEnd(mockEvent);
    });

    expect(mockDragHandlers.handleHTML5DragEnd).toHaveBeenCalledWith(
      mockEvent,
      mockDragState.draggedItem
    );
  });

  it('should handle touch events through useTouchDrag', () => {
    const testData = { track: { id: 'test' }, index: 0 };

    const { result } = renderHook(() =>
      useDraggable({
        data: testData,
        longPressDelay: 100,
        type: 'internal-track',
      })
    );

    const mockTouchEvent = {
      touches: [{ clientY: 100, clientX: 50 }],
      currentTarget: { id: 'test-element' },
    };

    // Test that touch events are delegated to useTouchDrag
    act(() => {
      result.current.dragHandleProps.onTouchStart(mockTouchEvent);
    });

    expect(mockTouchDrag.handleTouchStart).toHaveBeenCalledWith(mockTouchEvent);

    act(() => {
      result.current.dragHandleProps.onTouchMove(mockTouchEvent);
    });

    expect(mockTouchDrag.handleTouchMove).toHaveBeenCalledWith(mockTouchEvent);

    act(() => {
      result.current.dragHandleProps.onTouchEnd(mockTouchEvent);
    });

    expect(mockTouchDrag.handleTouchEnd).toHaveBeenCalledWith(mockTouchEvent);

    // Verify useTouchDrag was configured with correct parameters
    expect(useTouchDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        longPressDelay: 100,
        createDragItem: mockDragHandlers.createDragItem,
      })
    );
  });

  it('should return touch state from useTouchDrag', () => {
    // Mock touch state to simulate active touch
    mockTouchDrag.touchState = {
      isActive: true,
      isLongPress: true,
      startY: 100,
      currentY: 120,
      startX: 50,
      currentX: 70,
      longPressTimer: null,
      element: null,
    };

    const { result } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    expect(result.current.touchState).toEqual(mockTouchDrag.touchState);
  });

  it('should handle keyboard events through useKeyboardDrag', () => {
    const onMove = jest.fn();
    const testData = { track: { id: 'test' }, index: 0 };

    const { result } = renderHook(() =>
      useDraggable({ onMove, data: testData, type: 'internal-track' })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
      target: { id: 'test-element' },
    };

    // Test that keyboard events are delegated to useKeyboardDrag
    act(() => {
      result.current.dragHandleProps.onKeyDown(mockKeyEvent);
    });

    expect(mockKeyboardDrag.handleKeyDown).toHaveBeenCalledWith(mockKeyEvent);

    // Verify useKeyboardDrag was configured with correct parameters
    expect(useKeyboardDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        createDragItem: mockDragHandlers.createDragItem,
        onMove,
      })
    );
  });

  it('should return keyboard state from useKeyboardDrag', () => {
    // Mock keyboard state to simulate active keyboard drag
    mockKeyboardDrag.keyboardState = {
      isActive: true,
      selectedIndex: 2,
      isDragging: true,
    };

    const { result } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    expect(result.current.keyboardState).toEqual(
      mockKeyboardDrag.keyboardState
    );
  });

  it('should handle drop zone events', () => {
    mockDragState.isDragging = true;

    const { result } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    const mockDragEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { dropEffect: '' },
      clientY: 100,
    };

    // Test drag over
    act(() => {
      result.current.dropZoneProps.onDragOver(mockDragEvent);
    });

    expect(mockDragEvent.preventDefault).toHaveBeenCalled();
    expect(mockDragEvent.dataTransfer.dropEffect).toBe('move');
    expect(mockAutoScroll.checkAutoScroll).toHaveBeenCalledWith(100);

    // Test drop
    act(() => {
      result.current.dropZoneProps.onDrop(mockDragEvent);
    });

    expect(mockAutoScroll.stopAutoScroll).toHaveBeenCalled();

    // Test drag leave
    act(() => {
      result.current.dropZoneProps.onDragLeave();
    });

    // Should not throw any errors
  });

  it('should cleanup resources on unmount', () => {
    const { unmount } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    // Unmount should trigger cleanup
    unmount();

    expect(mockAutoScroll.stopAutoScroll).toHaveBeenCalled();
    expect(mockTouchDrag.cleanup).toHaveBeenCalled();
  });

  it('should integrate visual feedback correctly', () => {
    // Mock visual feedback with active drag classes
    mockVisualFeedback.dragClasses = {
      'drag-active': true,
      'currently-dragged': false,
    };
    mockVisualFeedback.dragStyles = {
      opacity: 0.8,
      transform: 'scale(1.02)',
    };

    const { result } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    expect(result.current.dragHandleProps.className).toBe('drag-active');
    expect(result.current.dragHandleProps.style).toEqual(
      mockVisualFeedback.dragStyles
    );

    // Verify visual feedback hook was called with correct parameters
    expect(useDragVisualFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        isDragging: mockDragState.isDragging,
        draggedItem: mockDragState.draggedItem,
      })
    );
  });

  it('should provide backward compatibility functions', () => {
    const { result } = renderHook(() =>
      useDraggable({ type: 'internal-track' })
    );

    // These functions should exist for backward compatibility but be no-ops
    expect(typeof result.current.startDrag).toBe('function');
    expect(typeof result.current.endDrag).toBe('function');
    expect(typeof result.current.provideHapticFeedback).toBe('function');

    // These should be the actual functions from modular hooks
    expect(result.current.checkAutoScroll).toBe(mockAutoScroll.checkAutoScroll);
    expect(result.current.stopAutoScroll).toBe(mockAutoScroll.stopAutoScroll);
  });
});
