import { renderHook, act } from '@testing-library/react';
import { useKeyboardDrag } from '../useKeyboardDrag';
import { DraggedItem } from '../../../types/dragAndDrop';

describe('useKeyboardDrag', () => {
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
  const mockOnMove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
      })
    );

    expect(result.current.keyboardState.isActive).toBe(false);
    expect(result.current.keyboardState.isDragging).toBe(false);
    expect(result.current.keyboardState.selectedIndex).toBe(-1);
  });

  it('should start drag when spacebar is pressed and not currently dragging', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onDragStart: mockOnDragStart,
      })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(mockCreateDragItem).toHaveBeenCalled();
    expect(mockOnDragStart).toHaveBeenCalledWith({
      id: 'test-track-1',
      type: 'internal-track',
      payload: {
        track: { id: 'test-track-1', name: 'Test Track' },
        index: 0,
      },
      timestamp: expect.any(Number),
    });
    expect(result.current.keyboardState.isDragging).toBe(true);
    expect(result.current.keyboardState.isActive).toBe(true);
  });

  it('should end drag when spacebar is pressed and currently dragging', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: true,
        onDragEnd: mockOnDragEnd,
      })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnDragEnd).toHaveBeenCalledWith(null, true);
    expect(result.current.keyboardState.isDragging).toBe(false);
    expect(result.current.keyboardState.isActive).toBe(false);
  });

  it('should handle arrow up navigation during drag', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: true,
        onMove: mockOnMove,
      })
    );

    const mockKeyEvent = {
      key: 'ArrowUp',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnMove).toHaveBeenCalledWith('up');
  });

  it('should handle arrow down navigation during drag', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: true,
        onMove: mockOnMove,
      })
    );

    const mockKeyEvent = {
      key: 'ArrowDown',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnMove).toHaveBeenCalledWith('down');
  });

  it('should not handle arrow keys when not dragging', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onMove: mockOnMove,
      })
    );

    const mockKeyEvent = {
      key: 'ArrowUp',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
  });

  it('should cancel drag when escape is pressed during drag', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: true,
        onDragEnd: mockOnDragEnd,
      })
    );

    const mockKeyEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnDragEnd).toHaveBeenCalledWith(null, false);
    expect(result.current.keyboardState.isDragging).toBe(false);
    expect(result.current.keyboardState.isActive).toBe(false);
  });

  it('should not handle escape when not dragging', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onDragEnd: mockOnDragEnd,
      })
    );

    const mockKeyEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockOnDragEnd).not.toHaveBeenCalled();
  });

  it('should ignore other keys', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onDragStart: mockOnDragStart,
        onMove: mockOnMove,
      })
    );

    const mockKeyEvent = {
      key: 'Enter',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockOnDragStart).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
  });

  it('should not handle any keys when disabled', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        disabled: true,
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onDragStart: mockOnDragStart,
      })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockKeyEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should maintain drag item reference for proper cleanup', () => {
    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: false,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
      })
    );

    // Start drag
    const mockSpaceEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockSpaceEvent);
    });

    expect(mockOnDragStart).toHaveBeenCalled();
    const draggedItem = mockOnDragStart.mock.calls[0][0];

    // Update to simulate currently dragging state
    const { result: result2 } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateDragItem,
        isCurrentlyDragged: true,
        onDragEnd: mockOnDragEnd,
      })
    );

    // End drag
    act(() => {
      result2.current.handleKeyDown(mockSpaceEvent);
    });

    expect(mockOnDragEnd).toHaveBeenCalledWith(null, true);
  });

  it('should support different drag source types', () => {
    const mockCreateModalDragItem = jest.fn().mockReturnValue({
      id: 'modal-track-1',
      type: 'modal-track',
      payload: {
        track: { id: 'modal-track-1', name: 'Modal Track' } as any,
        source: 'test-playlist',
      },
      timestamp: Date.now(),
    });

    const { result } = renderHook(() =>
      useKeyboardDrag({
        createDragItem: mockCreateModalDragItem,
        isCurrentlyDragged: false,
        onDragStart: mockOnDragStart,
      })
    );

    const mockKeyEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as any;

    act(() => {
      result.current.handleKeyDown(mockKeyEvent);
    });

    expect(mockOnDragStart).toHaveBeenCalledWith({
      id: 'modal-track-1',
      type: 'modal-track',
      payload: {
        track: { id: 'modal-track-1', name: 'Modal Track' },
        source: 'test-playlist',
      },
      timestamp: expect.any(Number),
    });
  });
});
