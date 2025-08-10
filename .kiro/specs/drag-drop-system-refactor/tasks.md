# Implementation Plan

- [x] 1. Create type definitions and foundational architecture





  - Create comprehensive TypeScript interfaces in `src/types/dragAndDrop.ts` for all drag operations
  - Define `DragSourceType`, `DraggedItemPayload`, `DraggedItem`, and `DragState` interfaces
  - Add `ScrollPositionState` interface for scroll position management
  - Ensure all types are strictly typed with proper generic constraints
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implement Zustand drag slice for centralized state management





  - Create `src/store/slices/dragSlice.ts` with complete drag state management
  - Implement `startDrag`, `endDrag`, and `cancelDrag` actions with concurrent drag prevention
  - Add scroll position management methods: `captureScrollPosition`, `restoreScrollPosition`, `clearScrollPosition`
  - Include comprehensive logging and error handling for debugging
  - Add proper TypeScript integration with existing store architecture
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Integrate drag slice into main store





  - Update `src/store/index.ts` to include the new `DragSlice` in the combined store type
  - Add drag slice to store creation with proper devtools integration
  - Create selector hooks: `useDragState()` and `useScrollPosition()` with shallow comparison optimization
  - Ensure proper TypeScript integration and type safety across the store
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Create modular drag hook architecture

- [x] 4.1 Implement core drag state hook





  - Create `src/hooks/drag/useDragState.ts` for store integration
  - Provide `isCurrentlyDragged` utility function for item-specific drag state
  - Ensure proper subscription management and performance optimization
  - _Requirements: 5.1, 5.2, 7.1_

- [x] 4.2 Implement drag handlers hook





  - Create `src/hooks/drag/useDragHandlers.ts` for HTML5 drag event management
  - Implement `createDragItem` function with proper payload creation for different drag types
  - Add `handleHTML5DragStart` and `handleHTML5DragEnd` with proper dataTransfer setup
  - Include comprehensive error handling and edge case management
  - _Requirements: 7.1, 7.2, 10.1, 10.2, 10.3, 10.4_

- [x] 4.3 Extract and modularize existing touch drag logic





  - Extract touch handling from existing `useDraggable.ts` into `src/hooks/drag/useTouchDrag.ts`
  - Preserve existing long-press detection, movement threshold, and haptic feedback
  - Maintain current touch event cleanup and memory management
  - Ensure no regression in touch drag functionality during refactor
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4.4 Extract and modularize existing keyboard drag logic





  - Extract keyboard handling from existing `useDraggable.ts` into `src/hooks/drag/useKeyboardDrag.ts`
  - Preserve existing spacebar, arrow key, and escape key functionality
  - Maintain current ARIA attributes and accessibility support
  - Ensure no regression in keyboard navigation during refactor
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4.5 Extract and modularize existing auto-scroll logic





  - Extract auto-scroll functionality from existing `useDraggable.ts` into `src/hooks/drag/useAutoScroll.ts`
  - Preserve existing dynamic scroll speed calculation and out-of-bounds scrolling
  - Maintain current requestAnimationFrame optimization and cleanup logic
  - Ensure no regression in existing auto-scroll behavior during refactor
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.6 Extract and modularize existing visual feedback logic





  - Extract scroll locking and visual feedback from existing `useDraggable.ts` into `src/hooks/drag/useDragVisualFeedback.ts`
  - Preserve existing body scroll locking, CSS class management, and cleanup logic
  - Maintain current scroll position restoration with requestAnimationFrame
  - Ensure no regression in visual feedback during refactor
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Create main orchestrator hook





  - Refactor `src/hooks/useDraggable.ts` to use modular hook architecture
  - Integrate all sub-hooks: drag state, handlers, touch, keyboard, auto-scroll, and visual feedback
  - Implement unified event handler creation with proper prop spreading
  - Add comprehensive cleanup and memory management
  - Ensure backward compatibility with existing component interfaces
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Remove legacy DragContext implementation






  - Delete `src/components/DragContext.js` file completely
  - Remove all imports and usage of `DragProvider` and `useDrag` from components
  - Update any remaining references to use the new Zustand-based system
  - Clean up related test files and mocks
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Refactor DraggableTrackList component for new architecture



