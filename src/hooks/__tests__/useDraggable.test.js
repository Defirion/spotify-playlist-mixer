import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import useDraggable from '../useDraggable';

// Mock the DragContext
jest.mock('../../components/DragContext', () => ({
  useDrag: () => ({
    startDrag: jest.fn(),
    endDrag: jest.fn(),
    notifyHTML5DragStart: jest.fn(),
    notifyHTML5DragEnd: jest.fn(),
    notifyTouchDragStart: jest.fn(),
    notifyTouchDragEnd: jest.fn(),
  }),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('useDraggable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
  });

  it('should provide drag handle props', () => {
    const { result } = renderHook(() => useDraggable());

    expect(result.current.dragHandleProps).toHaveProperty('draggable', true);
    expect(result.current.dragHandleProps).toHaveProperty('onDragStart');
    expect(result.current.dragHandleProps).toHaveProperty('onDragEnd');
    expect(result.current.dragHandleProps).toHaveProperty('onTouchStart');
    expect(result.current.dragHandleProps).toHaveProperty('onTouchMove');
    expect(result.current.dragHandleProps).toHaveProperty('onTouchEnd');
    expect(result.current.dragHandleProps).toHaveProperty('onKeyDown');
    expect(result.current.dragHandleProps).toHaveProperty('tabIndex', 0);
    expect(result.current.dragHandleProps).toHaveProperty('role', 'button');
  });

  it('should provide drop zone props', () => {
    const { result } = renderHook(() => useDraggable());

    expect(result.current.dropZoneProps).toHaveProperty('onDragOver');
    expect(result.current.dropZoneProps).toHaveProperty('onDrop');
    expect(result.current.dropZoneProps).toHaveProperty('onDragLeave');
  });

  it('should handle disabled state', () => {
    const { result } = renderHook(() => useDraggable({ disabled: true }));

    expect(result.current.dragHandleProps.draggable).toBe(false);
    expect(result.current.dragHandleProps.tabIndex).toBe(-1);
  });

  it('should start drag when startDrag is called', () => {
    const onDragStart = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, data: testData })
    );

    act(() => {
      result.current.startDrag(testData);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.draggedItem).toBe(testData);
    expect(onDragStart).toHaveBeenCalledWith(testData, 'default');
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('should end drag when endDrag is called', () => {
    const onDragEnd = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragEnd, data: testData })
    );

    // Start drag first
    act(() => {
      result.current.startDrag(testData);
    });

    expect(result.current.isDragging).toBe(true);

    // End drag
    act(() => {
      result.current.endDrag('success');
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedItem).toBe(null);
    expect(onDragEnd).toHaveBeenCalledWith('success');
  });

  it('should handle HTML5 drag start', () => {
    const onDragStart = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, data: testData, type: 'test-type' })
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

    expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
      'text/html',
      '<div>test</div>'
    );
    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify({ type: 'test-type', data: testData })
    );
    expect(result.current.isDragging).toBe(true);
    expect(onDragStart).toHaveBeenCalledWith(testData, 'html5');
  });

  it('should handle touch start and long press', () => {
    const onDragStart = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, data: testData, longPressDelay: 100 })
    );

    const mockTouchEvent = {
      touches: [{ clientY: 100, clientX: 50 }],
      currentTarget: { id: 'test-element' },
    };

    // Start touch
    act(() => {
      result.current.dragHandleProps.onTouchStart(mockTouchEvent);
    });

    expect(result.current.touchState.isActive).toBe(true);

    // Fast forward time to trigger long press
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.touchState.isLongPress).toBe(true);
    expect(result.current.isDragging).toBe(true);
    expect(onDragStart).toHaveBeenCalledWith(testData, 'touch');
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });

  it('should cancel long press on movement', () => {
    const onDragStart = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, data: testData, longPressDelay: 100 })
    );

    const mockTouchStart = {
      touches: [{ clientY: 100, clientX: 50 }],
      currentTarget: { id: 'test-element' },
    };

    const mockTouchMove = {
      touches: [{ clientY: 120, clientX: 70 }], // Moved more than 15px
    };

    // Start touch
    act(() => {
      result.current.dragHandleProps.onTouchStart(mockTouchStart);
    });

    // Move too much
    act(() => {
      result.current.dragHandleProps.onTouchMove(mockTouchMove);
    });

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.touchState.isLongPress).toBe(false);
    expect(result.current.isDragging).toBe(false);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation', () => {
    const onDragStart = jest.fn();
    const onDrop = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, onDrop, data: testData })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
      target: { id: 'test-element' },
    };

    // Start drag with spacebar
    act(() => {
      result.current.dragHandleProps.onKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.keyboardState.isDragging).toBe(true);
    expect(result.current.isDragging).toBe(true);
    expect(onDragStart).toHaveBeenCalledWith(testData, 'keyboard');

    // End drag with spacebar again
    act(() => {
      result.current.dragHandleProps.onKeyDown(mockKeyEvent);
    });

    expect(onDrop).toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });

  it('should handle escape key to cancel drag', () => {
    const onDragStart = jest.fn();
    const onDragEnd = jest.fn();
    const testData = { id: 'test' };

    const { result } = renderHook(() =>
      useDraggable({ onDragStart, onDragEnd, data: testData })
    );

    const mockSpaceEvent = {
      key: ' ',
      preventDefault: jest.fn(),
      target: { id: 'test-element' },
    };

    // Start keyboard drag with spacebar
    act(() => {
      result.current.dragHandleProps.onKeyDown(mockSpaceEvent);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.keyboardState.isDragging).toBe(true);

    const mockEscapeEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
    };

    // Cancel with escape
    act(() => {
      result.current.dragHandleProps.onKeyDown(mockEscapeEvent);
    });

    expect(mockEscapeEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.keyboardState.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith('cancel');
  });

  it('should provide haptic feedback', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.provideHapticFeedback([100, 50, 100]);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('should cleanup timers on unmount', () => {
    const { result, unmount } = renderHook(() => useDraggable());

    const mockTouchEvent = {
      touches: [{ clientY: 100, clientX: 50 }],
      currentTarget: { id: 'test-element' },
    };

    // Start touch to create timer
    act(() => {
      result.current.dragHandleProps.onTouchStart(mockTouchEvent);
    });

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Unmount should clear timers
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
