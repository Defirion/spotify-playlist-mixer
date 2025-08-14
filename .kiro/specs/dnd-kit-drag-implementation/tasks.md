# Implementation Plan

## Task Overview

Convert the complex custom drag implementation to dnd-kit's proven solution. This implementation will replace 1000+ lines of custom coordination logic with dnd-kit's battle-tested ~100 lines of code, focusing on mobile touch reliability and simplicity.

## Anti-Over-Engineering Safeguards

This implementation plan includes specific safeguards to prevent over-engineering:

1. **Use dnd-kit APIs directly** - No custom abstractions or wrappers around dnd-kit
2. **File Size Limits** - Strict limits enforced for each component
3. **Follow dnd-kit patterns exactly** - Copy proven examples verbatim
4. **Test-Driven Development** - Write new tests for each new component as you build it
5. **Legacy System Preservation** - Keep existing system until new system is fully verified
6. **Systematic Safety Audits** - Comprehensive verification before cleanup

## Testing Strategy

### **Two-Track Testing Approach:**

**Track 1: Legacy Test Management (Task 1)**
- Skip/mock broken tests to get suite passing quickly
- Document what's broken and why
- Minimal effort to maintain development velocity

**Track 2: New Test Implementation (Tasks 2-17)**
- Write new tests for each new dnd-kit component as you create it
- Test-driven development for the new system
- Focus on dnd-kit integration patterns, not complex test setups

## Implementation Tasks

