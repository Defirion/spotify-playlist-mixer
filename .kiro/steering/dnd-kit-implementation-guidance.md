---
inclusion: always
---

# dnd-kit Implementation Guidance

## Context

This steering file provides guidance for implementing dnd-kit to replace the complex custom drag system. Reference the full documentation at:

#[[file:.kiro/specs/dnd-kit-drag-implementation/dnd-kit-reference.md]]

## Core Implementation Principles

### What TO Do (Follow dnd-kit Patterns)

1. **Use dnd-kit APIs Directly** - No custom abstractions or wrappers around dnd-kit
2. **Follow Proven Examples** - Use the exact patterns from dnd-kit documentation
3. **Minimal Custom Code** - Let dnd-kit handle complexity internally
4. **Trust the Library** - dnd-kit has solved mobile touch reliability already
5. **Simple Integration** - Connect to Zustand store via onDragEnd callback only

### What NOT to Do (Avoid These Anti-Patterns)

1. **No Custom Touch Handling** - Don't add custom touch logic on top of dnd-kit
2. **No Complex State Coordination** - Let dnd-kit manage drag state internally
3. **No Custom Event Systems** - Use dnd-kit's built-in event callbacks
4. **No Abstraction Layers** - Don't wrap dnd-kit in custom hooks or components
5. **No Over-Configuration** - Use dnd-kit's sensible defaults

## Essential Code Patterns

### Sensor Configuration (Copy Exactly)
```typescript
const sensors = useSensors(
  useSensor(MouseSensor, {
    activationConstraint: { distance: 10 }
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 }
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  })
);
```

### Basic DndContext Setup (Copy Exactly)
```typescript
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(id => <SortableItem key={id} id={id} />)}
  </SortableContext>
</DndContext>
```

### SortableItem Pattern (Copy Exactly)
```typescript
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
const style = { transform: CSS.Transform.toString(transform), transition };
return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>Content</div>;
```

### ArrayMove Integration (Copy Exactly)
```typescript
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
  }
};
```

## Mobile Touch Configuration

### TouchSensor Settings (Proven Values)
- **delay: 250ms** - Proven to work reliably across devices
- **tolerance: 5px** - Allows slight finger movement during delay
- **DO NOT** modify these values without extensive mobile testing

### Required CSS
```css
.draggable-element {
  touch-action: none; /* Essential for mobile touch */
}
```

## Integration Guidelines

### Zustand Store Integration (CORRECT PATTERN - Logic in Store)
```typescript
// CORRECT: Business logic (arrayMove) lives in the store
reorderTracks: (activeId, overId) => set(state => ({
  tracks: arrayMove(state.tracks, 
    state.tracks.indexOf(activeId), 
    state.tracks.indexOf(overId)
  )
}))

// CORRECT: Component only reports user intent, no business logic
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    reorderTracks(active.id, over.id);  // Pass IDs, let store handle arrayMove
  }
};

// WRONG: Don't do arrayMove in component
// const newTracks = arrayMove(tracks, oldIndex, newIndex); // ❌ Business logic in UI
```

### Existing Component Integration
- Wrap existing components with useSortable
- Don't modify existing component internals
- Pass through all existing props unchanged

## File Size Discipline

- **SortableTrackItem**: MAX 30 lines
- **TrackList**: MAX 40 lines
- **Sensor config**: MAX 20 lines
- **Store integration**: MAX 25 lines

If approaching limits, you're probably over-engineering.

## Testing Requirements

### Mobile Testing Checklist
- [ ] iOS Safari - long press works
- [ ] Android Chrome - long press works  
- [ ] 250ms delay feels responsive
- [ ] 5px tolerance prevents accidental cancellation
- [ ] No conflicts with page scrolling

### Desktop Testing Checklist
- [ ] Mouse drag with 10px activation
- [ ] Keyboard navigation with arrow keys
- [ ] Screen reader compatibility
- [ ] No conflicts with existing interactions

## Common Mistakes to Avoid

### Over-Engineering Red Flags
- Adding custom touch event handlers
- Creating wrapper hooks around dnd-kit
- Complex state synchronization logic
- Custom collision detection algorithms
- Extensive error recovery systems

### Integration Anti-Patterns
- Modifying dnd-kit's internal behavior
- Fighting against dnd-kit's patterns
- Adding unnecessary abstraction layers
- Complex configuration objects
- Custom sensor implementations

## Success Indicators

### Code Quality
- Using dnd-kit examples verbatim
- Minimal custom logic
- Clean integration with existing code
- TypeScript compilation passes
- All tests pass

### Functionality
- Mobile touch drag works reliably
- Desktop mouse drag works smoothly
- Keyboard navigation is accessible
- No regressions in existing features
- Performance is smooth

## Emergency Patterns

If you find yourself:
- Writing custom touch handling code
- Creating complex state coordination
- Fighting against dnd-kit's behavior
- Adding extensive error handling
- Exceeding file size limits

**STOP** and re-read the dnd-kit documentation. The solution is likely simpler than you think.

## Reference Documentation

All essential dnd-kit patterns and APIs are documented in:
`.kiro/specs/dnd-kit-drag-implementation/dnd-kit-reference.md`

Refer to this file instead of looking up documentation online to ensure consistency and avoid over-engineering.