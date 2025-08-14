# Legacy Drag System Files

## Original → Legacy Mapping

### Core Hooks
- `src/hooks/useDraggable.ts` → `src/legacy-drag-system/hooks/useDraggable.legacy.ts`
- `src/hooks/useTrackReordering.ts` → `src/legacy-drag-system/hooks/useTrackReordering.legacy.ts`
- `src/hooks/useModalDragInteraction.ts` → `src/legacy-drag-system/hooks/useModalDragInteraction.legacy.ts`

### Drag Hook Modules
- `src/hooks/drag/useAutoScroll.ts` → `src/legacy-drag-system/hooks/drag/useAutoScroll.legacy.ts`
- `src/hooks/drag/useDragCleanup.ts` → `src/legacy-drag-system/hooks/drag/useDragCleanup.legacy.ts`
- `src/hooks/drag/useDragHandlers.ts` → `src/legacy-drag-system/hooks/drag/useDragHandlers.legacy.ts`
- `src/hooks/drag/useDragState.ts` → `src/legacy-drag-system/hooks/drag/useDragState.legacy.ts`
- `src/hooks/drag/useDragVisualFeedback.ts` → `src/legacy-drag-system/hooks/drag/useDragVisualFeedback.legacy.ts`
- `src/hooks/drag/useGlobalScrollLock.ts` → `src/legacy-drag-system/hooks/drag/useGlobalScrollLock.legacy.ts`
- `src/hooks/drag/useKeyboardDrag.ts` → `src/legacy-drag-system/hooks/drag/useKeyboardDrag.legacy.ts`
- `src/hooks/drag/useTouchDrag.ts` → `src/legacy-drag-system/hooks/drag/useTouchDrag.legacy.ts`

### Components
- `src/components/DraggableTrackList.tsx` → `src/legacy-drag-system/components/DraggableTrackList.legacy.tsx`
- `src/components/DraggableTrackList.module.css` → `src/legacy-drag-system/components/DraggableTrackList.module.legacy.css`
- `src/components/TrackListItem.tsx` → `src/legacy-drag-system/components/TrackListItem.legacy.tsx`

### Store
- `src/store/slices/dragSlice.ts` → `src/legacy-drag-system/store/slices/dragSlice.legacy.ts`

### Services
- `src/services/dragMemoryLeakDetector.ts` → `src/legacy-drag-system/services/dragMemoryLeakDetector.legacy.ts`
- `src/services/dragErrorRecovery.ts` → `src/legacy-drag-system/services/dragErrorRecovery.legacy.ts`
- `src/services/dragCleanupManager.ts` → `src/legacy-drag-system/services/dragCleanupManager.legacy.ts`

### Types and Utils
- `src/types/dragAndDrop.ts` → `src/legacy-drag-system/types/dragAndDrop.legacy.ts`
- `src/utils/dragAndDrop.ts` → `src/legacy-drag-system/utils/dragAndDrop.legacy.ts`

### Test Files
- `src/hooks/__tests__/useDraggable.test.js` → `src/legacy-drag-system/hooks/__tests__/useDraggable.test.legacy.js`
- `src/store/slices/__tests__/dragSlice.test.ts` → `src/legacy-drag-system/store/slices/__tests__/dragSlice.test.legacy.ts`
- `src/services/__tests__/dragErrorRecovery.test.ts` → `src/legacy-drag-system/services/__tests__/dragErrorRecovery.test.legacy.ts`
- `src/hooks/drag/__tests__/useAutoScroll.test.ts` → `src/legacy-drag-system/hooks/drag/__tests__/useAutoScroll.test.legacy.ts`
- `src/hooks/drag/__tests__/useDragCleanup.test.tsx` → `src/legacy-drag-system/hooks/drag/__tests__/useDragCleanup.test.legacy.tsx`
- `src/hooks/drag/__tests__/useDragHandlers.test.ts` → `src/legacy-drag-system/hooks/drag/__tests__/useDragHandlers.test.legacy.ts`
- `src/hooks/drag/__tests__/useDragState.test.ts` → `src/legacy-drag-system/hooks/drag/__tests__/useDragState.test.legacy.ts`
- `src/hooks/drag/__tests__/useDragVisualFeedback.test.js` → `src/legacy-drag-system/hooks/drag/__tests__/useDragVisualFeedback.test.legacy.js`
- `src/hooks/drag/__tests__/useKeyboardDrag.test.ts` → `src/legacy-drag-system/hooks/drag/__tests__/useKeyboardDrag.test.legacy.ts`
- `src/hooks/drag/__tests__/useTouchDrag.test.ts` → `src/legacy-drag-system/hooks/drag/__tests__/useTouchDrag.test.legacy.ts`

## Files Safe to Delete (ONLY THESE)
**CRITICAL: Only delete files explicitly listed above in legacy folder with .legacy extension**

### Legacy Files That Can Be Safely Deleted Later:
- All files in `src/legacy-drag-system/` folder with `.legacy` extension
- Any imports/references to the original paths listed above

### NEVER DELETE:
- Any files in main `src/` directory that are NOT listed in the "Original" column above
- Any files without `.legacy` extension
- Any files not explicitly listed in this inventory

## Total Files Moved: 25 files
## Total Test Files Moved: 10 files

## Safety Verification Commands:
```bash
# Verify legacy files exist
ls -la src/legacy-drag-system/hooks/*.legacy.*
ls -la src/legacy-drag-system/components/*.legacy.*
ls -la src/legacy-drag-system/store/slices/*.legacy.*

# Verify original files are gone
ls src/hooks/useDraggable.ts  # Should not exist
ls src/store/slices/dragSlice.ts  # Should not exist
```