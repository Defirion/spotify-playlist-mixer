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

  // Handle body class for drag state
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add('no-user-select');
    } else {
      document.body.classList.remove('no-user-select');
    }

    return () => {
      document.body.classList.remove('no-user-select');
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
