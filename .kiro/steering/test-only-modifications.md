---
inclusion: manual
---

# Test-Only Modification Rules

## CRITICAL: When Task Says "Just Make Tests Pass"

This steering file applies specifically to tasks that involve fixing failing tests WITHOUT implementing new functionality.

### FORBIDDEN ACTIONS:
- ❌ Creating ANY new source files (components, utils, hooks, services, etc.)
- ❌ Editing ANY component files (.tsx, .ts files outside __tests__)
- ❌ Modifying imports in source files
- ❌ Implementing ANY functionality
- ❌ Re-creating moved/deleted files
- ❌ Adding new exports to existing files
- ❌ Changing component logic or behavior

### ALLOWED ACTIONS ONLY:
- ✅ Edit test files (files in __tests__ folders or .test.* files)
- ✅ Add `test.skip()` or `describe.skip()` to failing tests
- ✅ Update `jest.mock()` calls in test files
- ✅ Comment out test assertions that reference removed functionality
- ✅ Create documentation files (*.md)
- ✅ Update task status using taskStatus tool

### VERIFICATION BEFORE ANY EDIT:
**Ask yourself: "Is this file a test file or documentation?"**
- If NO, STOP immediately
- If YES, proceed with test-only modifications

### TEST FILE IDENTIFICATION:
- Files in `__tests__` folders
- Files ending in `.test.js`, `.test.ts`, `.test.tsx`
- Files ending in `.spec.js`, `.spec.ts`, `.spec.tsx`

### EMERGENCY BRAKE:
If you find yourself about to edit a source file, IMMEDIATELY STOP and explain why the test-only approach won't work instead of making the edit.

### TASK-SPECIFIC APPROACH:
For "Address failing tests systematically":
1. **Skip drag-related tests** with `test.skip()` and TODO comments
2. **Mock missing imports** in test files only
3. **Comment out assertions** that reference removed functionality
4. **Document what was skipped** in TEST_RESTORATION_PLAN.md

### SUCCESS CRITERIA:
- Test suite runs without crashing
- No new source files created
- No source file modifications
- Clear documentation of what was skipped