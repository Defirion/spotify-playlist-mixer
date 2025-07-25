import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for keyboard navigation and accessibility in drag-and-drop scenarios
 * @param {Object} options - Configuration options
 * @param {Array} options.items - Array of items to navigate through
 * @param {Function} options.onSelect - Called when an item is selected (spacebar)
 * @param {Function} options.onMove - Called when an item should be moved (arrow keys)
 * @param {Function} options.onDrop - Called when an item is dropped (spacebar again)
 * @param {string} options.orientation - Navigation orientation ('vertical' | 'horizontal')
 * @param {boolean} options.loop - Whether navigation should loop at boundaries
 * @param {Function} options.getItemId - Function to get unique ID from item
 * @param {Function} options.announceToScreenReader - Function to announce changes
 * @returns {Object} Navigation state and handlers
 */
const useKeyboardNavigation = ({
  items = [],
  onSelect,
  onMove,
  onDrop,
  orientation = 'vertical',
  loop = false,
  getItemId = (item, index) => item?.id || index,
  announceToScreenReader,
} = {}) => {
  // Navigation state
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Refs for managing focus and announcements
  const announcementTimeoutRef = useRef(null);
  const lastAnnouncementRef = useRef('');

  // Announce changes to screen readers with debouncing
  const announce = useCallback(
    (message, priority = 'polite') => {
      if (
        !announceToScreenReader ||
        !message ||
        message === lastAnnouncementRef.current
      ) {
        return;
      }

      // Clear previous timeout
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }

      // Debounce announcements to avoid overwhelming screen readers
      announcementTimeoutRef.current = setTimeout(() => {
        announceToScreenReader(message, priority);
        lastAnnouncementRef.current = message;
      }, 100);
    },
    [announceToScreenReader]
  );

  // Move focus to a specific index
  const moveFocus = useCallback(
    (newIndex, reason = 'navigation') => {
      if (items.length === 0) return;

      let targetIndex = newIndex;

      // Handle boundary conditions
      if (targetIndex < 0) {
        targetIndex = loop ? items.length - 1 : 0;
      } else if (targetIndex >= items.length) {
        targetIndex = loop ? 0 : items.length - 1;
      }

      setFocusedIndex(targetIndex);

      // Announce the focused item
      if (items[targetIndex]) {
        const item = items[targetIndex];
        const itemName = item.name || `Item ${targetIndex + 1}`;

        let message = `${itemName}`;

        if (isDragging && selectedIndex === targetIndex) {
          message += ', selected for moving';
        } else if (isDragging) {
          message += `, position ${targetIndex + 1} of ${items.length}`;
        } else {
          message += `, ${targetIndex + 1} of ${items.length}`;
        }

        announce(message);
      }
    },
    [items, loop, isDragging, selectedIndex, announce]
  );

  // Handle item selection (spacebar)
  const handleSelect = useCallback(
    (index = focusedIndex) => {
      if (index < 0 || index >= items.length) return;

      const item = items[index];

      if (!isDragging) {
        // Start dragging
        setSelectedIndex(index);
        setIsDragging(true);
        setDraggedItem(item);

        if (onSelect) {
          onSelect(item, index);
        }

        const itemName = item.name || `Item ${index + 1}`;
        announce(
          `${itemName} selected for moving. Use arrow keys to choose new position, spacebar to drop, or escape to cancel.`,
          'assertive'
        );
      } else {
        // Drop item
        if (onDrop) {
          onDrop(draggedItem, selectedIndex, index);
        }

        const itemName = draggedItem?.name || `Item ${selectedIndex + 1}`;
        const newPosition = index + 1;

        // Reset dragging state
        setIsDragging(false);
        setSelectedIndex(-1);
        setDraggedItem(null);

        announce(`${itemName} moved to position ${newPosition}.`, 'assertive');
      }
    },
    [
      focusedIndex,
      items,
      isDragging,
      selectedIndex,
      draggedItem,
      onSelect,
      onDrop,
      announce,
    ]
  );

  // Handle item movement (arrow keys during drag)
  const handleMove = useCallback(
    direction => {
      if (!isDragging || selectedIndex < 0) return;

      let newIndex = selectedIndex;

      if (orientation === 'vertical') {
        newIndex = direction === 'up' ? selectedIndex - 1 : selectedIndex + 1;
      } else {
        newIndex = direction === 'left' ? selectedIndex - 1 : selectedIndex + 1;
      }

      // Clamp to valid range
      newIndex = Math.max(0, Math.min(items.length - 1, newIndex));

      if (newIndex !== selectedIndex && onMove) {
        onMove(draggedItem, selectedIndex, newIndex);
        setSelectedIndex(newIndex);

        const itemName = draggedItem?.name || `Item ${selectedIndex + 1}`;
        announce(
          `${itemName} moved to position ${newIndex + 1} of ${items.length}.`
        );
      }
    },
    [
      isDragging,
      selectedIndex,
      orientation,
      items.length,
      onMove,
      draggedItem,
      announce,
    ]
  );

  // Cancel dragging (escape key)
  const cancelDrag = useCallback(() => {
    if (isDragging) {
      const itemName = draggedItem?.name || `Item ${selectedIndex + 1}`;

      setIsDragging(false);
      setSelectedIndex(-1);
      setDraggedItem(null);

      announce(`Moving ${itemName} cancelled.`, 'assertive');
    }
  }, [isDragging, draggedItem, selectedIndex, announce]);

  // Main keyboard event handler
  const handleKeyDown = useCallback(
    event => {
      const { key, shiftKey, ctrlKey, metaKey } = event;

      // Ignore if modifier keys are pressed (except shift for some cases)
      if (ctrlKey || metaKey) return;

      switch (key) {
        case ' ': // Spacebar - select/drop
          event.preventDefault();
          handleSelect();
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (isDragging) {
            handleMove('up');
          } else {
            moveFocus(focusedIndex - 1);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (isDragging) {
            handleMove('down');
          } else {
            moveFocus(focusedIndex + 1);
          }
          break;

        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            event.preventDefault();
            if (isDragging) {
              handleMove('left');
            } else {
              moveFocus(focusedIndex - 1);
            }
          }
          break;

        case 'ArrowRight':
          if (orientation === 'horizontal') {
            event.preventDefault();
            if (isDragging) {
              handleMove('right');
            } else {
              moveFocus(focusedIndex + 1);
            }
          }
          break;

        case 'Home':
          event.preventDefault();
          if (!isDragging) {
            moveFocus(0);
          }
          break;

        case 'End':
          event.preventDefault();
          if (!isDragging) {
            moveFocus(items.length - 1);
          }
          break;

        case 'Escape':
          event.preventDefault();
          cancelDrag();
          break;

        case 'Enter':
          // Allow Enter to work like spacebar for selection
          event.preventDefault();
          handleSelect();
          break;

        default:
          break;
      }
    },
    [
      focusedIndex,
      isDragging,
      orientation,
      items.length,
      handleSelect,
      handleMove,
      moveFocus,
      cancelDrag,
    ]
  );

  // Reset state when items change
  useEffect(() => {
    if (items.length === 0) {
      setFocusedIndex(-1);
      setSelectedIndex(-1);
      setIsDragging(false);
      setDraggedItem(null);
    } else if (focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1);
    }
  }, [items.length, focusedIndex]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  // Get ARIA attributes for an item
  const getItemAriaProps = useCallback(
    index => {
      const isFocused = index === focusedIndex;
      const isSelected = index === selectedIndex && isDragging;

      return {
        'aria-selected': isSelected,
        'aria-grabbed': isSelected,
        'aria-describedby': isDragging ? 'drag-instructions' : undefined,
        tabIndex: isFocused ? 0 : -1,
        role: 'option',
      };
    },
    [focusedIndex, selectedIndex, isDragging]
  );

  // Get ARIA attributes for the container
  const getContainerAriaProps = useCallback(() => {
    return {
      role: 'listbox',
      'aria-multiselectable': false,
      'aria-activedescendant':
        focusedIndex >= 0
          ? getItemId(items[focusedIndex], focusedIndex)
          : undefined,
    };
  }, [focusedIndex, items, getItemId]);

  return {
    // State
    focusedIndex,
    selectedIndex,
    isDragging,
    draggedItem,

    // Event handlers
    handleKeyDown,

    // Navigation functions
    moveFocus,
    handleSelect,
    handleMove,
    cancelDrag,

    // ARIA helpers
    getItemAriaProps,
    getContainerAriaProps,

    // Utility functions
    announce,
  };
};

export default useKeyboardNavigation;
