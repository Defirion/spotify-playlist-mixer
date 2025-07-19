import React, { createContext, useContext, useState, useEffect } from 'react';

const DragContext = createContext();

export const useDragContext = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};

export const DragProvider = ({ children }) => {
  const [externalDragData, setExternalDragData] = useState(null);
  const [isExternalDragActive, setIsExternalDragActive] = useState(false);

  const startExternalDrag = (track, type) => {
    setExternalDragData({ track, type });
    setIsExternalDragActive(true);
  };

  const endExternalDrag = (wasSuccessful = false) => {
    setExternalDragData(null);
    setIsExternalDragActive(false);
    return wasSuccessful;
  };

  const cancelExternalDrag = () => {
    setExternalDragData(null);
    setIsExternalDragActive(false);
  };

  // Global drag end handler to clean up failed drags
  useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      // Only clean up if we have an active external drag
      if (isExternalDragActive) {
        // Small delay to allow drop events to process first
        setTimeout(() => {
          // If drag is still active after delay, it means drop failed
          if (isExternalDragActive) {
            cancelExternalDrag();
          }
        }, 50);
      }
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, [isExternalDragActive]);

  const value = {
    externalDragData,
    isExternalDragActive,
    startExternalDrag,
    endExternalDrag,
    cancelExternalDrag
  };

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  );
};