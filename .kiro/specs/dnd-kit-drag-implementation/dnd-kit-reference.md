# dnd-kit Reference Documentation

## Core Concepts

dnd-kit is a modern, lightweight, performant, accessible and extensible drag & drop toolkit for React.

### Key Features
- **10KB bundle size** - Lightweight and performant
- **Battle-tested mobile touch handling** - Proven TouchSensor implementation
- **Built-in accessibility** - KeyboardSensor with screen reader support
- **Simple API** - Minimal setup for sortable lists
- **TypeScript support** - Full type safety

## Essential APIs for Track Reordering

### 1. Basic Setup

```javascript
import React, {useState} from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

function App() {
  const [items, setItems] = useState([1, 2, 3]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items}
        strategy={verticalListSortingStrategy}
      >
        {items.map(id => <SortableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }
}
```

### 2. Mobile Touch Configuration

```javascript
// Optimal mobile touch sensor configuration
const sensors = useSensors(
  useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  }),
  useSensor(TouchSensor, {
    // Press delay of 250ms, with tolerance of 5px of movement
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### 3. SortableItem Component

```javascript
import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

export function SortableItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: props.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Your track content here */}
    </div>
  );
}
```

## TouchSensor API Details

### Purpose
Responds to Touch events (finger or stylus activity on touch screens).

### Activator
The `onTouchStart` event handler.

### Initialization
The sensor is initialized if there is no more than a single touch on the `event.touches` property.

### Activation Constraints (Mutually Exclusive)

#### Distance Constraint
```typescript
interface DistanceConstraint {
  distance: number;
}
```
The `distance` property specifies the minimum distance, in pixels, that the touch input must move before a drag start event is emitted.

#### Delay Constraint (Recommended for Mobile)
```typescript
interface DelayConstraint {
  delay: number;
  tolerance: number;
}
```
- **delay**: Duration in milliseconds that a draggable item must be held before drag starts
- **tolerance**: Distance in pixels of motion tolerated during delay before aborting drag

## Key Imports

```javascript
// Core functionality
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

// Sortable functionality
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

// Utilities
import {CSS} from '@dnd-kit/utilities';
```

## Installation

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## CSS Recommendations

```css
/* For draggable elements to prevent default scrolling on touch devices */
.draggable-element {
  touch-action: none;
}
```

## Accessibility Features

- **Built-in keyboard navigation** with `sortableKeyboardCoordinates`
- **Screen reader announcements** can be customized
- **Focus management** handled automatically
- **ARIA attributes** applied automatically

## Integration with Zustand

dnd-kit works seamlessly with external state management:

```javascript
// In your Zustand store
const useTrackStore = create((set) => ({
  tracks: ['track1', 'track2', 'track3'],
  reorderTracks: (activeId, overId) => set((state) => ({
    tracks: arrayMove(
      state.tracks,
      state.tracks.indexOf(activeId),
      state.tracks.indexOf(overId)
    )
  })),
}));

// In your component
function TrackList() {
  const { tracks, reorderTracks } = useTrackStore();
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      reorderTracks(active.id, over.id);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={tracks}>
        {tracks.map(id => <SortableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  );
}
```

## Performance Notes

- **Lightweight**: ~10KB total bundle size
- **Optimized**: Uses efficient collision detection algorithms
- **Mobile-first**: TouchSensor designed for mobile performance
- **Memory efficient**: Proper cleanup of event listeners and timers