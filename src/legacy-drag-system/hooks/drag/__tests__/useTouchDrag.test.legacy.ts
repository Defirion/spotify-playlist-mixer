import { renderHook, act } from '@testing-library/react';
import { useTouchDrag } from '../useTouchDrag';
import { DraggedItem } from '../../../types/dragAndDrop';

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('useTouchDrag', () => {
  const mockCreateDragItem = jest.fn().mockReturnValue({
    id: 'test-track-1',
    type: 'internal-track',
    payload: {
      track: { id: 'test-track-1', name: 'Test Track' } as any,
      index: 0,
    },
    timestamp: Date.now(),
  });

  const mockOnDragStart = jest.fn();
  const mockOnDragEnd = jest.fn();
  const mockOnDragMove = jest.fn();
  const mockCheckAutoScroll = jest.fn();

  const defaultOptions = {
    createDragItem: mockCreateDragItem,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    onDragMove: mockOnDragMove,
    checkAutoScroll: mockCheckAutoScroll,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Re-setup the mock return value after clearing
    mockCreateDragItem.mockReturnValue({
      id: 'test-track-1',
      type: 'internal-track',
      payload: {
        track: { id: 'test-track-1', name: 'Test Track' } as any,
        index: 0,
      },
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should initialize with inactive touch state', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    expect(result.current.touchState.isActive).toBe(false);
    expect(result.current.touchState.isLongPress).toBe(false);
    expect(result.current.touchState.longPressTimer).toBe(null);
  });

  it('should handle touch start and set up long press timer', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchEvent);
    });

    expect(result.current.touchState.isActive).toBe(true);
    expect(result.current.touchState.startX).toBe(100);
    expect(result.current.touchState.startY).toBe(200);
    expect(result.current.touchState.longPressTimer).not.toBe(null);
  });

  it('should trigger long press after delay when movement is within threshold', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchEvent);
    });

    // Fast-forward time to trigger long press
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.touchState.isLongPress).toBe(true);
    expect(mockCreateDragItem).toHaveBeenCalled();
    expect(mockOnDragStart).toHaveBeenCalled();
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });

  it('should cancel long press if movement exceeds threshold', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    const mockTouchMoveEvent = {
      touches: [{ clientX: 120, clientY: 220 }], // Movement > 15px threshold
      cancelable: true,
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchStartEvent);
    });

    act(() => {
      result.current.handleTouchMove(mockTouchMoveEvent);
    });

    // Fast-forward time - long press should not trigger
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.touchState.isLongPress).toBe(false);
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should handle touch move during active long press', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchStartEvent);
    });

    // Trigger long press
    act(() => {
      jest.advanceTimersByTime(250);
    });

    const mockTouchMoveEvent = {
      touches: [{ clientX: 110, clientY: 210 }],
      cancelable: true,
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleTouchMove(mockTouchMoveEvent);
    });

    expect(mockTouchMoveEvent.preventDefault).toHaveBeenCalled();
    expect(mockCheckAutoScroll).toHaveBeenCalledWith(210);
    expect(mockOnDragMove).toHaveBeenCalledWith(110, 210);
  });

  it('should handle touch end and trigger drag end for successful long press', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    const mockTouchEndEvent = {
      changedTouches: [{ clientX: 105, clientY: 205 }],
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchStartEvent);
    });

    // Trigger long press
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Verify long press was triggered
    expect(result.current.touchState.isLongPress).toBe(true);
    expect(mockOnDragStart).toHaveBeenCalled();

    act(() => {
      result.current.handleTouchEnd(mockTouchEndEvent);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([30, 50, 30]);

    // Fast-forward to trigger setTimeout callback
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(mockOnDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-track-1',
        type: 'internal-track',
      }),
      true
    );
  });

  it('should respect disabled state', () => {
    const { result } = renderHook(() =>
      useTouchDrag({ ...defaultOptions, disabled: true })
    );

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchEvent);
    });

    expect(result.current.touchState.isActive).toBe(false);
    expect(mockCreateDragItem).not.toHaveBeenCalled();
  });

  it('should use custom long press delay', () => {
    const { result } = renderHook(() =>
      useTouchDrag({ ...defaultOptions, longPressDelay: 500 })
    );

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchEvent);
    });

    // Should not trigger at default 250ms
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.touchState.isLongPress).toBe(false);

    // Should trigger at custom 500ms
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.touchState.isLongPress).toBe(true);
  });

  it('should use custom movement threshold', () => {
    const { result } = renderHook(() =>
      useTouchDrag({ ...defaultOptions, movementThreshold: 30 })
    );

    const mockTouchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    const mockTouchMoveEvent = {
      touches: [{ clientX: 125, clientY: 225 }], // 25px movement < 30px threshold
      cancelable: true,
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchStartEvent);
    });

    act(() => {
      result.current.handleTouchMove(mockTouchMoveEvent);
    });

    // Should still trigger long press with higher threshold
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.touchState.isLongPress).toBe(true);
  });

  it('should clean up timers on cleanup', () => {
    const { result } = renderHook(() => useTouchDrag(defaultOptions));

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchEvent);
    });

    const timerBefore = result.current.touchState.longPressTimer;
    expect(timerBefore).not.toBe(null);

    act(() => {
      result.current.cleanup();
    });

    expect(result.current.touchState.isActive).toBe(false);
    expect(result.current.touchState.longPressTimer).toBe(null);
  });

  it('should dispatch custom events when scroll container is provided', () => {
    const mockScrollContainer = document.createElement('div');
    const dispatchEventSpy = jest.spyOn(mockScrollContainer, 'dispatchEvent');

    const { result } = renderHook(() =>
      useTouchDrag({
        ...defaultOptions,
        scrollContainer: mockScrollContainer,
        data: { id: 'test' },
        type: 'internal-track' as const,
      })
    );

    const mockTouchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      currentTarget: document.createElement('div'),
    } as any;

    act(() => {
      result.current.handleTouchStart(mockTouchStartEvent);
    });

    // Trigger long press
    act(() => {
      jest.advanceTimersByTime(250);
    });

    const mockTouchMoveEvent = {
      touches: [{ clientX: 110, clientY: 210 }],
      cancelable: true,
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleTouchMove(mockTouchMoveEvent);
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'externalDragOver',
        detail: expect.objectContaining({
          clientX: 110,
          clientY: 210,
          draggedItem: { data: { id: 'test' }, type: 'internal-track' },
        }),
      })
    );

    const mockTouchEndEvent = {
      changedTouches: [{ clientX: 110, clientY: 210 }],
    } as any;

    act(() => {
      result.current.handleTouchEnd(mockTouchEndEvent);
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'externalDrop',
        detail: expect.objectContaining({
          clientX: 110,
          clientY: 210,
          draggedItem: { data: { id: 'test' }, type: 'internal-track' },
        }),
      })
    );
  });
});
