import { renderHook } from '@testing-library/react';
import { useDragVisualFeedback } from '../useDragVisualFeedback';

// Mock window.scrollTo since it's not implemented in JSDOM
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 0)),
});

describe('useDragVisualFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset document.body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.classList.remove('no-user-select', 'drag-active');
  });

  it('should return correct initial drag classes and styles', () => {
    const { result } = renderHook(() =>
      useDragVisualFeedback({
        isDragging: false,
        isCurrentlyDragged: false,
        draggedItem: null,
      })
    );

    expect(result.current.dragClasses).toEqual({
      'drag-active': false,
      'currently-dragged': false,
    });

    expect(result.current.dragStyles).toEqual({
      opacity: 1,
      transform: 'scale(1)',
    });
  });

  it('should apply drag-active class when dragging', () => {
    const { result } = renderHook(() =>
      useDragVisualFeedback({
        isDragging: true,
        isCurrentlyDragged: false,
        draggedItem: { id: 'test' },
      })
    );

    expect(result.current.dragClasses['drag-active']).toBe(true);
    expect(result.current.dragClasses['currently-dragged']).toBe(false);
  });

  it('should apply currently-dragged styles when item is being dragged', () => {
    const { result } = renderHook(() =>
      useDragVisualFeedback({
        isDragging: true,
        isCurrentlyDragged: true,
        draggedItem: { id: 'test' },
      })
    );

    expect(result.current.dragClasses['currently-dragged']).toBe(true);
    expect(result.current.dragStyles.opacity).toBe(0.5);
    expect(result.current.dragStyles.transform).toBe('scale(1.02)');
  });

  it('should apply body scroll lock when dragging starts', () => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    });

    renderHook(() =>
      useDragVisualFeedback({
        isDragging: true,
        isCurrentlyDragged: false,
        draggedItem: { id: 'test' },
      })
    );

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-100px');
    expect(document.body.style.width).toBe('100%');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.classList.contains('no-user-select')).toBe(true);
    expect(document.body.classList.contains('drag-active')).toBe(true);
  });

  it('should remove body scroll lock when dragging ends', () => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    });

    const { rerender } = renderHook(
      ({ isDragging }) =>
        useDragVisualFeedback({
          isDragging,
          isCurrentlyDragged: false,
          draggedItem: isDragging ? { id: 'test' } : null,
        }),
      { initialProps: { isDragging: true } }
    );

    // Verify scroll lock is applied
    expect(document.body.style.position).toBe('fixed');

    // End dragging
    rerender({ isDragging: false });

    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.width).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.classList.contains('no-user-select')).toBe(false);
    expect(document.body.classList.contains('drag-active')).toBe(false);
  });

  it('should cleanup scroll lock on unmount during drag', () => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    });

    const { unmount } = renderHook(() =>
      useDragVisualFeedback({
        isDragging: true,
        isCurrentlyDragged: false,
        draggedItem: { id: 'test' },
      })
    );

    // Verify scroll lock is applied
    expect(document.body.style.position).toBe('fixed');

    // Unmount while dragging
    unmount();

    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.width).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.classList.contains('no-user-select')).toBe(false);
    expect(document.body.classList.contains('drag-active')).toBe(false);
  });
});
