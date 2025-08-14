# Comprehensive List of Drag-Related Files to Move

## Core Drag Files
- `src/hooks/useDraggable.ts`
- `src/hooks/useTrackReordering.ts`
- `src/components/DraggableTrackList.tsx`
- `src/components/DraggableTrackList.module.css`
- `src/components/TrackListItem.tsx`
- `src/store/slices/dragSlice.ts`
- `src/types/dragAndDrop.ts`
- `src/utils/dragAndDrop.ts`

## Drag Service Files
- `src/services/dragMemoryLeakDetector.ts`
- `src/services/dragErrorRecovery.ts`
- `src/services/dragCleanupManager.ts`

## Drag Hook Modules (in src/hooks/drag/)
- `src/hooks/drag/useAutoScroll.ts`
- `src/hooks/drag/useDragCleanup.ts`
- `src/hooks/drag/useDragHandlers.ts`
- `src/hooks/drag/useDragState.ts`
- `src/hooks/drag/useDragVisualFeedback.ts`
- `src/hooks/drag/useGlobalScrollLock.ts`
- `src/hooks/drag/useKeyboardDrag.ts`
- `src/hooks/drag/useTouchDrag.ts`

## Modal Drag Integration
- `src/hooks/useModalDragInteraction.ts`

## Test Files
- `src/hooks/__tests__/useDraggable.test.js`
- `src/store/slices/__tests__/dragSlice.test.ts`
- `src/services/__tests__/dragErrorRecovery.test.ts`
- `src/hooks/drag/__tests__/useAutoScroll.test.ts`
- `src/hooks/drag/__tests__/useDragCleanup.test.tsx`
- `src/hooks/drag/__tests__/useDragHandlers.test.ts`
- `src/hooks/drag/__tests__/useDragState.test.ts`
- `src/hooks/drag/__tests__/useDragVisualFeedback.test.js`
- `src/hooks/drag/__tests__/useKeyboardDrag.test.ts`
- `src/hooks/drag/__tests__/useTouchDrag.test.ts`

## Files with Drag Imports/Usage (need import updates)
- `src/hooks/index.ts` (exports useDraggable)
- `src/store/index.ts` (imports and uses dragSlice)
- `src/components/__tests__/SpotifySearchModal.test.tsx` (imports useDraggable)
- `src/types/index.ts` (exports DragSlice and related types)

## Total Files to Move: 25 files
## Total Files to Update: 4 files