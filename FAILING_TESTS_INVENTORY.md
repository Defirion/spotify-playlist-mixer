# Failing Tests Inventory

## Current Test Status (Before Changes)
- **Total Test Suites**: 57 (14 failed, 43 passed)
- **Total Tests**: 930 (76 failed, 854 passed)
- **Current Failures**: Unrelated to drag system (SpotifySearchModal, AddUnselectedModal, RatioConfig, apiErrorHandler)

## Tests That Will Break After Moving Drag System

### Direct Drag Hook Tests
1. **`src/hooks/__tests__/useDraggable.test.js`**
   - **Why**: File will be moved to legacy folder
   - **Impact**: Test will fail due to missing import path
   - **Solution**: Update import to legacy path or skip temporarily

### Drag Slice Tests
2. **`src/store/slices/__tests__/dragSlice.test.ts`**
   - **Why**: File will be moved to legacy folder
   - **Impact**: Test will fail due to missing import path
   - **Solution**: Update import to legacy path or skip temporarily

### Drag Service Tests
3. **`src/services/__tests__/dragErrorRecovery.test.ts`**
   - **Why**: File will be moved to legacy folder
   - **Impact**: Test will fail due to missing import path
   - **Solution**: Update import to legacy path or skip temporarily

### Drag Hook Module Tests (8 files)
4. **`src/hooks/drag/__tests__/useAutoScroll.test.ts`**
5. **`src/hooks/drag/__tests__/useDragCleanup.test.tsx`**
6. **`src/hooks/drag/__tests__/useDragHandlers.test.ts`**
7. **`src/hooks/drag/__tests__/useDragState.test.ts`**
8. **`src/hooks/drag/__tests__/useDragVisualFeedback.test.js`**
9. **`src/hooks/drag/__tests__/useKeyboardDrag.test.ts`**
10. **`src/hooks/drag/__tests__/useTouchDrag.test.ts`**
    - **Why**: All files will be moved to legacy folder
    - **Impact**: Tests will fail due to missing import paths
    - **Solution**: Update imports to legacy paths or skip temporarily

### Tests with Drag Dependencies
11. **`src/components/__tests__/SpotifySearchModal.test.tsx`**
    - **Why**: Imports `useDraggable` from hooks
    - **Impact**: Import will fail when useDraggable is moved
    - **Solution**: Mock the import or update to legacy path

### Store Integration Tests
12. **Any tests importing from `src/store/index.ts`**
    - **Why**: Store index imports dragSlice which will be moved
    - **Impact**: Store creation will fail
    - **Solution**: Update store index to remove dragSlice temporarily

### Type-Related Test Failures
13. **Tests using drag-related types**
    - **Why**: `src/types/dragAndDrop.ts` will be moved
    - **Impact**: TypeScript compilation errors
    - **Solution**: Update type imports or provide mock types

## Actual New Failures After Move
- **Before Move**: 14 failed suites, 76 failed tests out of 930 total
- **After Move**: 24 failed suites, 14 failed tests out of 613 total
- **New Failures**: 10 additional failed suites, but fewer total tests due to missing drag tests
- **Key Issues**: Missing drag-related imports, legacy test path issues, TrackItem dependency on dragAndDrop utils

## Mitigation Strategy
1. **Skip drag-specific tests** with `test.skip()` and TODO comments
2. **Mock drag imports** in non-drag tests that have dependencies
3. **Update store index** to temporarily exclude dragSlice
4. **Provide minimal type mocks** for TypeScript compilation
5. **Document restoration plan** for each skipped/mocked test

## Success Criteria
- Test suite runs without crashing
- Non-drag functionality tests continue to pass
- Clear path to restore tests with new dnd-kit implementation
## Spe
cific New Failures Identified

### Module Resolution Failures
1. **`src/components/ui/__tests__/TrackList.performance.test.js`**
   - **Error**: Cannot find module '../../utils/dragAndDrop' from 'src/components/ui/TrackItem.tsx'
   - **Cause**: TrackItem.tsx imports dragAndDrop utils which was moved to legacy
   - **Solution**: Update TrackItem.tsx import or provide mock

2. **`src/services/__tests__/dragCleanupManager.test.ts`**
   - **Error**: Cannot find module '../dragCleanupManager'
   - **Cause**: dragCleanupManager was moved to legacy folder
   - **Solution**: Skip test or update import path

### Legacy Test Import Issues
3. **All legacy drag test files** (10 files)
   - **Error**: Cannot find module imports without .legacy extension
   - **Cause**: Test files still reference original paths instead of .legacy paths
   - **Solution**: Update all imports in legacy test files to include .legacy extension

### Store Integration Issues
4. **Legacy store tests**
   - **Error**: Cannot find module '../../index.legacy' 
   - **Cause**: Store index file doesn't exist in legacy folder
   - **Solution**: Create legacy store index or update test imports

## Files Needing Import Updates
- `src/components/ui/TrackItem.tsx` - imports dragAndDrop utils
- `src/hooks/index.ts` - exports useDraggable (needs removal)
- `src/store/index.ts` - imports dragSlice (needs removal)
- `src/types/index.ts` - exports drag types (needs removal)
- All legacy test files - need .legacy extension in imports