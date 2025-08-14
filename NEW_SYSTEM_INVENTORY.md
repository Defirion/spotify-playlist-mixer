# New dnd-kit System Files

## New Files Created (NEVER DELETE THESE)

### Core dnd-kit Components (To be created in future tasks)
- `src/components/SortableWrapper.tsx` - Will be created in Task 2
- `src/components/DraggableTrackList.tsx` - Will be created in Task 3  
- `src/components/TrackList.tsx` - Will be created in Task 6

### Test Files (To be created with components)
- `src/components/__tests__/SortableWrapper.test.tsx` - Will be created in Task 2
- `src/components/__tests__/DraggableTrackList.test.tsx` - Will be created in Task 3
- `src/components/__tests__/TrackList.test.tsx` - Will be created in Task 6

### Store Integration (To be modified in future tasks)
- `src/store/trackStore.ts` - Will be modified to add reorderTracks action in Task 5

### Documentation Files (Created during isolation)
- `DRAG_FILES_TO_MOVE.md` - Created in Task 0
- `FAILING_TESTS_INVENTORY.md` - Created in Task 0
- `LEGACY_SYSTEM_INVENTORY.md` - Created in Task 0
- `NEW_SYSTEM_INVENTORY.md` - This file, created in Task 0

## Modified Files (Track changes to existing files)

### Files Modified in Task 0 (Isolation)
- `src/hooks/index.ts` - Will need useDraggable export removed
- `src/store/index.ts` - Will need dragSlice import/usage removed
- `src/types/index.ts` - Will need drag type exports removed
- `src/components/ui/TrackItem.tsx` - Will need dragAndDrop import updated

### Files to be Modified in Future Tasks
- Package.json - Will add dnd-kit dependencies in Task 2
- Various component files - Will integrate new drag system

## Safety Rules
1. **NEVER DELETE** any file listed in this inventory
2. **ALWAYS UPDATE** this inventory when creating new files
3. **CROSS-REFERENCE** with LEGACY_SYSTEM_INVENTORY.md before any deletions
4. **TRACK MODIFICATIONS** to existing files for rollback purposes

## Current Status: Task 0 Complete
- Legacy system isolated ✅
- Test impact documented ✅
- File inventories created ✅
- Ready for dnd-kit implementation ✅