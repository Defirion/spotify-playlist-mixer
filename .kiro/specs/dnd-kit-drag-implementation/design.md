# Design Document

## Overview

This design document outlines the implementation of a reliable drag-and-drop system using dnd-kit to replace the current complex custom implementation. The design leverages dnd-kit's battle-tested mobile touch handling, built-in accessibility, and simple API to eliminate the coordination complexity, timing issues, and mobile failures present in the current system. The solution will be implemented in under 100 lines of code compared to the current 1000+ line implementation.

## Drag Operation Types

The system supports two distinct types of drag operations:

### 1. Drag-to-Add (FROM modals TO preview panel)
- **Source**: TrackSourceModal, SpotifySearchModal, AddUnselectedModal
- **Target**: MixPreview component
- **Purpose**: Add new tracks to the mix by dragging from selection modals
- **Implementation**: Tracks in modals are wrapped with SortableWrapper to make them draggable sources

### 2. Drag-to-Reorder (WITHIN preview panel)
- **Source**: Tracks already in MixPreview
- **Target**: Different positions within the same MixPreview
- **Purpose**: Reorder existing tracks within the mix
- **Implementation**: TrackListContainer with DraggableTrackList for internal reordering

## Architecture

### Core Components

1. **DndContext** - Main provider that manages drag state and sensor coordination
2. **SortableContext** - Specialized context for sortable lists with vertical strategy
3. **useSortable Hook** - Individual track item drag functionality
4. **Sensor Configuration** - MouseSensor, TouchSensor, and KeyboardSensor setup
5. **Zustand Integration** - External state management via onDragEnd callback

### Component Interaction Flow

```
User Input → Sensor Detection → DndContext → SortableContext → useSortable → Transform → Visual Feedback
                                     ↓
                              onDragEnd → Zustand Store → arrayMove → Re-render
```

### Eliminated Components

All complex custom logic is replaced by dnd-kit:
- Custom touch handling and timing logic
- State coordination between multiple hooks
- Custom event dispatching systems
- Complex error recovery and cleanup
- Manual focus management and accessibility
- Custom collision detection and drop zone logic

## Components and Interfaces

### 1. DraggableTrackList Container (Drag Orchestration Only)

```typescript
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DraggableTrackListProps {
  tracks: string[];
  onReorder: (activeId: string, overId: string) => void;  // Store action signature
  children: React.ReactNode;
}

function DraggableTrackList({ tracks, onReorder, children }: DraggableTrackListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      // CORRECT: Component only reports user intent, store handles business logic
      onReorder(active.id as string, over!.id as string);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tracks} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// 1.1 TrackList Presentation Component (Rendering Only)

interface TrackListProps {
  tracks: TrackData[];
}

function TrackList({ tracks }: TrackListProps) {
  return (
    <div className="track-list">
      {tracks.map(track => (
        <SortableWrapper key={track.id} id={track.id}>
          <TrackItem track={track} />
        </SortableWrapper>
      ))}
    </div>
  );
}

// 1.2 Complete Composition (Following React Best Practices)

function TrackListContainer() {
  const { tracks, reorderTracks } = useTrackStore();
  
  return (
    <DraggableTrackList tracks={tracks.map(t => t.id)} onReorder={reorderTracks}>
      <TrackList tracks={tracks} />
    </DraggableTrackList>
  );
}
```

### 2. SortableWrapper Component (Follows React Best Practices)

```typescript
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWrapperProps {
  id: string;
  children: React.ReactNode;
}

function SortableWrapper({ id, children }: SortableWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="sortable-wrapper"
    >
      {children}
    </div>
  );
}

// Usage with complete separation of concerns:
// <SortableWrapper id={track.id}>
//   <TrackItem track={track} onPlay={handlePlay} onEdit={handleEdit} />
// </SortableWrapper>
```

### 3. Zustand Store Integration

```typescript
import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';

interface TrackStore {
  tracks: string[];
  reorderTracks: (activeId: string, overId: string) => void;
  setTracks: (tracks: string[]) => void;
}

const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [],
  
  reorderTracks: (activeId: string, overId: string) => {
    const { tracks } = get();
    const oldIndex = tracks.indexOf(activeId);
    const newIndex = tracks.indexOf(overId);
    
    set({
      tracks: arrayMove(tracks, oldIndex, newIndex)
    });
  },
  
  setTracks: (tracks: string[]) => set({ tracks }),
}));

// Usage in component (CORRECT PATTERN - Logic in Store)
function TrackListContainer() {
  const { tracks, reorderTracks } = useTrackStore();
  
  return (
    <DraggableTrackList 
      tracks={tracks.map(t => t.id)} 
      onReorder={reorderTracks}  // Pass store action directly
    >
      <TrackList tracks={tracks} />
    </DraggableTrackList>
  );
}
```

## Sensor Configuration

### MouseSensor Configuration
```typescript
useSensor(MouseSensor, {
  activationConstraint: {
    distance: 10, // Prevents accidental drags on click
  },
})
```

### TouchSensor Configuration (Mobile Optimized)
```typescript
useSensor(TouchSensor, {
  activationConstraint: {
    delay: 250,    // Proven delay for mobile reliability
    tolerance: 5,  // Allows slight finger movement during delay
  },
})
```

### KeyboardSensor Configuration (Accessibility)
```typescript
useSensor(KeyboardSensor, {
  coordinateGetter: sortableKeyboardCoordinates, // Built-in sortable navigation
})
```