- [ ] 0. Systematically isolate existing complex drag system and document test impact
  - **Step 1**: Run `npm test` to capture current test status before any changes
  - **Step 2**: Run `find src/ -name "*drag*" -o -name "*Drag*"` to identify ALL drag-related files
  - **Step 3**: Run `grep -r "useDraggable\|useTrackReordering\|dragSlice" src/` to find ALL usage
  - **Step 4**: Create comprehensive list of files to move (code + tests + types)
  - **Step 5**: Create `FAILING_TESTS_INVENTORY.md` documenting which tests will break and why
  - **Step 6**: Create `src/legacy-drag-system/` folder structure matching original locations
  - **Step 7**: **MOVE** (don't copy) all identified files to legacy folder to prevent confusion
  - **Step 8**: Rename moved files with `.legacy` extension (e.g., `useDraggable.ts` → `useDraggable.legacy.ts`)
  - **Step 9**: Update legacy test imports to reference legacy file paths
  - **Step 10**: Create `LEGACY_SYSTEM_INVENTORY.md` with EXACT file mapping: `original_path → legacy_path`
  - **Step 11**: Run `npm test` again and document new failures in `FAILING_TESTS_INVENTORY.md`
  - **Step 12**: Create `NEW_SYSTEM_INVENTORY.md` to track new files as they're created
  - **CRITICAL SAFETY**: Legacy files are MOVED and RENAMED to prevent accidental deletion of new implementations
  - _Requirements: Safeguard against losing understanding of previous functionality AND prevent deletion disasters_

- [ ] 1. Address failing tests systematically
  - **Purpose**: Handle test failures caused by moving legacy drag system without breaking development flow.
  - Review `FAILING_TESTS_INVENTORY.md` to understand which tests are broken
  - **For drag-related tests**: Skip them temporarily with `test.skip()` and add TODO comments
  - **For non-drag tests with drag imports**: Replace imports with mock implementations
  - **For integration tests**: Identify minimum changes needed to make them pass
  - Create `TEST_RESTORATION_PLAN.md` documenting which tests need new implementations
  - **Goal**: Get test suite to a passing state without implementing new drag system yet
  - **Discipline Check**: Don't implement new drag functionality here - just make tests pass
  - _Requirements: Maintain development velocity while ensuring test safety_

- [ ] 2. Install dnd-kit packages and verify setup
  - Install @dnd-kit/core, @dnd-kit/sortable, and @dnd-kit/utilities packages
  - Verify packages are installed correctly with basic import test
  - Check bundle size impact with build analysis
  - Document package versions for future reference
  - _Requirements: 7.1, 10.1_

- [ ] 2. Create SortableWrapper component with tests (MAX 30 lines + tests)
  - **Purpose**: Create a pure wrapper component that adds drag functionality to any child component using dnd-kit's useSortable hook. This maintains separation of concerns by keeping drag logic separate from track display logic.
  - Create new `src/components/SortableWrapper.tsx` file
  - **SAFETY**: Add this file to `NEW_SYSTEM_INVENTORY.md` immediately after creation
  - Use useSortable hook with id prop (copy pattern from dnd-kit-reference.md exactly)
  - Apply transform and transition styles using CSS.Transform.toString to wrapper div
  - Add drag attributes and listeners to wrapper, NOT to children
  - Render children unchanged using React composition pattern: `{children}`
  - **NEW TESTS**: Create `src/components/__tests__/SortableWrapper.test.tsx`
  - Test: Component renders children unchanged
  - Test: useSortable hook is called with correct id
  - Test: Transform styles are applied correctly
  - Test: Drag attributes are attached to wrapper, not children
  - **Discipline Check**: If you find yourself modifying children or adding track-specific logic, STOP - this should be a pure drag wrapper
  - _Requirements: 3.1, 3.4, 9.1, 9.4_

- [ ] 3. Create DraggableTrackList container component with tests (MAX 40 lines + tests)
  - **Purpose**: Create a focused container that only handles drag orchestration using DndContext and SortableContext. This component has single responsibility: managing drag operations and connecting to store.
  - Create new `src/components/DraggableTrackList.tsx` file
  - **SAFETY**: Add this file to `NEW_SYSTEM_INVENTORY.md` immediately after creation
  - Set up DndContext with sensors and collision detection (copy pattern from dnd-kit-reference.md exactly)
  - Add SortableContext with verticalListSortingStrategy
  - Accept tracks and onReorder props (no direct store coupling)
  - Implement onDragEnd handler that calls onReorder prop
  - **NEW TESTS**: Create `src/components/__tests__/DraggableTrackList.test.tsx`
  - Test: DndContext is set up with correct sensors
  - Test: SortableContext uses verticalListSortingStrategy
  - Test: onDragEnd calls onReorder with correct parameters
  - Test: Component renders children unchanged
  - **Discipline Check**: If you find yourself adding track rendering or complex logic, STOP - this should only orchestrate drag operations
  - _Requirements: 1.1, 2.1, 3.1, 3.2_

- [ ] 4. Configure mobile-optimized sensors (MAX 20 lines)
  - **Purpose**: Configure dnd-kit's proven sensor settings for reliable mouse, touch, and keyboard input. Use exact values from dnd-kit documentation without modification.
  - Add MouseSensor with 10px distance activation constraint (copy from dnd-kit-implementation-guidance.md exactly)
  - Add TouchSensor with 250ms delay and 5px tolerance activation constraint (DO NOT modify these proven values)
  - Add KeyboardSensor with sortableKeyboardCoordinates
  - Use useSensors to combine all three sensors
  - **Discipline Check**: If you find yourself tweaking sensor values, STOP and use the proven settings
  - Test each sensor type works correctly on desktop and mobile
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [ ] 5. Integrate with existing Zustand store with tests (MAX 25 lines + tests)
  - **Purpose**: Add reorderTracks action to store that encapsulates ALL reordering business logic. Component should only report user intent (activeId, overId).
  - Add reorderTracks(activeId: string, overId: string) action to existing track store
  - Use arrayMove utility from @dnd-kit/sortable INSIDE the store action
  - Store action should handle finding indices and performing arrayMove internally
  - Connect DraggableTrackList onDragEnd to store action: onReorder={reorderTracks}
  - **NEW TESTS**: Create or update `src/store/__tests__/trackStore.test.ts`
  - Test: reorderTracks moves items correctly
  - Test: reorderTracks handles edge cases (same position, invalid IDs)
  - Test: Store state updates trigger re-renders
  - Test: arrayMove logic is contained in store, not components
  - **Discipline Check**: If you find arrayMove logic in components, STOP - business logic belongs in the store
  - _Requirements: 2.2, 6.1, 6.2, 10.3_

- [ ] 6. Create TrackList presentation component and integrate with DraggableTrackList (MAX 20 lines)
  - **Purpose**: Create a pure presentation component for rendering track lists, then compose it with DraggableTrackList for drag functionality.
  - Create `src/components/TrackList.tsx` as pure presentation component that renders tracks
  - TrackList accepts tracks array and renders: `{tracks.map(track => <SortableWrapper id={track.id}><TrackItem {...trackProps} /></SortableWrapper>)}`
  - Create container component that combines: `<DraggableTrackList><TrackList tracks={tracks} /></DraggableTrackList>`
  - TrackItem component remains completely unchanged and unaware of dragging
  - SortableWrapper handles all drag styling (opacity, z-index) based on isDragging state
  - **Discipline Check**: If you find yourself mixing drag logic with track rendering, STOP - keep them separate
  - Test existing TrackItem functionality still works exactly as before
  - _Requirements: 6.3, 9.2, 9.3_

- [ ] 7. Add visual feedback and styling (MAX 20 lines)
  - Add touch-action: none CSS for draggable elements
  - Apply opacity and transform styles during drag
  - Integrate with existing drop line indicators if needed
  - Test visual feedback works on both desktop and mobile
  - Ensure smooth transitions and animations
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8. Test mobile touch functionality
  - Test touch drag on actual iOS device (Safari)
  - Test touch drag on actual Android device (Chrome)
  - Verify 250ms delay feels responsive
  - Confirm 5px tolerance prevents accidental cancellation
  - Test in different mobile browsers
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Test keyboard accessibility
  - Test keyboard navigation with Tab key
  - Test drag initiation with Space/Enter keys
  - Test movement with arrow keys
  - Test with screen reader (if available)
  - Verify ARIA attributes are applied correctly
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Add error boundary for drag operations (MAX 15 lines)
  - Create simple error boundary component for drag functionality
  - Wrap TrackList with error boundary
  - Add basic error logging and fallback UI
  - Test error boundary catches drag-related errors
  - Ensure graceful degradation when drag fails
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Performance testing and optimization
  - Test with large track lists (100+ items)
  - Measure bundle size impact
  - Profile memory usage during drag operations
  - Test drag performance on slower devices
  - Optimize if any performance issues found
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Integration testing with existing features
  - Test drag works with existing modal functionality
  - Test drag works with existing search/filter features
  - Test drag works with existing playlist operations
  - Verify no conflicts with existing event handlers
  - Test edge cases like rapid interactions
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13. Create migration safety audit
  - **Step 1**: Run `grep -r "useDraggable\|useTrackReordering\|dragSlice" src/` to map ALL current usage
  - **Step 2**: Document which files are using old vs new drag system
  - **Step 3**: Identify which components still need the old system (if any)
  - **Step 4**: Create explicit list of what can be safely removed vs what must stay
  - **Step 5**: Verify all new drag functionality works before starting cleanup
  - **SAFETY**: Never proceed with cleanup if any tests are failing
  - Create side-by-side comparison of old vs new functionality
  - Test all existing drag use cases work with new system
  - Create rollback plan if issues are found
  - _Requirements: 10.2, 10.3, 10.4_

- [ ] 14. Systematically replace old drag system usage
  - **Step 1**: Run search to find ALL files importing from old drag system
  - **Step 2**: Create list of files that need updates and verify each one individually
  - **Step 3**: Update imports ONE FILE AT A TIME, test after each change
  - **Step 4**: Use TypeScript compiler to identify unused imports (don't guess)
  - **Step 5**: Run `npm run build` and `npm test` after each file update to catch breaking changes immediately
  - **Step 6**: Use IDE "Find All References" to verify no legacy drag references remain
  - **NEVER**: Remove files or types without TypeScript confirmation they're unused
  - Update all components to use new TrackList component
  - Update any drag-related tests to use new system
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 15. Verify cleanup was successful and safe using inventory files
  - **Step 1**: Use `LEGACY_SYSTEM_INVENTORY.md` to verify ONLY legacy files are in legacy folder
  - **Step 2**: Use `NEW_SYSTEM_INVENTORY.md` to verify ONLY new files are in main codebase
  - **Step 3**: Run `npm run build` - must pass with no TypeScript errors
  - **Step 4**: Run `npm test` - all tests must pass
  - **Step 5**: Run `grep -r "useDraggable\|useTrackReordering" src/ --exclude-dir=legacy-drag-system` - should return NO results
  - **Step 6**: Check bundle size - should be smaller than before (unused code removed)
  - **Step 7**: Test drag functionality manually on desktop and mobile
  - **Step 8**: Verify no console errors during drag operations
  - **Step 9**: Cross-reference inventory files to ensure no new files were accidentally moved to legacy
  - **ROLLBACK**: If any issues found, use inventory files to restore exact original state
  - **FINAL SAFETY**: Only delete files explicitly listed in `LEGACY_SYSTEM_INVENTORY.md`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 16. Restore and update test suite
  - **Purpose**: Systematically restore all tests that were skipped or mocked during the transition.
  - Review `TEST_RESTORATION_PLAN.md` to identify tests that need new implementations
  - Un-skip drag-related tests and implement them using dnd-kit patterns
  - Replace mock implementations with real dnd-kit integrations
  - Add new tests for dnd-kit components (SortableWrapper, DraggableTrackList)
  - Ensure test coverage is maintained or improved
  - **Discipline Check**: Use dnd-kit testing patterns, don't create complex test setups
  - _Requirements: Complete test coverage with dnd-kit implementation_

- [ ] 17. Final verification all tests pass
  - Run complete test suite one final time
  - Test drag functionality on multiple devices and browsers
  - Document any test changes made during implementation
  - Verify no test regressions from the migration
  - _Requirements: Testing Strategy from design document_

- [ ] 17. Document the dnd-kit system
  - Create simple README for the new dnd-kit drag system architecture
  - Document the dnd-kit components and their integration
  - Add code comments explaining the dnd-kit patterns used
  - Document what was cleaned up and what was preserved (for future reference)
  - Create troubleshooting guide for common dnd-kit issues
  - Update README with new drag system information
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

## File Size Enforcement Rules

Each task MUST enforce these limits:
- `SortableWrapper.tsx`: MAX 30 lines
- `DraggableTrackList.tsx`: MAX 40 lines
- `TrackList.tsx`: MAX 20 lines  
- Sensor configuration: MAX 20 lines
- Zustand integration: MAX 25 lines
- Error boundary: MAX 15 lines
- Visual styling: MAX 20 lines

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

### Gate 4: File Size Limits
1. Check file size against task limits
2. If approaching limit, split functionality
3. Use `wc -l filename` to verify

### Gate 5: Function Size Check
1. No function over 35 lines (target: 25-30)
2. If over 35 lines, split or simplify
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

## File Safety and Inventory Management

### **CRITICAL: Prevent Deletion Disasters**

The inventory files are your safety net to prevent accidentally deleting new implementations:

### **LEGACY_SYSTEM_INVENTORY.md Format:**
```markdown
# Legacy Drag System Files

## Original → Legacy Mapping
- `src/hooks/useDraggable.ts` → `src/legacy-drag-system/hooks/useDraggable.legacy.ts`
- `src/store/slices/dragSlice.ts` → `src/legacy-drag-system/store/slices/dragSlice.legacy.ts`
- `src/components/DraggableTrackList.tsx` → `src/legacy-drag-system/components/DraggableTrackList.legacy.tsx`

## Files Safe to Delete (ONLY THESE)
- All files listed above in legacy folder with .legacy extension
- Any imports/references to the original paths listed above
```

### **NEW_SYSTEM_INVENTORY.md Format:**
```markdown
# New dnd-kit System Files

## New Files Created (NEVER DELETE THESE)
- `src/components/SortableWrapper.tsx` - Created in Task 3
- `src/components/DraggableTrackList.tsx` - Created in Task 4  
- `src/components/TrackList.tsx` - Created in Task 7

## Modified Files
- `src/store/trackStore.ts` - Added reorderTracks action in Task 6
```

### **FAILING_TESTS_INVENTORY.md Format:**
```markdown
# Test Impact Analysis

## Tests Broken by Legacy System Move
- `src/components/__tests__/DraggableTrackList.test.tsx` - Missing useDraggable import
- `src/hooks/__tests__/useDraggable.test.tsx` - File moved to legacy
- `src/store/__tests__/dragSlice.test.tsx` - File moved to legacy

## Temporary Solutions Applied
- **Skipped Tests**: Added test.skip() to drag-specific tests
- **Mock Imports**: Created mock useDraggable for non-drag tests
- **Integration Tests**: Minimal changes to make them pass

## Tests That Need New Implementations
- Drag functionality tests → Need dnd-kit test patterns
- Store integration tests → Need new reorderTracks action tests
- Component integration tests → Need SortableWrapper tests
```

### **TEST_RESTORATION_PLAN.md Format:**
```markdown
# Test Restoration Plan

## Phase 1: Component Tests
- [ ] SortableWrapper.test.tsx - Test useSortable integration
- [ ] DraggableTrackList.test.tsx - Test DndContext setup
- [ ] TrackList.test.tsx - Test composition pattern

## Phase 2: Integration Tests  
- [ ] Track reordering end-to-end tests
- [ ] Store integration tests
- [ ] Mobile touch interaction tests

## Phase 3: Accessibility Tests
- [ ] Keyboard navigation tests
- [ ] Screen reader compatibility tests
```

### **Safety Rules:**
1. **MOVE, don't copy** legacy files to prevent confusion
2. **RENAME** legacy files with `.legacy` extension
3. **UPDATE inventories** immediately when creating/modifying files
4. **CROSS-REFERENCE** inventories before any deletion
5. **NEVER delete** files not explicitly listed in legacy inventory

## Emergency Rollback Plan

If any issues arise:
1. **Use inventory files** to restore exact original state
2. **Legacy files are preserved** with .legacy extension in legacy folder
3. **New files are tracked** in NEW_SYSTEM_INVENTORY.md
4. **Quick rollback** - Move legacy files back to original locations and remove .legacy extension
5. **Issue tracking** - Document any problems for future resolution