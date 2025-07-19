import React, { createContext, useState, useContext } from 'react';

const DragContext = createContext();

export const DragProvider = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isDropSuccessful, setIsDropSuccessful] = useState(false);

  const startDrag = (item) => {
    setIsDragging(true);
    setDraggedItem(item);
    setIsDropSuccessful(false); // Reset for new drag operation
  };

  const endDrag = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setIsDropSuccessful(true); // Mark as successful drop
  };

  const cancelDrag = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setIsDropSuccessful(false); // Mark as unsuccessful drop
  };

  return (
    <DragContext.Provider value={{ isDragging, draggedItem, startDrag, endDrag, cancelDrag, isDropSuccessful }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = () => useContext(DragContext);
