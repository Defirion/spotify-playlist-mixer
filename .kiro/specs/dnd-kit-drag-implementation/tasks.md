# Implementation Plan - Clean Slate Approach

## Task Overview

Replace the complex custom drag implementation with dnd-kit's proven solution using a clean slate approach. This eliminates build issues and allows incremental implementation with a working build at each step.

## Clean Slate Strategy Benefits

1. **No Build Issues**: Remove legacy system completely to fix compilation
2. **Incremental Development**: Add dnd-kit functionality step by step
3. **No Confusion**: Single system approach prevents mixing old/new patterns
4. **Testable**: Each step can be tested independently
5. **Rollback Safety**: Git history preserves original implementation

## Anti-Over-Engineering Safeguards

This implementation plan includes specific safeguards to prevent over-engineering:

1. **Use dnd-kit APIs directly** - No custom abstractions or wrappers around dnd-kit
2. **File Size Limits** - Strict limits enforced for each component
3. **Follow dnd-kit patterns exactly** - Copy proven examples verbatim
4. **Test-Driven Development** - Write new tests for each new component as you build it
5. **Clean Implementation** - No legacy system complexity to manage

## Implementation Tasks

- [x] 1. Clean removal of legacy drag system
  - **Purpose**: Completely remove the old drag system to fix build issues and start fresh with dnd-kit.
  - **Step 1**: Run `npm test` to capture current test status before any changes
  - **Step 2**: Run `find src/ -name "*drag*" -o -name "*Drag*"` to identify ALL drag-related files
  - **Step 3**: Run `grep -r "useDraggable\|useTrackReordering\|dragSlice" src/` to find ALL usage
  - **Step 4**: Search for and remove any legacy drag documentation files (README sections, etc.)
  - **Step 5**: Run `grep -r "drag\|Drag" src/ --include="*.ts" --include="*.tsx"` to find drag-related comments
  - **Step 6**: Remove or update comments that reference the old drag system implementation
  - **Step 7**: Create `REMOVED_FILES_INVENTORY.md` documenting what's being removed and why
  - **Step 8**: **DELETE** all legacy drag files completely (no preservation needed)
  - **Step 9**: Remove all drag imports from components, replace with static rendering
  - **Step 10**: Remove drag-related tests (we'll write new ones for dnd-kit)
  - **Step 11**: Ensure app builds and runs (without drag functionality)
  - **Step 12**: Document which components need drag functionality restored
  - **GOAL**: Working build with no drag functionality, ready for clean dnd-kit implementation
  - _Requirements: Clean foundation for dnd-kit implementation_

- [x] 2. Install dnd-kit packages and verify setup
  - Install @dnd-kit/core, @dnd-kit/sortable, and @dnd-kit/utilities packages
  - Verify packages are installed correctly with basic import test
  - Check bundle size impact with build analysis
  - Document package versions for future reference
  - _Requirements: 7.1, 10.1_

- [x] 3. Create SortableWrapper component with tests (MAX 50 lines + tests)
  - **Purpose**: Create a pure wrapper component that adds drag functionality to any child component using dnd-kit's useSortable hook.
  - Create new `src/components/SortableWrapper.tsx` file
  - Use useSortable hook with id prop (copy pattern from dnd-kit-reference.md exactly)
  - Apply transform and transition styles using CSS.Transform.toString to wrapper div
  - Add drag attributes and listeners to wrapper, NOT to children
  - Render children unchanged using React composition pattern: `{children}`
  - **NEW TESTS**: Create `src/components/__tests__/SortableWrapper.test.tsx`
  - Test: Component renders children unchanged
  - Test: useSortable hook is called with correct id
  - Test: Transform styles are applied correctly
  - Test: Drag attributes are attached to wrapper, not children
  - _Requirements: 3.1, 3.4, 9.1, 9.4_

- [x] 4. Create DraggableTrackList container component with tests (MAX 60 lines + tests)
  - **Purpose**: Create a focused container that only handles drag orchestration using DndContext and SortableContext.
  - Create new `src/components/DraggableTrackList.tsx` file
  - Set up DndContext with sensors and collision detection (copy pattern from dnd-kit-reference.md exactly)
  - Add SortableContext with verticalListSortingStrategy
  - Accept tracks and onReorder props (no direct store coupling)
  - Implement onDragEnd handler that calls onReorder prop
  - **NEW TESTS**: Create `src/components/__tests__/DraggableTrackList.test.tsx`
  - Test: DndContext is set up with correct sensors
  - Test: SortableContext uses verticalListSortingStrategy
  - Test: onDragEnd calls onReorder with correct parameters
  - Test: Component renders children unchanged
  - _Requirements: 1.1, 2.1, 3.1, 3.2_

- [x] 5. Configure mobile-optimized sensors (MAX 40 lines)
  - **Purpose**: Configure dnd-kit's proven sensor settings for reliable mouse, touch, and keyboard input.
  - Add MouseSensor with 10px distance activation constraint (copy from dnd-kit-implementation-guidance.md exactly)
  - Add TouchSensor with 250ms delay and 5px tolerance activation constraint (DO NOT modify these proven values)
  - Add KeyboardSensor with sortableKeyboardCoordinates
  - Use useSensors to combine all three sensors
  - Test each sensor type works correctly on desktop and mobile
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [x] 6. Integrate with existing Zustand store with tests (MAX 50 lines + tests)
  - **Purpose**: Add reorderTracks action to store that encapsulates ALL reordering business logic.
  - Add reorderTracks(activeId: string, overId: string) action to existing track store
  - Use arrayMove utility from @dnd-kit/sortable INSIDE the store action
  - Store action should handle finding indices and performing arrayMove internally
  - Connect DraggableTrackList onDragEnd to store action: onReorder={reorderTracks}
  - **NEW TESTS**: Create or update `src/store/__tests__/trackStore.test.ts`
  - Test: reorderTracks moves items correctly
  - Test: reorderTracks handles edge cases (same position, invalid IDs)
  - Test: Store state updates trigger re-renders
  - Test: arrayMove logic is contained in store, not components
  - _Requirements: 2.2, 6.1, 6.2, 10.3_

- [x] 7. Create TrackList presentation component and integrate (MAX 30 lines)
  - **Purpose**: Create a pure presentation component for rendering track lists, then compose it with DraggableTrackList.
  - Create `src/components/TrackList.tsx` as pure presentation component that renders tracks
  - TrackList accepts tracks array and renders: `{tracks.map(track => <SortableWrapper id={track.id}><TrackItem {...trackProps} /></SortableWrapper>)}`
  - Create container component that combines: `<DraggableTrackList><TrackList tracks={tracks} /></DraggableTrackList>`
  - TrackItem component remains completely unchanged and unaware of dragging
  - SortableWrapper handles all drag styling (opacity, z-index) based on isDragging state
  - Test existing TrackItem functionality still works exactly as before
  - _Requirements: 6.3, 9.2, 9.3_

- [x] 8. Add visual feedback and styling (MAX 30 lines)
  - Add touch-action: none CSS for draggable elements
  - Apply opacity and transform styles during drag
  - Integrate with existing drop line indicators if needed
  - Test visual feedback works on both desktop and mobile
  - Ensure smooth transitions and animations
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 9. Integrate drag functionality into MixPreview component (MAX 40 lines)
  - **Purpose**: Restore drag functionality to the MixPreview component where users reorder tracks WITHIN their mix preview.
  - Replace the placeholder `<div>Track list will be restored with dnd-kit</div>` in MixPreview.tsx
  - Import and use the TrackListContainer component (DraggableTrackList + TrackList)
  - Connect onReorder prop to the existing onTrackOrderChange prop
  - Pass MixedTrack[] to the drag system (map to track IDs for drag, preserve full objects for display)
  - Ensure existing track display and styling remains unchanged
  - Test that track reordering within preview updates the mix correctly
  - **Note**: This is for reordering tracks WITHIN the preview panel, not for adding new tracks
  - _Requirements: 6.3, 9.2, 9.3_

- [x] 10. Make tracks draggable sources in TrackSourceModal component (MAX 30 lines)
  - **Purpose**: Make tracks in TrackSourceModal draggable sources that can be dragged TO the preview panel for adding tracks. This enables drag-to-add functionality in SpotifySearchModal and AddUnselectedModal since they use TrackSourceModal internally.
  - Wrap track items with SortableWrapper to make them draggable sources
  - Add DndContext to modal to enable drag operations from modal to external drop targets
  - Ensure existing track selection functionality (checkboxes) remains unchanged
  - Test that tracks can be dragged from modal to preview panel alongside selection checkboxes
  - Verify modal scrolling doesn't interfere with drag operations
  - Test that SpotifySearchModal and AddUnselectedModal inherit drag-to-add functionality automatically
  - **Note**: This is for dragging FROM modal TO preview panel (adding tracks), not for reordering within modal
  - _Requirements: 6.3, 9.2, 9.3_

- [ ] 11. Test mobile touch functionality
  - Test touch drag on actual iOS device (Safari)
  - Test touch drag on actual Android device (Chrome)
  - Verify 250ms delay feels responsive
  - Confirm 5px tolerance prevents accidental cancellation
  - Test in different mobile browsers
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 12. Test keyboard accessibility
  - Test keyboard navigation with Tab key
  - Test drag initiation with Space/Enter keys
  - Test movement with arrow keys
  - Test with screen reader (if available)
  - Verify ARIA attributes are applied correctly
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 13. Add error boundary for drag operations (MAX 25 lines)
  - Create simple error boundary component for drag functionality
  - Wrap TrackList with error boundary
  - Add basic error logging and fallback UI
  - Test error boundary catches drag-related errors
  - Ensure graceful degradation when drag fails
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 14. Performance testing and optimization
  - Test with large track lists (100+ items)
  - Measure bundle size impact
  - Profile memory usage during drag operations
  - Test drag performance on slower devices
  - Optimize if any performance issues found
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Integration testing with existing features
  - Test drag works with existing modal functionality
  - Test drag works with existing search/filter features
  - Test drag works with existing playlist operations
  - Verify no conflicts with existing event handlers
  - Test edge cases like rapid interactions
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 16. Final verification and documentation
  - Run complete test suite one final time
  - Test drag functionality on multiple devices and browsers
  - Create simple README for the new dnd-kit drag system architecture
  - Document the dnd-kit components and their integration
  - Add code comments explaining the dnd-kit patterns used
  - Update README with new drag system information
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

## File Size Enforcement Rules

Each task MUST enforce these limits (accounting for Prettier formatting):
- `SortableWrapper.tsx`: MAX 60 lines
- `DraggableTrackList.tsx`: MAX 60 lines
- `TrackList.tsx`: MAX 30 lines  
- Sensor configuration: MAX 40 lines
- Zustand integration: MAX 50 lines
- Error boundary: MAX 25 lines
- Visual styling: MAX 30 lines

## Task Completion Gates

**NEVER mark a task complete unless ALL gates pass:**

### Gate 1: TypeScript Compilation
1. Run `npx tsc --noEmit` (exact command from project-commands.md)
2. Zero TypeScript errors allowed
3. Fix all type issues immediately

### Gate 2: Build Success
1. Run `npm run build` (exact command from project-commands.md)
2. Build must complete successfully
3. Fix any build errors immediately

### Gate 3: Test Success
1. Run `npm test -- --watchAll=false` (exact command from project-commands.md)
2. ALL tests must pass (existing + new)
3. Fix failing tests immediately
4. Never leave failing tests behind

### Gate 4: Pre-commit Quality Check
1. Run `npm run lint:fix` to auto-fix issues
2. Run `npm run lint` - zero errors allowed
3. Run `npm run format:check` - must pass
4. Pre-commit hooks must pass (test with `git add . && git commit --dry-run`)

### Gate 5: File Size Limits
1. Check file size against task limits
2. If approaching limit, split functionality
3. Use `wc -l filename` to verify

### Gate 6: Function Size Check
1. No function over 45 lines (target: 35-40, accounting for Prettier formatting)
2. If over 45 lines, split or simplify
3. Event handlers get slight leeway for related event handling

**No exceptions. All gates must pass before marking complete.**

## Key dnd-kit Patterns to Follow

### Basic Setup Pattern
```typescript
const sensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(id => <SortableItem key={id} id={id} />)}
  </SortableContext>
</DndContext>
```

### SortableItem Pattern
```typescript
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
const style = { transform: CSS.Transform.toString(transform), transition };
return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>Content</div>;
```

### ArrayMove Pattern
```typescript
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over.id) {
    setItems(items => arrayMove(items, items.indexOf(active.id), items.indexOf(over.id)));
  }
};
```

## Emergency Rollback Plan

If any issues arise:
1. **Git history preserves** the original implementation
2. **Use git revert** to rollback to any previous working state
3. **Each task is a commit** allowing granular rollback
4. **Build gates ensure** each step is stable before proceeding