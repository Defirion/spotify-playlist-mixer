// Comprehensive drag-and-drop type definitions for the refactored system

import { SpotifyTrack } from './spotify';
import { MixedTrack } from './mixer';

/**
 * Defines the different types of drag sources in the application
 */
export type DragSourceType = 'internal-track' | 'modal-track' | 'search-track';

/**
 * Type-safe payload definitions for each drag source type
 * Uses mapped types to ensure strict typing based on the source type
 */
export type DraggedItemPayload = {
  'internal-track': {
    track: MixedTrack;
    index: number;
  };
  'modal-track': {
    track: SpotifyTrack;
    source: string;
  };
  'search-track': {
    track: SpotifyTrack;
    query: string;
  };
};

/**
 * Generic dragged item interface with strict type constraints
 * T extends DragSourceType ensures only valid source types are used
 */
export interface DraggedItem<T extends DragSourceType = DragSourceType> {
  /** Unique identifier for the dragged item */
  id: string;
  /** Type of drag source - determines payload structure */
  type: T;
  /** Type-safe payload based on the drag source type */
  payload: DraggedItemPayload[T];
  /** Timestamp when drag operation started (for debugging and cleanup) */
  timestamp: number;
}

/**
 * Centralized drag state interface for Zustand store
 * Manages global drag operations and prevents concurrent drags
 */
export interface DragState {
  /** Whether any drag operation is currently active */
  isDragging: boolean;
  /** Currently dragged item, null when not dragging */
  draggedItem: DraggedItem | null;
  /** Timestamp when current drag operation started */
  dragStartTime: number | null;

  /** Start a new drag operation with type-safe item */
  startDrag: <T extends DragSourceType>(item: DraggedItem<T>) => void;
  /** End the current drag operation successfully */
  endDrag: () => void;
  /** Cancel the current drag operation (e.g., on escape key) */
  cancelDrag: () => void;
}

/**
 * Scroll position management interface for preserving scroll state
 * during drag operations and track list updates
 */
export interface ScrollPositionState {
  /** Captured scroll position, null when not captured */
  scrollTop: number | null;

  /** Capture current scroll position of a container */
  captureScrollPosition: (container: HTMLElement) => void;
  /** Restore previously captured scroll position */
  restoreScrollPosition: (container: HTMLElement) => void;
  /** Clear captured scroll position */
  clearScrollPosition: () => void;
}

/**
 * Combined drag and scroll state interface for the Zustand slice
 */
export interface DragSlice extends DragState, ScrollPositionState {}

/**
 * Options for configuring drag behavior in useDraggable hook
 */
export interface DragOptions<T extends DragSourceType> {
  /** Type of drag source */
  type: T;
  /** Data associated with the draggable item */
  data: DraggedItemPayload[T] extends { track: infer U }
    ? U & { index?: number; source?: string; query?: string }
    : any;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Delay before touch drag starts (ms) */
  longPressDelay?: number;
  /** Distance threshold for auto-scroll activation */
  scrollThreshold?: number;
  /** Container element for auto-scroll */
  scrollContainer?: HTMLElement | null;
  /** Callback when drag starts */
  onDragStart?: (item: DraggedItem<T>) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: DraggedItem<T> | null, success: boolean) => void;
  /** Callback for keyboard navigation during drag */
  onMove?: (direction: 'up' | 'down') => void;
}

/**
 * Props returned by useDraggable hook for drag handle elements
 */
export interface DragHandleProps {
  /** HTML5 draggable attribute */
  draggable: boolean;
  /** Drag start event handler */
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  /** Drag end event handler */
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
  /** Touch start event handler */
  onTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
  /** Touch move event handler */
  onTouchMove: (event: React.TouchEvent<HTMLElement>) => void;
  /** Touch end event handler */
  onTouchEnd: (event: React.TouchEvent<HTMLElement>) => void;
  /** Keyboard event handler */
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** Tab index for keyboard accessibility */
  tabIndex: number;
  /** ARIA role for accessibility */
  role: string;
  /** ARIA grabbed state for accessibility */
  'aria-grabbed': boolean;
  /** CSS classes for drag state */
  className?: string;
  /** Inline styles for drag feedback */
  style?: React.CSSProperties;
}

/**
 * Props returned by useDraggable hook for drop zone elements
 */
export interface DropZoneProps {
  /** Drag over event handler */
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  /** Drop event handler */
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  /** Drag leave event handler */
  onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
}

/**
 * Return type for useDraggable hook
 */