- [x] 7.1 Implement scroll position preservation



  - Update `src/components/DraggableTrackList.tsx` to use `useScrollPosition` hook
  - Implement capture-and-restore pattern in `handleInternalReorder` and `handleExternalAdd`
  - Use `useLayoutEffect` for synchronous scroll position restoration after track list updates
  - Add proper error handling for missing scroll container references
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7.2 Integrate new drag system





  - Replace existing drag logic with new `useDraggable` hook
  - Implement proper drop handling for internal reordering and external track addition
  - Add drop position calculation and visual feedback during drag operations
  - Remove all legacy drag-related code and state management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 7.3 Add comprehensive drop zone handling





  - Implement intelligent drop index calculation based on mouse/touch position
  - Add visual drop indicators and feedback during drag operations
  - Handle edge cases like dropping at list boundaries and empty lists
  - Ensure proper cleanup of visual feedback after drop completion
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 8. Implement modal coordination system






- [x] 8.1 Update AddUnselectedModal for drag coordination


  - Modify `src/components/AddUnselectedModal.tsx` to use `useDragState` hook
  - Implement automatic visual muting when external drag operations are active
  - Add conditional styling with opacity reduction and pointer-events disabling
  - Ensure modal returns to normal state when drag operations complete
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 8.2 Update SpotifySearchModal for drag coordination


  - Modify `src/components/SpotifySearchModal.tsx` to use `useDragState` hook
  - Implement same visual coordination system as AddUnselectedModal
  - Add proper drag source identification to prevent self-muting
  - Test modal coordination across different drag source types
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Update individual track components







- [x] 9.1 Refactor TrackListItem component


  - Update track item components to use new `useDraggable` hook
  - Implement proper drag handle props and visual feedback
  - Add accessibility attributes and keyboard navigation support
  - Remove any legacy drag-related code and event handlers
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4_

- [x] 9.2 Update modal track items


  - Ensure track items in modals use appropriate drag types ('modal-track', 'search-track')
  - Implement proper payload creation with source identification
  - Add visual feedback for draggable items in modal contexts
  - Test cross-modal drag operations thoroughly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.2, 8.3, 8.4_

- [x] 9.5. Eliminate modal UI duplication through abstraction






- [x] 9.5.1 Create useModalDragInteraction hook


  - Extract duplicated modal drag coordination logic from AddUnselectedModal and SpotifySearchModal
  - Create `src/hooks/useModalDragInteraction.ts` that consumes useDragState and returns modalStyles and backdropStyles
  - Remove duplicated shouldMuteModal, modalStyles, and backdropStyles memoization from both modal components
  - Ensure hook handles proper opacity transitions and pointer-events management during drag operations
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9.5.2 Create useTrackSelection hook


  - Extract duplicated track selection state management from both modal components
  - Create `src/hooks/useTrackSelection.ts` that manages selectedTracksToAdd Set state
  - Provide handleTrackSelect, handleAddSelected, and clearSelection functions
  - Accept available tracks list and onAddTracks callback as parameters
  - Remove duplicated selection logic from AddUnselectedModal and SpotifySearchModal
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9.5.3 Create useUnselectedTracks hook


  - Extract data-fetching logic from AddUnselectedModal into dedicated hook
  - Create `src/hooks/useUnselectedTracks.ts` following the pattern of useSpotifySearch
  - Handle playlist track fetching, deduplication, and filtering logic
  - Return loading state, tracks data, search functionality, and error handling
  - Make AddUnselectedModal symmetrical with SpotifySearchModal in terms of data hook usage
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9.5.4 Create generic TrackSourceModal component


  - Create `src/components/TrackSourceModal.tsx` as a generic modal component
  - Handle shared layout structure: header info, search input, track list, and footer
  - Use the new hooks (useModalDragInteraction, useTrackSelection) for shared behavior
  - Accept data source hook results, title, and search configuration as props
  - Implement proper drag handlers with configurable drag types (modal-track vs search-track)
  - Include footer with track count pluralization and action buttons
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_

- [x] 9.5.5 Refactor modal components to use generic TrackSourceModal


  - Update AddUnselectedModal to become a thin wrapper around TrackSourceModal
  - Update SpotifySearchModal to become a thin wrapper around TrackSourceModal
  - Each modal should only be responsible for calling its data hook and passing results to TrackSourceModal
  - Remove all duplicated UI logic, state management, and event handlers
  - Ensure backward compatibility with existing component interfaces
  - Test that both modals maintain their current functionality with significantly reduced code
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_

- [x] 10. Implement comprehensive error handling and cleanup






- [x] 10.1 Add drag operation error boundaries


  - Create error boundary component specifically for drag operations
  - Implement automatic drag state cleanup on JavaScript errors
  - Add proper error logging and user feedback for drag failures
  - Test error recovery scenarios and edge cases
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10.2 Implement robust cleanup mechanisms


  - Ensure all timers, event listeners, and animation frames are properly cleaned up
  - Add component unmount safety for active drag operations
  - Implement drag state reset on route changes or app state changes
  - Test memory leak prevention and performance under stress
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11. Create comprehensive test suite

