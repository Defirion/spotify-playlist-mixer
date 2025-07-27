import React, { createContext, useState, useContext, useEffect } from 'react';

const DragContext = createContext();

export const DragProvider = ({ children }) => {
  // Simplified state - only global dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'html5', 'touch', 'keyboard'

  // Start drag operation
  const startDrag = (item, type = 'custom') => {
    console.log(`[DragContext] Starting drag: type=${type}`);
    setIsDragging(true);
    setDraggedItem(item);
    setDragType(type);
  };

  // End drag operation
  const endDrag = (reason = 'success') => {
    console.log(`[DragContext] Ending drag: reason=${reason}`);
    setIsDragging(false);
    setDraggedItem(null);
    setDragType(null);
  };

  // Cancel drag operation
  const cancelDrag = (reason = 'cancel') => {
    console.log(`[DragContext] Canceling drag: reason=${reason}`);
    setIsDragging(false);
    setDraggedItem(null);
    setDragType(null);
  };

  // Simple notification methods for coordination with useDraggable hook
  const notifyHTML5DragStart = () => {
    console.log('[DragContext] HTML5 drag started');
  };

  const notifyHTML5DragEnd = () => {
    console.log('[DragContext] HTML5 drag ended');
  };

  const notifyTouchDragStart = () => {
    console.log('[DragContext] Touch drag started');
  };

  const notifyTouchDragEnd = () => {
    console.log('[DragContext] Touch drag ended');
  };

  // Handle body class for drag state and scroll position preservation
  useEffect(() => {
    if (isDragging) {
      // Store current scroll position before applying fixed positioning
      const scrollY = window.scrollY;
      document.body.setAttribute('data-scroll-locked', scrollY.toString());
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Apply drag classes
      document.body.classList.add('no-user-select');
      document.body.classList.add('drag-active');
    } else {
      // Restore scroll position
      if (document.body.hasAttribute('data-scroll-locked')) {
        const scrollY = parseInt(
          document.body.getAttribute('data-scroll-locked'),
          10
        );
        // Reset all positioning styles immediately
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-locked');

        // Defer scroll restoration to allow DOM to settle and local scroll restoration to complete
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }

      // Remove drag classes
      document.body.classList.remove('no-user-select');
      document.body.classList.remove('drag-active');
    }

    return () => {
      // Cleanup on unmount
      if (document.body.hasAttribute('data-scroll-locked')) {
        const scrollY = parseInt(
          document.body.getAttribute('data-scroll-locked'),
          10
        );
        // Reset all positioning styles immediately
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-locked');

        // Defer scroll restoration to allow DOM to settle
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
      document.body.classList.remove('no-user-select');
      document.body.classList.remove('drag-active');
    };
  }, [isDragging]);

  const contextValue = {
    // State
    isDragging,
    draggedItem,
    dragType,

    // Actions
    startDrag,
    endDrag,
    cancelDrag,

    // Coordination methods (for backward compatibility)
    notifyHTML5DragStart,
    notifyHTML5DragEnd,
    notifyTouchDragStart,
    notifyTouchDragEnd,
  };

  return (
    <DragContext.Provider value={contextValue}>{children}</DragContext.Provider>
  );
};

export const useDrag = () => useContext(DragContext);
