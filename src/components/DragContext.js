import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';

const DragContext = createContext();

export const DragProvider = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isDropSuccessful, setIsDropSuccessful] = useState(false);
  const [dragType, setDragType] = useState(null); // 'html5', 'custom', 'touch'

  // Refs for cleanup timers and state tracking
  const cleanupTimerRef = useRef(null);
  const dragStateRef = useRef({
    html5Active: false,
    customActive: false,
    touchActive: false,
    pendingCleanup: false
  });

  // Unified cleanup function that handles both HTML5 and custom states
  const unifiedCleanup = useCallback((reason = 'unknown') => {
    console.log(`[DragContext] Unified cleanup triggered: ${reason}`);

    // Clear any pending cleanup timer
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    // Reset all states
    setIsDragging(false);
    setDraggedItem(null);
    setDragType(null);
    setIsDropSuccessful(false);

    // Reset internal tracking
    dragStateRef.current = {
      html5Active: false,
      customActive: false,
      touchActive: false,
      pendingCleanup: false
    };
  }, []);

  // Failsafe timer-based cleanup for stuck states
  const scheduleFailsafeCleanup = useCallback((delay = 60000) => { // Increased to 60 seconds
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
    }

    cleanupTimerRef.current = setTimeout(() => {
      console.log('[DragContext] Failsafe cleanup triggered - drag state was stuck');
      unifiedCleanup('failsafe-timeout');
    }, delay);
  }, [unifiedCleanup]);

  const startDrag = useCallback((item, type = 'custom') => {
    console.log(`[DragContext] Starting drag: type=${type}`);

    // Clear any existing cleanup timer
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    setIsDragging(true);
    setDraggedItem(item);
    setDragType(type);
    setIsDropSuccessful(false);

    // Update internal tracking
    dragStateRef.current.customActive = true;
    if (type === 'html5') dragStateRef.current.html5Active = true;
    if (type === 'touch') dragStateRef.current.touchActive = true;

    // Schedule failsafe cleanup
    scheduleFailsafeCleanup();
  }, [scheduleFailsafeCleanup]);

  const endDrag = useCallback((reason = 'success') => {
    console.log(`[DragContext] Ending drag: reason=${reason}`);

    setIsDropSuccessful(reason === 'success');

    // Mark custom drag as complete
    dragStateRef.current.customActive = false;

    // If no HTML5 drag is active, do immediate cleanup
    if (!dragStateRef.current.html5Active) {
      unifiedCleanup(`end-drag-${reason}`);
    } else {
      // HTML5 drag still active, delay cleanup to coordinate with dragend
      console.log('[DragContext] Delaying cleanup - waiting for HTML5 dragend');
      dragStateRef.current.pendingCleanup = true;

      // Longer failsafe for coordination to allow user time
      scheduleFailsafeCleanup(30000); // 30 seconds for coordination
    }
  }, [unifiedCleanup, scheduleFailsafeCleanup]);

  const cancelDrag = useCallback((reason = 'cancel') => {
    console.log(`[DragContext] Canceling drag: reason=${reason}`);
    unifiedCleanup(`cancel-${reason}`);
  }, [unifiedCleanup]);

  // HTML5 drag coordination methods
  const notifyHTML5DragStart = useCallback(() => {
    console.log('[DragContext] HTML5 drag started');
    dragStateRef.current.html5Active = true;
  }, []);

  const notifyHTML5DragEnd = useCallback(() => {
    console.log('[DragContext] HTML5 drag ended');
    dragStateRef.current.html5Active = false;

    // If custom drag is complete or there's pending cleanup, do it now
    if (!dragStateRef.current.customActive || dragStateRef.current.pendingCleanup) {
      unifiedCleanup('html5-dragend');
    }
  }, [unifiedCleanup]);

  // Touch drag coordination methods
  const notifyTouchDragStart = useCallback(() => {
    console.log('[DragContext] Touch drag started');
    dragStateRef.current.touchActive = true;
  }, []);

  const notifyTouchDragEnd = useCallback(() => {
    console.log('[DragContext] Touch drag ended');
    dragStateRef.current.touchActive = false;

    // If no other drags active, cleanup
    if (!dragStateRef.current.html5Active && !dragStateRef.current.customActive) {
      unifiedCleanup('touch-dragend');
    }
  }, [unifiedCleanup]);

  // Component unmount cleanup
  React.useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  // Add to DragProvider component
  useEffect(() => {
    const handleDragClass = () => {
      if (isDragging) {
        document.body.classList.add('no-user-select');
      } else {
        document.body.classList.remove('no-user-select');
      }
    };

    handleDragClass();
    
    return () => {
      document.body.classList.remove('no-user-select');
    };
  }, [isDragging]);

  const contextValue = {
    isDragging,
    draggedItem,
    dragType,
    isDropSuccessful,
    startDrag,
    endDrag,
    cancelDrag,
    unifiedCleanup,
    notifyHTML5DragStart,
    notifyHTML5DragEnd,
    notifyTouchDragStart,
    notifyTouchDragEnd,
    // Debug info
    _debugState: dragStateRef.current
  };

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = () => useContext(DragContext);