- [ ] 11.1 Unit test drag slice
  - Write comprehensive tests for `dragSlice.ts` state management
  - Test concurrent drag prevention and state transitions
  - Verify scroll position capture and restoration functionality
  - Test error scenarios and edge cases
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 11.2 Unit test modular hooks
  - Create unit tests for each individual drag hook (useDragState, useDragHandlers, etc.)
  - Mock dependencies and test hook behavior in isolation
  - Verify proper cleanup and memory management
  - Test cross-hook integration and data flow
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 11.3 Integration test drag workflows
  - Write integration tests for complete drag-and-drop workflows
  - Test internal reordering, external track addition, and modal coordination
  - Verify scroll position preservation across different scenarios
  - Test cross-platform compatibility (mouse, touch, keyboard)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4_

- [ ] 11.4 Test error scenarios and edge cases
  - Test drag operations during component unmounting
  - Verify behavior with invalid drag data or corrupted state
  - Test concurrent user interactions and race conditions
  - Verify proper fallback behavior when features are unavailable
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 12. Performance optimization and validation

- [ ] 12.1 Optimize drag performance
  - Profile drag operations with large track lists (1000+ items)
  - Optimize re-render frequency and component memoization
  - Ensure smooth 60fps performance during drag operations
  - Minimize memory allocation during drag operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 12.2 Validate cross-platform compatibility
  - Test drag operations on desktop browsers (Chrome, Firefox, Safari, Edge)
  - Verify touch drag functionality on mobile devices (iOS Safari, Android Chrome)
  - Test keyboard accessibility with screen readers
  - Ensure consistent behavior across different input methods
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 13. Documentation and final integration

- [ ] 13.1 Update component documentation
  - Document new drag-and-drop API and hook usage patterns
  - Create migration guide from old DragContext to new system
  - Add code examples and best practices for drag implementation
  - Update TypeScript documentation and interface descriptions
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13.2 Final integration testing
  - Test complete application with new drag system
  - Verify no regressions in existing functionality
  - Test edge cases like rapid user interactions and network issues
  - Perform final performance validation and optimization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ] 13.3 Production readiness validation
  - Run complete test suite and ensure 100% pass rate
  - Perform accessibility audit with automated tools and manual testing
  - Validate bundle size impact and loading performance
  - Create rollback plan and deployment strategy
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

- [x] 14. Refactor DraggableTrackList component complexity

- [x] 14.1 Extract debugging and monitoring logic
  - Create `src/hooks/useScrollDebugger.ts` hook to consolidate all scroll monitoring logic
  - Move DOM mutation observer, page scroll monitoring, and focus change tracking into the debug hook
  - Add environment-based conditional activation (only enable in development mode)
  - Remove all debugging console.log statements from the main component
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 14.2 Simplify scroll position management
  - Remove redundant useEffect hooks that monitor scroll position changes
  - Consolidate scroll position capture/restore logic into single, focused functions
  - Remove lastScrollTopRef and manual scroll tracking in favor of store-based approach
  - Eliminate overlapping scroll monitoring effects that create noise
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 14.3 Extract drop position calculation logic
  - Create `src/utils/dropPositionCalculator.ts` utility for drop position logic
  - Move `calculateDropPosition` function and related logic out of component
  - Create `useDropPosition` hook that manages drop position state and calculations
  - Simplify component by removing complex drop position state management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 14.4 Extract custom touch event handling
  - Create `src/hooks/useCustomTouchEvents.ts` for custom touch drag event listeners
  - Move `handleTouchDragOver` and `handleTouchDrop` logic into dedicated hook
  - Document the custom touch event system and its interaction with HTML5 drag events
  - Reduce component complexity by abstracting touch event coordination
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 14.5 Simplify track management functions
  - Consolidate `handleInternalReorder`, `handleExternalAdd`, and `handleTrackRemove` into a single `useTrackOperations` hook
  - Remove redundant scroll position capture calls by handling it centrally in the hook
  - Simplify error handling and validation logic
  - Reduce component size by extracting business logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 14.6 Clean up component structure and remove noise
  - Remove all debugging-related useEffect hooks and console.log statements
  - Consolidate remaining useEffect hooks where possible
  - Simplify component props and state management
  - Focus component responsibility on rendering and coordinating extracted hooks
  - Add comprehensive JSDoc comments for remaining complex logic
  - _Requirements: 7.1, 7.2, 7.3, 7.4_