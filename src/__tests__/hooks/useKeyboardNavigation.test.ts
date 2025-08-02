import { renderHook, act } from '@testing-library/react';
import useKeyboardNavigation from '../../hooks/useKeyboardNavigation';
import type { UseKeyboardNavigationOptions } from '../../types/hooks';

// Mock data for testing
const mockItems = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
  { id: '3', name: 'Item 3' },
  { id: '4', name: 'Item 4' },
];

// Mock functions
const mockOnSelect = jest.fn();
const mockOnMove = jest.fn();
const mockOnDrop = jest.fn();
const mockAnnounceToScreenReader = jest.fn();

// Helper to create keyboard event
const createKeyboardEvent = (
  key: string,
  options: Partial<KeyboardEvent> = {}
) =>
  ({
    key,
    preventDefault: jest.fn(),
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...options,
  }) as unknown as React.KeyboardEvent;

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      expect(result.current.focusedIndex).toBe(-1);
      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBe(null);
    });

    it('should accept custom options', () => {
      const options: UseKeyboardNavigationOptions = {
        items: mockItems,
        onSelect: mockOnSelect,
        onMove: mockOnMove,
        onDrop: mockOnDrop,
        orientation: 'horizontal',
        loop: true,
        announceToScreenReader: mockAnnounceToScreenReader,
      };

      const { result } = renderHook(() => useKeyboardNavigation(options));

      expect(result.current.focusedIndex).toBe(-1);
      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBe(null);
    });
  });

  describe('focus management', () => {
    it('should move focus with arrow keys in vertical orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          orientation: 'vertical',
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus down
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusedIndex).toBe(0);

      // Move focus down again
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusedIndex).toBe(1);

      // Move focus up
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('should move focus with arrow keys in horizontal orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          orientation: 'horizontal',
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus right
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowRight'));
      });

      expect(result.current.focusedIndex).toBe(0);

      // Move focus right again
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowRight'));
      });

      expect(result.current.focusedIndex).toBe(1);

      // Move focus left
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowLeft'));
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('should handle Home and End keys', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move to end
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('End'));
      });

      expect(result.current.focusedIndex).toBe(3);

      // Move to home
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Home'));
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('should respect loop option', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          loop: true,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      // Move up should loop to last item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
      });

      expect(result.current.focusedIndex).toBe(3);

      // Move down should loop to first item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('should not loop when loop is false', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          loop: false,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      // Move up should stay at first item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
      });

      expect(result.current.focusedIndex).toBe(0);

      // Move to last item
      act(() => {
        result.current.moveFocus(3);
      });

      // Move down should stay at last item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusedIndex).toBe(3);
    });
  });

  describe('selection and dragging', () => {
    it('should start dragging when spacebar is pressed', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      // Press spacebar to start dragging
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.draggedItem).toBe(mockItems[0]);
      expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0], 0);
    });

    it('should drop item when spacebar is pressed during drag', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          onDrop: mockOnDrop,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.selectedIndex).toBe(0);

      // Move focus to different position
      act(() => {
        result.current.moveFocus(2);
      });

      // Drop item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.draggedItem).toBe(null);
      expect(mockOnDrop).toHaveBeenCalledWith(mockItems[0], 0, 2);
    });

    it('should handle Enter key like spacebar', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      // Press Enter to start dragging
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'));
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.selectedIndex).toBe(0);
      expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0], 0);
    });

    it('should cancel dragging with Escape key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);

      // Cancel dragging
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Escape'));
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.draggedItem).toBe(null);
    });
  });

  describe('item movement during drag', () => {
    it('should move items during drag in vertical orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onMove: mockOnMove,
          orientation: 'vertical',
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging first item
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);

      // Move item down
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(mockOnMove).toHaveBeenCalledWith(mockItems[0], 0, 1);
      expect(result.current.selectedIndex).toBe(1);
    });

    it('should move items during drag in horizontal orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onMove: mockOnMove,
          orientation: 'horizontal',
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging first item
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);

      // Move item right
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowRight'));
      });

      expect(mockOnMove).toHaveBeenCalledWith(mockItems[0], 0, 1);
      expect(result.current.selectedIndex).toBe(1);
    });

    it('should not move items beyond boundaries', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onMove: mockOnMove,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging last item
      act(() => {
        result.current.moveFocus(3);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.selectedIndex).toBe(3);

      // Try to move down (should not move)
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(mockOnMove).not.toHaveBeenCalled();
      expect(result.current.selectedIndex).toBe(3);
    });
  });

  describe('ARIA attributes', () => {
    it('should provide correct item ARIA attributes', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      const focusedItemProps = result.current.getItemAriaProps(0);
      const unfocusedItemProps = result.current.getItemAriaProps(1);

      expect(focusedItemProps.tabIndex).toBe(0);
      expect(focusedItemProps.role).toBe('option');
      expect(focusedItemProps['aria-selected']).toBe(false);

      expect(unfocusedItemProps.tabIndex).toBe(-1);
      expect(unfocusedItemProps.role).toBe('option');
      expect(unfocusedItemProps['aria-selected']).toBe(false);
    });

    it('should provide correct container ARIA attributes', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      const containerProps = result.current.getContainerAriaProps();

      expect(containerProps.role).toBe('listbox');
      expect(containerProps['aria-multiselectable']).toBe(false);
      expect(containerProps['aria-activedescendant']).toBe('1');
    });

    it('should update ARIA attributes during dragging', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Start dragging first item
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.selectedIndex).toBe(0);

      const draggedItemProps = result.current.getItemAriaProps(0);

      expect(draggedItemProps['aria-selected']).toBe(true);
      expect(draggedItemProps['aria-grabbed']).toBe(true);
      expect(draggedItemProps['aria-describedby']).toBe('drag-instructions');
    });
  });

  describe('screen reader announcements', () => {
    it('should announce focus changes', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Move focus to first item
      act(() => {
        result.current.moveFocus(0);
      });

      // Fast-forward timers to trigger announcement
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Item 1, 1 of 4',
        'polite'
      );
    });

    it('should announce drag start', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Clear any previous calls
      mockAnnounceToScreenReader.mockClear();

      // Start dragging
      act(() => {
        result.current.moveFocus(0);
      });

      // Fast-forward timers to trigger focus announcement
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Clear the focus announcement
      mockAnnounceToScreenReader.mockClear();

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      // Fast-forward timers to trigger drag start announcement
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Item 1 selected for moving. Use arrow keys to choose new position, spacebar to drop, or escape to cancel.',
        'assertive'
      );
    });

    it('should announce drag completion', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          onSelect: mockOnSelect,
          onDrop: mockOnDrop,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Clear any previous calls
      mockAnnounceToScreenReader.mockClear();

      // Start dragging and drop
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      act(() => {
        result.current.moveFocus(2);
      });

      // Clear previous announcements
      mockAnnounceToScreenReader.mockClear();

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      // Fast-forward timers to trigger announcement
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Item 1 moved to position 3.',
        'assertive'
      );
    });

    it('should debounce announcements', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Make multiple rapid announcements
      act(() => {
        result.current.announce('First message');
        result.current.announce('Second message');
        result.current.announce('Third message');
      });

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should only announce the last message
      expect(mockAnnounceToScreenReader).toHaveBeenCalledTimes(1);
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Third message',
        'polite'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: [],
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Try to move focus
      act(() => {
        result.current.moveFocus(0);
      });

      expect(result.current.focusedIndex).toBe(-1);

      // Try keyboard navigation
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusedIndex).toBe(-1);
    });

    it('should reset state when items change', () => {
      const { result, rerender } = renderHook(
        ({ items }) =>
          useKeyboardNavigation({
            items,
            announceToScreenReader: mockAnnounceToScreenReader,
          }),
        { initialProps: { items: mockItems } }
      );

      // Start dragging
      act(() => {
        result.current.moveFocus(0);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '));
      });

      expect(result.current.isDragging).toBe(true);

      // Change items to empty array
      rerender({ items: [] });

      expect(result.current.focusedIndex).toBe(-1);
      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBe(null);
    });

    it('should ignore modifier keys', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      const initialFocusedIndex = result.current.focusedIndex;

      // Try arrow key with Ctrl
      act(() => {
        result.current.handleKeyDown(
          createKeyboardEvent('ArrowDown', { ctrlKey: true })
        );
      });

      expect(result.current.focusedIndex).toBe(initialFocusedIndex);

      // Try arrow key with Meta
      act(() => {
        result.current.handleKeyDown(
          createKeyboardEvent('ArrowDown', { metaKey: true })
        );
      });

      expect(result.current.focusedIndex).toBe(initialFocusedIndex);
    });

    it('should cleanup timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() =>
        useKeyboardNavigation({
          items: mockItems,
          announceToScreenReader: mockAnnounceToScreenReader,
        })
      );

      // Make an announcement to create a timeout
      act(() => {
        result.current.announce('Test message');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