export interface UseDraggableReturn {
  /** Props to spread on drag handle elements */
  dragHandleProps: DragHandleProps;
  /** Props to spread on drop zone elements */
  dropZoneProps: DropZoneProps;
  /** Whether any drag operation is active */
  isDragging: boolean;
  /** Whether this specific item is being dragged */
  isCurrentlyDragged: boolean;
  /** Currently dragged item */
  draggedItem: DraggedItem | null;
}

/**
 * Touch drag state for internal touch handling
 */
export interface TouchDragState {
  /** Whether touch drag is active */
  isActive: boolean;
  /** Touch start timestamp */
  startTime: number;
  /** Initial touch X coordinate */
  startX: number;
  /** Initial touch Y coordinate */
  startY: number;
  /** Current touch X coordinate */
  currentX: number;
  /** Current touch Y coordinate */
  currentY: number;
  /** Long press timer reference */
  longPressTimer: NodeJS.Timeout | null;
  /** Whether long press has been triggered */
  isLongPress: boolean;
}

/**
 * Auto-scroll configuration options
 */
export interface AutoScrollOptions {
  /** Container element to scroll */
  scrollContainer?: HTMLElement | null;
  /** Distance from edge to trigger auto-scroll */
  scrollThreshold?: number;
  /** Minimum scroll speed */
  minScrollSpeed?: number;
  /** Maximum scroll speed */
  maxScrollSpeed?: number;
}

/**
 * Visual feedback configuration for drag operations
 */
export interface DragVisualFeedback {
  /** CSS classes to apply during drag */
  dragClasses: Record<string, boolean>;
  /** Inline styles to apply during drag */
  dragStyles: React.CSSProperties;
}

/**
 * Drop position calculation result
 */
export interface DropPosition {
  /** Index where item should be inserted */
  index: number;
  /** Whether drop is at the beginning of list */
  isFirst: boolean;
  /** Whether drop is at the end of list */
  isLast: boolean;
  /** Y coordinate of drop position */
  y: number;
}

/**
 * Modal coordination state for visual feedback during drag operations
 */
export interface ModalCoordinationState {
  /** Whether modal should be visually muted */
  isMuted: boolean;
  /** Whether modal interactions should be disabled */
  isInteractionDisabled: boolean;
  /** Source of current drag operation */
  dragSource: DragSourceType | null;
}

/**
 * Error boundary state for drag operations
 */
export interface DragErrorState {
  /** Whether an error occurred during drag */
  hasError: boolean;
  /** Error message */
  error: Error | null;
  /** Error boundary info */
  errorInfo: React.ErrorInfo | null;
}

/**
 * Performance monitoring for drag operations
 */
export interface DragPerformanceMetrics {
  /** Drag operation start time */
  startTime: number;
  /** Drag operation end time */
  endTime: number | null;
  /** Number of move events during drag */
  moveEventCount: number;
  /** Whether drag operation was successful */
  wasSuccessful: boolean;
}

/**
 * Type guard to check if an item is a specific drag source type
 */
export function isDragSourceType<T extends DragSourceType>(
  item: DraggedItem,
  type: T
): item is DraggedItem<T> {
  return item.type === type;
}

/**
 * Type guard to check if drag payload matches expected structure
 */
export function isValidDragPayload<T extends DragSourceType>(
  payload: any,
  type: T
): payload is DraggedItemPayload[T] {
  switch (type) {
    case 'internal-track':
      return (
        payload &&
        typeof payload.track === 'object' &&
        typeof payload.index === 'number'
      );
    case 'modal-track':
      return (
        payload &&
        typeof payload.track === 'object' &&
        typeof payload.source === 'string'
      );
    case 'search-track':
      return (
        payload &&
        typeof payload.track === 'object' &&
        typeof payload.query === 'string'
      );
    default:
      return false;
  }
}

/**
 * Utility type to extract track type from drag payload
 */
export type ExtractTrackType<T extends DragSourceType> =
  T extends 'internal-track'
    ? MixedTrack
    : T extends 'modal-track'
      ? SpotifyTrack
      : T extends 'search-track'
        ? SpotifyTrack
        : never;

/**
 * Utility type to create a drag item with proper typing
 */
export type CreateDragItem<T extends DragSourceType> = {
  type: T;
  track: ExtractTrackType<T>;
} & (T extends 'internal-track'
  ? { index: number }
  : T extends 'modal-track'
    ? { source: string }
    : T extends 'search-track'
      ? { query: string }
      : never);
