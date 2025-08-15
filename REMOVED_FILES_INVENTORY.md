# Removed Files Inventory - Legacy Drag System Cleanup

## Purpose
This document tracks all files and components removed during the clean slate approach for implementing dnd-kit drag functionality. The legacy drag system was overly complex with 1000+ lines of coordination logic and frequent mobile failures.

## Removal Date
Task 1 execution - Clean removal of legacy drag system

## Files Removed

### Legacy Drag System Directory (Complete Removal)
- `src/legacy-drag-system/` - **ENTIRE DIRECTORY REMOVED**
  - Contains 30+ files of complex custom drag implementation
  - Over 1000 lines of coordination logic
  - Multiple hooks, services, and state management
  - Frequent mobile touch failures
  - Will be replaced with ~100 lines of dnd-kit implementation

### Legacy Documentation Files (Removed)
- `TOUCH_DRAG_TIMING_FIXES.md` - Legacy drag timing documentation
- `DRAG_ERROR_HANDLING_SUMMARY.md` - Legacy drag error handling docs
- `DRAG_FILES_TO_MOVE.md` - Legacy file migration documentation
- `DRAG_STATE_COORDINATION_SOLUTION.md` - Legacy drag state coordination docs
- `LEGACY_SYSTEM_INVENTORY.md` - Legacy system file inventory
- `TEST_RESTORATION_PLAN.md` - Legacy test restoration documentation
- `refactoring_plan.md` - Legacy drag system refactoring plan

### Current Drag Components (To be removed)
- `src/components/drag/` - **DIRECTORY TO BE REMOVED**
  - `DragErrorBoundary.tsx` - Custom error boundary for drag operations
  - `DragErrorBoundary.module.css` - Styling for drag error boundary
  - `withDragErrorBoundary.tsx` - HOC for drag error handling
  - `__tests__/DragErrorBoundary.test.tsx` - Tests for drag error boundary
  - `__tests__/withDragErrorBoundary.test.tsx` - Tests for drag HOC

### Hook Files (To be removed)
- `src/hooks/drag/` - **DIRECTORY TO BE REMOVED** (currently empty but referenced)
- `src/hooks/index.ts` - Remove drag-related exports
- Individual drag-related hooks scattered in other files

### Store Integration (To be cleaned)
- `src/store/index.ts` - Remove drag slice integration
- Drag state selectors and hooks

### Type Definitions (To be cleaned)
- `src/types/components.ts` - Remove drag-related interfaces
- `src/types/hooks.ts` - Remove drag-related interfaces  
- `src/types/mixer.ts` - Remove drag-related interfaces
- `src/types/index.ts` - Remove drag-related exports

### Utility Files (To be cleaned)
- `src/utils/accessibility.ts` - Remove drag-specific accessibility functions
- `src/utils/dragAndDrop.js` - **FILE TO BE REMOVED** (if exists)

### Service Files (To be cleaned)
- `src/services/routeCleanupHandler.ts` - Remove drag cleanup logic

### Test Files (To be removed)
- All test files in `src/legacy-drag-system/` subdirectories
- Drag-related test files in other directories
- Tests that import removed drag functionality

## Components That Import Drag Functionality (To be updated)

### Components with Drag Imports
- `src/components/ui/TrackItem.tsx` - Remove drag imports, make static
- `src/components/ui/TrackList.tsx` - Remove drag imports, make static  
- Components that use `useDraggable` hook
- Components that use drag-related props

### Test Files with Drag Mocks
- `src/components/__tests__/AddUnselectedModal.test.tsx` - Remove drag mocks
- `src/components/__tests__/SpotifySearchModal.test.tsx` - Remove drag mocks
- Other test files with drag-related mocking

## Why These Files Are Being Removed

### Problems with Legacy System
1. **Over-Engineering**: 1000+ lines for basic drag functionality
2. **Mobile Failures**: Frequent touch drag failures on mobile devices
3. **Complex Coordination**: Multiple hooks and services for simple operations
4. **State Management Issues**: Complex state synchronization between components
5. **Maintenance Burden**: Difficult to debug and maintain custom implementation

### Benefits of Removal
1. **Clean Foundation**: Start fresh with proven dnd-kit library
2. **Reduced Complexity**: ~100 lines vs 1000+ lines of code
3. **Mobile Reliability**: dnd-kit's battle-tested mobile touch handling
4. **Maintainability**: Standard library patterns vs custom implementation
5. **Performance**: Optimized collision detection and event handling

## Replacement Strategy

