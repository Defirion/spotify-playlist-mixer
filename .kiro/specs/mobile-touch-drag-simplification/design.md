# Design Document

## Overview

The simplified unified drag system will replace the current complex implementation with a streamlined, reliable approach that handles mouse, touch, and keyboard inputs cleanly. The design eliminates coordination complexity, reduces state management to essentials, and provides dedicated handler files for each input method. The system will be coordinated by a single `useSimpleDraggable` hook that manages all input methods independently without interference or complex timing logic.

## Architecture

### Core Components

1. **useSimpleDraggable Hook** - Single hook that coordinates separate input method handlers
2. **Separate Input Method Handlers** - Dedicated handler files for mouse, touch, and keyboard
3. **Zustand State Management** - Minimal state using simplified Zustand slice
4. **Direct Drop Zone Detection** - Element queries for drop zone detection
5. **Input Method Switching** - Clean enabling/disabling of input methods

### Component Interaction Flows

**Mouse Flow:**
```
Mouse Down → HTML5 Drag Start → Drag Over → Drop → Drag End
```

**Touch Flow:**
```
Touch Start → Long Press (300ms) → Touch Move → Drop Zone Detection → Touch End → Drop
```

**Keyboard Flow:**
```
Focus → Arrow Keys → Space/Enter → Move → Space/Enter → Drop
```

### Eliminated Components

- Complex coordination between input methods
- Custom event dispatching systems
- Multiple coordinating hooks (useTouchDrag, useDragHandlers, etc.)
- setTimeout-based state updates
- Complex error recovery services
- Excessive logging and debugging systems

## Components and Interfaces

### useSimpleDraggable Hook

```typescript
interface DragState {
  isDragging: boolean;
  draggedItem: any;
  inputMethod: 'mouse' | 'touch' | 'keyboard' | null;
  touchState?: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    longPressTimer: NodeJS.Timeout | null;
  };
  keyboardState?: {
    selectedIndex: number;
    isActive: boolean;
  };
}

interface UseDraggableOptions {
  data: any;
  type: string;
  onDragStart?: (item: any) => void;
  onDragMove?: (x: number, y: number) => void;
  onDrop?: (item: any, dropTarget: HTMLElement | null) => void;
  longPressDelay?: number; // Default: 300ms
  disabled?: boolean;
}

interface UseDraggableReturn {
  // Props for draggable elements
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: (e: DragEvent) => void;
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    tabIndex: number;
  };
  // Props for drop zones
  dropZoneProps: {
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  // State
  isDragging: boolean;
  draggedItem: any;
}
```

### Event Handler Design

**Mouse Handlers:**
- Use native HTML5 drag events for optimal desktop experience
- Disable touch handlers when mouse drag is active
- Standard dragstart, dragover, drop event handling

**Touch Handlers:**
- Disable HTML5 draggable when touch is detected
- Start long press timer (300ms) on touch start
- Use direct drop zone detection on touch end
- Re-enable HTML5 draggable after touch sequence

**Keyboard Handlers:**
- Use arrow keys for navigation
- Space/Enter to start/end drag operations
- Visual focus indicators for accessibility
- Works independently of mouse/touch

### Visual Feedback System

**Drag Start Feedback:**
```css
.touch-dragging {
  opacity: 0.7;
  transform: scale(1.02);
  z-index: 1000;
  pointer-events: none;
}
```

**Global Drag State Feedback:**
```css
body.drag-active {
  background-color: rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease;
}

.modal.drag-active {
  opacity: 0.6;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
```

**Drop Zone Container Feedback:**
```css
.drop-zone-active {
  background-color: rgba(0, 255, 0, 0.1);
  border: 2px dashed #00ff00;
}
```

**Drop Line Between Tracks:**
```css
.drop-line {
  height: 3px;
  background: linear-gradient(90deg, #00ff00, #00aa00);
  border-radius: 2px;
  margin: 2px 0;
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.drop-line-first {
  margin-top: 8px;
}

.drop-line-last {
  margin-bottom: 8px;
}
```

### Drop Zone Detection

Direct element detection using `document.elementFromPoint()`:

```typescript
const detectDropZone = (x: number, y: number): HTMLElement | null => {
  const element = document.elementFromPoint(x, y);
  return element?.closest('[data-drop-zone]') as HTMLElement | null;
};

const calculateDropPosition = (clientY: number, container: HTMLElement) => {
  const tracks = container.querySelectorAll('[data-track-item]');
  const containerRect = container.getBoundingClientRect();
  const relativeY = clientY - containerRect.top;
  
  // Find the closest track and determine if we're above or below it
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i] as HTMLElement;
    const trackRect = track.getBoundingClientRect();
    const trackRelativeTop = trackRect.top - containerRect.top;
    const trackRelativeBottom = trackRect.bottom - containerRect.top;
    
    if (relativeY < trackRelativeTop + (trackRect.height / 2)) {
      return { index: i, position: 'before', element: track };
    }
  }
  
  // If we're past all tracks, drop at the end
  return { index: tracks.length, position: 'after', element: tracks[tracks.length - 1] };
};
```

## Data Models

### Simplified Zustand Drag State Model

