# Implementation Plan

## Task Overview

Convert the feature design into a series of implementation tasks for creating a simplified, unified drag system that handles mouse, touch, and keyboard inputs cleanly. The implementation will replace the current complex coordination system with a single, maintainable `useSimpleDraggable` hook.

## Anti-Monolith Safeguards

This implementation plan includes specific safeguards to prevent creating another monolithic solution:

1. **File Size Limits**: No single file should exceed 150 lines
2. **Function Size Limits**: Target 25 lines per function (see anti-over-engineering steering for guidelines)  
3. **Separation of Concerns**: Each input method (mouse/touch/keyboard) gets its own dedicated handler file
4. **Incremental Testing**: Each task must have passing tests before marking complete
5. **Legacy Isolation**: Preserve existing complex system in isolated folder for reference

## Implementation Tasks

- [ ] 0. Systematically isolate existing complex drag system for reference
  - **Step 1**: Run `find src/ -name "*drag*" -o -name "*Drag*"` to identify ALL drag-related files
  - **Step 2**: Run `grep -r "useDraggable\|useTrackReordering\|dragSlice" src/` to find ALL usage
  - **Step 3**: Create comprehensive list of files to move (code + tests + types)
  - **Step 4**: Create `src/legacy-drag-system/` folder structure matching original locations
  - **Step 5**: Copy (don't move yet) all identified files to legacy folder
  - **Step 6**: Rename test files with `.legacy.test.ts` extension in legacy folder
  - **Step 7**: Update legacy test imports to reference legacy file paths
  - **Step 8**: Create `LEGACY_SYSTEM_INVENTORY.md` documenting what each file did
  - **Step 9**: Verify legacy folder structure is complete and organized
  - **SAFETY**: Keep original files until entire refactor is complete and verified
  - _Requirements: Safeguard against losing understanding of previous functionality_

- [ ] 1. Create new simpleDragSlice (MAX 40 lines)
  - **Purpose**: Write 2-sentence description of what this slice should do
  - Create new `src/store/slices/simpleDragSlice.ts` file (keep existing dragSlice.ts untouched)
  - Implement ONLY essential state: isDragging, draggedItem, inputMethod
  - Add ONLY essential actions: startDrag, endDrag, resetDrag
  - NO coordination logic, NO extensive logging, NO scroll management (separate hook handles that)
  - **Discipline Check**: If you find yourself looking at legacy dragSlice for inspiration, STOP and re-read requirements instead
  - Write basic tests that verify simplified store actions work
  - _Requirements: 2.1, 2.2, 8.1, 8.2_

- [ ] 2. Create useSimpleDraggable hook foundation (MAX 60 lines)
  - Create new `src/hooks/useSimpleDraggable.ts` file with ONLY basic structure and interfaces
  - Use new simpleDragSlice for state management (NOT the existing dragSlice)
  - Add TypeScript interfaces for UseDraggableOptions and UseDraggableReturn
  - Use simpleDragSlice's startDrag, endDrag, resetDrag actions
  - Write basic tests that verify hook integrates with simpleDragSlice
  - _Requirements: 2.1, 2.2, 8.1, 8.2_

- [ ] 3. Create separate mouse drag handler (MAX 50 lines)
  - Create new `src/hooks/drag-handlers/useMouseDrag.ts` file
  - Implement ONLY HTML5 drag event handlers (onDragStart, onDragEnd)
  - Use simpleDragSlice's startDrag/endDrag actions (NOT existing dragSlice)
  - Add simple drag data transfer without complex coordination
  - Write tests for mouse drag integration with simpleDragSlice
  - _Requirements: 1.1, 4.1, 4.4_

- [ ] 4. Create separate touch drag handler (MAX 80 lines)
  - Create new `src/hooks/drag-handlers/useTouchDrag.ts` file  
  - Implement ONLY touch event handlers (onTouchStart, onTouchMove, onTouchEnd)
  - Use simpleDragSlice's startDrag/endDrag/resetDrag actions (NOT scroll management)
  - Add simple 300ms long press detection using setTimeout
  - Include proper timer cleanup and error handling
  - Write tests for touch long press integration with simpleDragSlice
  - _Requirements: 1.2, 3.1, 3.3, 9.1_

- [ ] 5. Create separate keyboard drag handler (MAX 50 lines)
  - Create new `src/hooks/drag-handlers/useKeyboardDrag.ts` file
  - Implement ONLY keyboard event handler (onKeyDown) for accessibility
  - Use simpleDragSlice for state management (NOT existing dragSlice)
  - Add simple arrow key navigation without complex state management
  - Write tests for keyboard navigation
  - _Requirements: 1.3, 4.4_

- [ ] 6. Create simple scroll management hook (MAX 60 lines)
  - Create new `src/hooks/useScrollLock.ts` file
  - Implement scroll locking for multiple containers: page body, modal, preview list
  - Add lockAllScrolling() and unlockAllScrolling() functions
  - Use CSS overflow: hidden to prevent scrolling during drag
  - Write tests for scroll lock/unlock functionality
  - _Requirements: Mobile drag scroll prevention_

- [ ] 7. Create simple visual feedback utility (MAX 40 lines)
  - Create new `src/utils/dragVisualFeedback.ts` file
  - Implement ONLY basic CSS class toggling (touch-dragging, drag-active)
  - Add simple opacity and transform changes
  - Write tests for CSS class application/removal
  - _Requirements: 5.1, 5.2, 9.2_

- [ ] 8. Create simple drop zone detection utility (MAX 60 lines)
  - Create new `src/utils/dropZoneDetection.ts` file
  - Implement ONLY document.elementFromPoint detection
  - Add basic drop position calculation (before/after/end)
  - Write tests for drop zone detection accuracy
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 9. Integrate handlers into useSimpleDraggable (MAX 80 lines total)
  - Import the three separate drag handlers into useSimpleDraggable
  - Import and use useScrollLock hook for scroll management during drag
  - Add simple input method switching (enable/disable one at a time)
  - Ensure hook returns dragHandleProps and dropZoneProps
  - Write integration tests that verify all input methods work
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Update TrackListItem component (MAX 20 lines of changes)
  - Replace existing useDraggable import with useSimpleDraggable
  - Update component to use new dragHandleProps from simplified hook
  - Remove any old drag-related state management
  - Write test to verify track reordering works with mouse
  - _Requirements: 7.1, 7.2, 10.1, 10.2_

- [ ] 11. Update DraggableTrackList component (MAX 20 lines of changes)
  - Update DraggableTrackList to use new dropZoneProps from simplified hook
  - Remove any complex touch event handling
  - Update drop handling to work with simplified drag state
  - Write test to verify drop zones work correctly
  - _Requirements: 7.3, 7.4, 9.4_

- [ ] 12. Test touch drag on mobile device
  - Test touch long press detection on actual mobile device
  - Verify drop zone detection works on mobile
  - Test that scroll locking works for page, modal, and preview containers
  - Fix any mobile-specific issues with minimal code changes
  - _Requirements: 1.2, 5.1, 9.1_

- [ ] 13. Test keyboard accessibility
  - Test keyboard navigation with screen reader
  - Verify arrow keys work for track selection
  - Test Space/Enter for drag operations
  - Fix any accessibility issues with minimal code changes
  - _Requirements: 1.3, 4.4_

- [ ] 14. Create cleanup safety audit
  - **Step 1**: Run `grep -r "useDraggable\|useTrackReordering\|dragSlice" src/` to map ALL current usage
  - **Step 2**: Document which files are using old vs new drag system
  - **Step 3**: Identify which components still need the old system (if any)
  - **Step 4**: Create explicit list of what can be safely removed vs what must stay
  - **Step 5**: Verify all new drag functionality works before starting cleanup
  - **SAFETY**: Never proceed with cleanup if any tests are failing
  - _Requirements: Prevent breaking working functionality during cleanup_

- [ ] 15. Systematically clean up legacy system references
  - **Step 1**: Run search to find ALL files importing from old drag system (`useDraggable`, `useTrackReordering`, etc.)
  - **Step 2**: Create list of files that need updates and verify each one individually
  - **Step 3**: Update imports ONE FILE AT A TIME, test after each change
  - **Step 4**: Use TypeScript compiler to identify unused imports (don't guess)
  - **Step 5**: Run `npm run build` and `npm test` after each file update to catch breaking changes immediately
  - **Step 6**: Use IDE "Find All References" to verify no legacy drag references remain
  - **Step 7**: Only remove type definitions that TypeScript compiler confirms are unused
  - **NEVER**: Remove files or types without TypeScript confirmation they're unused
  - _Requirements: 6.1, 6.2, 6.3, 7.1_

- [ ] 16. Verify cleanup was successful and safe
  - **Step 1**: Run `npm run build` - must pass with no TypeScript errors
  - **Step 2**: Run `npm test` - all tests must pass
  - **Step 3**: Run `grep -r "useDraggable\|useTrackReordering" src/ --exclude-dir=legacy-drag-system` - should return NO results (all replaced with useSimpleDraggable)
  - **Step 4**: Check bundle size - should be smaller than before (unused code removed)
  - **Step 5**: Test drag functionality manually on desktop and mobile
  - **Step 6**: Verify no console errors during drag operations
  - **ROLLBACK**: If any issues found, revert cleanup changes and investigate
  - _Requirements: Testing Strategy from design document_

- [ ] 17. Final verification all tests pass
  - Run complete test suite one final time
  - Run new tests for simplified drag system and store
  - Ensure test coverage is maintained or improved
  - Document any test changes made during implementation
  - _Requirements: Testing Strategy from design document_

- [ ] 18. Document the simplified system
  - Create simple README for the new drag system architecture
  - Document the simplified dragSlice, scroll lock hook, and three separate handler files
  - Add code comments explaining the anti-monolith approach
  - Document file size limits and separation principles
  - Document what was cleaned up and what was preserved (for future reference)
  - _Requirements: 10.4_

## File Size Enforcement Rules

Each task MUST enforce these limits:
- `simpleDragSlice.ts`: MAX 40 lines (new simplified store)
- `useScrollLock.ts`: MAX 60 lines (dedicated scroll management)
- `useSimpleDraggable.ts`: MAX 80 lines
- `useMouseDrag.ts`: MAX 50 lines  
- `useTouchDrag.ts`: MAX 80 lines
- `useKeyboardDrag.ts`: MAX 50 lines
- `dragVisualFeedback.ts`: MAX 40 lines
- `dropZoneDetection.ts`: MAX 60 lines

## Task Completion Rules

All tasks must follow the **Task Completion Gates** defined in the anti-over-engineering steering file:
- TypeScript compilation must pass
- Build must succeed  
- All tests must pass
- File size limits must be respected
- Function size guidelines must be followed

See `.kiro/steering/anti-over-engineering.md` for complete task execution safety guidelines.