### What Will Replace the Removed Code
1. **dnd-kit Core**: `@dnd-kit/core` for basic drag functionality
2. **dnd-kit Sortable**: `@dnd-kit/sortable` for list reordering
3. **dnd-kit Utilities**: `@dnd-kit/utilities` for helper functions
4. **Simple Components**: 
   - `SortableWrapper.tsx` (~30 lines)
   - `DraggableTrackList.tsx` (~40 lines)
   - `TrackList.tsx` (~20 lines)

### Implementation Approach
- Use dnd-kit APIs directly (no custom abstractions)
- Integrate with existing Zustand store via callbacks
- Follow proven dnd-kit patterns exactly
- Mobile-optimized sensor configuration
- Built-in accessibility support

## Files That Will Remain

### Keep These Files (No Drag Functionality)
- Core application components without drag features
- Non-drag related hooks and utilities
- Store slices not related to drag operations
- Test files for non-drag functionality

### Files That Will Be Modified
- Components that currently use drag props (make them static)
- Store files that import drag slices (remove drag imports)
- Type files that export drag types (remove drag exports)
- Test files that mock drag functionality (remove drag mocks)

## Rollback Plan

### Git History Preservation
- All removed files are preserved in git history
- Each removal step is a separate commit for granular rollback
- Can restore any individual file if needed during development

### Emergency Restoration
- Use `git checkout HEAD~n -- <file_path>` to restore specific files
- Use `git revert <commit_hash>` to rollback entire removal
- Legacy system remains in git history for reference

## Success Criteria

### Build Success
- Application builds without TypeScript errors
- No missing import errors
- No undefined component references

### Functionality
- Application runs without drag functionality
- All non-drag features work normally
- No runtime errors from missing drag components

### Test Status
- Non-drag tests continue to pass
- Drag-related test failures are expected and documented
- No unexpected test failures in unrelated areas

## Components That Need Drag Functionality Restored

### Primary Components (High Priority)
1. **TrackList** (`src/components/ui/TrackList.tsx`)
   - Currently renders tracks statically
   - Needs dnd-kit SortableContext wrapper
   - Should support track reordering

2. **TrackItem** (`src/components/ui/TrackItem.tsx`)
   - Currently static track display
   - Needs dnd-kit SortableWrapper integration
   - Should be draggable when wrapped

3. **MixPreview** (`src/components/features/mixer/MixPreview.tsx`)
   - Currently shows placeholder text: "Track list will be restored with dnd-kit"
   - Needs DraggableTrackList replacement with dnd-kit
   - Should allow reordering mixed tracks

### Secondary Components (Medium Priority)
4. **TrackSourceModal** (`src/components/TrackSourceModal.tsx`)
   - Modal for adding tracks from search/playlists
   - Drag props removed, now shows "select tracks" instead of "drag to playlist"
   - Should work with dnd-kit drag sources when restored

5. **SpotifySearchModal** (`src/components/SpotifySearchModal.tsx`)
   - Search results should be draggable
   - Drag props removed
   - Needs integration with dnd-kit drag sources

6. **AddUnselectedModal** (`src/components/AddUnselectedModal.tsx`)
   - Modal for adding unselected tracks
   - Drag props removed
   - Should work with dnd-kit drag sources when restored

### Store Integration Points
7. **Zustand Store** (`src/store/index.ts`)
   - Needs reorderTracks action
   - Should use arrayMove from @dnd-kit/sortable
   - Must handle track reordering state

### Required dnd-kit Components to Create
1. **SortableWrapper** - ✅ CREATED (30 lines, tests pass)
2. **DraggableTrackList** - Container for sortable track lists
3. **TrackList** - Presentation component (already exists, needs integration)

### Cleaned Up Successfully
- All drag-related comments and code removed from components
- All drag-related test cases removed or commented out
- All drag-related CSS styles removed
- All drag-related props and interfaces removed
- All drag-related imports cleaned up

## Next Steps

After this cleanup is complete:
1. Install dnd-kit packages (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
2. Create SortableWrapper component (MAX 30 lines)
3. Create DraggableTrackList container (MAX 40 lines)
4. Configure mobile-optimized sensors (TouchSensor with 250ms delay)
5. Integrate with existing Zustand store via onDragEnd callback
6. Test on actual mobile devices
7. Write new tests for dnd-kit implementation

## Notes

- This is a **clean slate approach** - no gradual migration
- All legacy drag code is removed completely
- New implementation will be built from scratch using dnd-kit
- Total code reduction: ~1000 lines removed, ~100 lines to be added
- Expected reliability improvement: 60% → 95% mobile success rate