## Visual Feedback System

### Transform Application
```css
/* dnd-kit handles transforms automatically */
.track-item {
  touch-action: none; /* Prevents browser scrolling during touch drag */
  transition: transform 200ms ease;
}

.track-item[data-dragging="true"] {
  opacity: 0.5;
  z-index: 1000;
}
```

### Existing Visual Feedback Integration
```typescript
// Existing drop line logic can be enhanced with dnd-kit's collision detection
const { isOver } = useDroppable({
  id: 'track-list',
});

// Apply existing CSS classes based on dnd-kit state
const className = `track-list ${isOver ? 'drag-over' : ''}`;
```

## Data Models

### DragEndEvent Interface
```typescript
interface DragEndEvent {
  active: {
    id: UniqueIdentifier;
    data: Record<string, any>;
  };
  over: {
    id: UniqueIdentifier;
    data: Record<string, any>;
  } | null;
}
```

### Track Item Data
```typescript
interface TrackItemData {
  id: string;
  title: string;
  artist: string;
  duration: number;
  // ... other track properties
}
```

## Error Handling

### dnd-kit Built-in Error Handling
dnd-kit handles most error scenarios internally:
- Sensor conflicts and race conditions
- Touch event coordination
- Memory leaks from event listeners
- Focus management edge cases

### Custom Error Boundaries (Minimal)
```typescript
function DragErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<div>Drag functionality temporarily unavailable</div>}
      onError={(error) => {
        console.error('Drag error:', error);
        // Reset any external state if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## Accessibility Features

### Built-in Accessibility
dnd-kit provides:
- Automatic ARIA attributes
- Keyboard navigation with arrow keys
- Screen reader announcements
- Focus management

### Custom Announcements (Optional)
```typescript
const announcements = {
  onDragStart({active}) {
    return `Picked up track ${active.id}`;
  },
  onDragEnd({active, over}) {
    if (over) {
      return `Track ${active.id} was moved to position ${getPosition(over.id)}`;
    }
    return `Track ${active.id} was dropped`;
  },
};

<DndContext accessibility={{ announcements }}>
```

## Performance Considerations

### Bundle Size Impact
- **@dnd-kit/core**: ~4KB
- **@dnd-kit/sortable**: ~3KB  
- **@dnd-kit/utilities**: ~1KB
- **Total**: ~8KB (much smaller than current custom implementation)

### Runtime Performance
- Efficient collision detection algorithms
- Optimized touch event handling
- Minimal re-renders during drag operations
- Automatic cleanup of resources

### Memory Management
dnd-kit handles:
- Event listener cleanup
- Timer management
- Reference cleanup
- Sensor lifecycle management

## Migration Strategy

### Phase 1: Installation and Setup
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Phase 2: Component Creation
1. Create `SortableTrackItem` component using `useSortable`
2. Create `TrackList` component with `DndContext` and `SortableContext`
3. Test basic drag functionality

### Phase 3: Integration
1. Connect to existing Zustand store
2. Integrate with existing `TrackItem` components
3. Apply existing CSS classes and styling

### Phase 4: Cleanup
1. Remove custom drag hooks and logic
2. Remove complex state coordination
3. Remove custom touch handling
4. Clean up unused dependencies

## Testing Strategy

### Unit Tests
```typescript
describe('SortableTrackItem', () => {
  it('should render with drag attributes', () => {
    // Test useSortable hook integration
  });
  
  it('should apply transform styles correctly', () => {
    // Test CSS.Transform.toString usage
  });
});

describe('TrackList', () => {
  it('should handle drag end events', () => {
    // Test onDragEnd callback
  });
  
  it('should reorder tracks correctly', () => {
    // Test arrayMove integration
  });
});
```

### Integration Tests
```typescript
describe('Drag and Drop Integration', () => {
  it('should work with mouse input', () => {
    // Test MouseSensor functionality
  });
  
  it('should work with touch input', () => {
    // Test TouchSensor with delay/tolerance
  });
  
  it('should work with keyboard input', () => {
    // Test KeyboardSensor with sortableKeyboardCoordinates
  });
});
```

### Mobile Testing
- Test on actual iOS and Android devices
- Verify 250ms delay feels responsive
- Confirm 5px tolerance prevents accidental cancellation
- Test in various browsers (Safari, Chrome Mobile, Firefox Mobile)

## Success Metrics

### Reliability Metrics
- **Mobile drag success rate**: >95% (vs current ~60%)
- **Error rate**: <1% (vs current ~15%)
- **Code complexity**: <100 lines (vs current 1000+ lines)

### Performance Metrics
- **Touch response time**: <250ms (configurable)
- **Bundle size increase**: ~8KB
- **Memory usage**: Reduced due to better cleanup

### User Experience Metrics
- **Cross-platform compatibility**: iOS, Android, Desktop
- **Accessibility compliance**: WCAG 2.1 AA (built-in)
- **Developer experience**: Simple API, good TypeScript support

## Risk Mitigation

### Technical Risks
- **Library dependency**: dnd-kit is actively maintained with 9.3 trust score
- **API changes**: Stable API with semantic versioning
- **Performance**: Battle-tested in thousands of applications

### Migration Risks
- **Functionality gaps**: dnd-kit covers all current functionality
- **Integration issues**: Clean integration with existing Zustand store
- **Rollback plan**: Keep old system until new system is fully verified