```typescript
interface SimpleDragState {
  // Core state only - no complex coordination
  isDragging: boolean;
  draggedItem: any;
  inputMethod: 'mouse' | 'touch' | 'keyboard' | null;
}

interface SimpleDragSlice {
  // State
  isDragging: boolean;
  draggedItem: any;
  inputMethod: 'mouse' | 'touch' | 'keyboard' | null;
  
  // Actions
  startDrag: (item: any, method: 'mouse' | 'touch' | 'keyboard') => void;
  endDrag: () => void;
  resetDrag: () => void;
}
```

### Drop Target Model

```typescript
interface DropTarget {
  element: HTMLElement;
  index: number;           // Drop position index
  type: 'before' | 'after' | 'replace';
}
```

## Error Handling

### Simple Error Strategy

1. **Try-Catch Blocks** - Wrap all event handlers in try-catch
2. **Immediate Reset** - On any error, reset state to clean state
3. **User Feedback** - Show simple error message if needed
4. **No Recovery Logic** - Don't attempt complex error recovery

```typescript
const handleTouchStart = (e: TouchEvent) => {
  try {
    // Touch start logic
  } catch (error) {
    console.error('Touch drag error:', error);
    resetDragState();
  }
};
```

### Error Reset Function

```typescript
const resetDragState = () => {
  setTouchState({
    isActive: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    draggedElement: null,
    longPressTimer: null,
  });
  clearVisualFeedback();
};
```

## Testing Strategy

### Unit Tests

1. **Long Press Detection** - Test 300ms timer triggers drag start
2. **Input Method Switching** - Test clean enabling/disabling of input methods
3. **Drop Zone Detection** - Test `elementFromPoint` correctly identifies drop zones
4. **State Management** - Test state transitions are correct
5. **Error Handling** - Test error scenarios reset state properly

### Integration Tests

1. **Track Reordering** - Test dragging tracks to new positions
2. **Modal Integration** - Test dragging from modals to track list
3. **Visual Feedback** - Test CSS classes are applied/removed correctly
4. **Mobile Devices** - Test on actual mobile devices

### Test Structure

```typescript
describe('useDraggable', () => {
  it('should start drag after 300ms long press on touch', () => {
    // Test touch long press detection
  });
  
  it('should use HTML5 drag events for mouse input', () => {
    // Test mouse drag functionality
  });
  
  it('should support keyboard navigation', () => {
    // Test keyboard accessibility
  });
  
  it('should detect drop zones correctly', () => {
    // Test drop zone detection
  });
  
  it('should reset state on errors', () => {
    // Test error handling
  });
});
```

## Implementation Plan

### Phase 1: Unified Hook Implementation
- Create new `useDraggable` hook with input method separation
- Implement mouse handlers using HTML5 drag events
- Implement touch handlers with 300ms long press detection
- Implement keyboard handlers for accessibility

### Phase 2: Input Method Switching
- Add logic to enable/disable input methods cleanly
- Prevent conflicts between mouse and touch
- Ensure keyboard works independently

### Phase 3: Drop Zone Integration
- Implement drop zone detection for all input methods
- Add visual feedback that works across input types
- Integrate with existing track list drop logic

### Phase 4: Component Integration and Testing
- Replace existing complex `useDraggable` with simplified `useSimpleDraggable` version
- Test on desktop (mouse), mobile (touch), and keyboard navigation
- Ensure no regression in existing functionality

## Performance Considerations

### Optimizations

1. **Event Throttling** - Throttle touch move events to 60fps
2. **Direct DOM Access** - Use direct DOM queries instead of React refs where possible
3. **Minimal Re-renders** - Update state only when necessary
4. **CSS Transforms** - Use CSS transforms for visual feedback instead of JavaScript

### Memory Management

1. **Timer Cleanup** - Always clear long press timers
2. **Event Listener Cleanup** - Remove event listeners on unmount
3. **State Reset** - Reset state immediately after operations
4. **No Memory Leaks** - Avoid closures that capture large objects

## Security Considerations

### Input Validation

1. **Touch Event Validation** - Validate touch events have required properties
2. **Coordinate Bounds** - Ensure coordinates are within viewport bounds
3. **Element Validation** - Validate DOM elements exist before manipulation

### XSS Prevention

1. **No innerHTML** - Never use innerHTML for dynamic content
2. **Safe DOM Manipulation** - Use safe DOM methods for element queries
3. **Event Sanitization** - Sanitize event data before processing

## Migration Strategy

### Backward Compatibility

1. **Gradual Replacement** - Replace complex hooks one component at a time
2. **Feature Parity** - Ensure all existing functionality works
3. **Fallback Support** - Keep old system as fallback during migration

### Migration Steps

1. **Create New Hook** - Implement `useSimpleDraggable` alongside existing system
2. **Update TrackListItem** - Replace complex drag logic with simple hook
3. **Update DraggableTrackList** - Simplify container drag handling
4. **Remove Old Code** - Remove complex coordination and error handling systems
5. **Clean Up** - Remove unused hooks, services, and documentation

## Success Metrics

### Reliability Metrics

1. **Drag Success Rate** - >95% of drags should complete successfully across all input methods
2. **Error Rate** - <1% of drag operations should result in errors
3. **Performance** - Touch response time <50ms, mouse response immediate
4. **Code Complexity** - Unified drag implementation <300 lines of code

### User Experience Metrics

1. **Touch Responsiveness** - Long press detection within 300ms
2. **Mouse Compatibility** - Native HTML5 drag behavior on desktop
3. **Keyboard Accessibility** - Full keyboard navigation support
4. **Cross-Platform** - Works on desktop browsers, iOS Safari, Chrome Mobile, Firefox Mobile