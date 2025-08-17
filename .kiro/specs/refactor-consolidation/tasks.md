# Implementation Plan

## Task Overview

This plan consolidates the remaining incomplete tasks from multiple refactor specs into a single, streamlined implementation. The focus is on completing existing work rather than starting new initiatives.

## Consolidated Tasks

- [x] 1. Complete TypeScript migration for remaining JavaScript files (MAX 30 lines of changes per file)
  - **Purpose**: Convert all remaining JavaScript files to TypeScript with proper type annotations
  - Convert `src/jest.polyfills.js` to TypeScript (likely can stay as .js since it's polyfills)
  - Convert `src/hooks/index.js` to TypeScript (remove duplicate with existing index.ts)
  - Convert `src/mocks/browser.js` to `browser.ts` with proper MSW types
  - Convert `src/mocks/fixtures.js` to `fixtures.ts` with proper type annotations
  - Convert `src/mocks/handlers.js` to `handlers.ts` with MSW handler types
  - Convert `src/mocks/server.js` to `server.ts` with MSW server types
  - Convert `src/services/__tests__/apiErrorHandler.test.js` to `.test.ts`
  - Convert `src/hooks/__tests__/useSpotifySearch.test.js` to `.test.ts`
  - Convert `src/hooks/__tests__/useVirtualization.test.js` to `.test.ts`
  - Convert `src/test-utils/msw-setup.js` to `msw-setup.ts`
  - Convert `src/__mocks__/axios.js` to `axios.ts` with proper mock types
  - Convert `src/__tests__/integration/ComponentInteractions.test.js` to `.test.ts`
  - Convert `src/__tests__/integration/PlaylistMixerWorkflow.test.js` to `.test.ts`
  - Update TypeScript configuration to enable strict mode if not already enabled
  - Fix any remaining TypeScript compilation errors
  - Run `npx tsc --noEmit` to verify zero TypeScript errors
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Complete error boundary implementation for critical UI sections (MAX 40 lines)
  - **Purpose**: Add error boundaries to critical components that don't already have them
  - **Step 1**: Search for components that handle user data: `grep -r "useState\|useEffect" src/components/ --include="*.tsx"` to identify components needing error boundaries
  - **Step 2**: Check existing error boundary coverage: `grep -r "ErrorBoundary\|withErrorBoundary" src/components/ --include="*.tsx"`
  - Wrap PlaylistSelector component with ErrorBoundary if not already wrapped
  - Wrap RatioConfig component with ErrorBoundary if not already wrapped
  - Ensure MixPreview component has proper error boundary coverage
  - Add error boundaries to any other critical components identified in search
  - Test error boundary functionality with intentional errors
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Standardize API error handling patterns (MAX 50 lines)
  - **Purpose**: Ensure consistent error handling across all API calls
  - **Step 1**: Search for all API calls: `grep -r "fetch\|axios\|api" src/ --include="*.ts" --include="*.tsx"` to identify all API call locations
  - **Step 2**: Search for existing error handling: `grep -r "catch\|\.error\|throw" src/ --include="*.ts" --include="*.tsx"` to audit current patterns
  - Review existing API error handling in Spotify service calls
  - Standardize error message formatting and user feedback across all identified API calls
  - Add proper error logging for debugging purposes to any API calls missing it
  - Ensure consistent error handling patterns in hooks like useSpotifySearch, useUserPlaylists
  - Test error scenarios with network failures and API rate limits
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Add missing unit tests for mixer utility modules (MAX 100 lines per test file)
  - **Purpose**: Complete test coverage for the modular mixer utilities
  - **Step 1**: Check existing test coverage: `find src/utils/mixer/__tests__/ -name "*.test.ts"` to see what tests already exist
  - **Step 2**: Identify untested functions: `grep -r "export.*function\|export.*const.*=" src/utils/mixer/ --include="*.ts"` to find all exported functions
  - **Step 3**: Run coverage report: `npm test -- --coverage --testPathPattern=mixer` to identify coverage gaps
  - Add comprehensive tests for `mixerUtils.ts` covering all utility functions (if not already complete)
  - Add comprehensive tests for `trackShuffler.ts` covering shuffling algorithms (if not already complete)
  - Add comprehensive tests for `popularityCalculator.ts` covering popularity calculations (if not already complete)
  - Add comprehensive tests for `popularityQuadrants.ts` covering quadrant management (if not already complete)
  - Add comprehensive tests for `mixingStrategies.ts` covering all strategies (if not already complete)
  - Add tests for any other mixer modules identified in the search
  - Ensure >80% test coverage for all mixer modules
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Create integration tests for complete mixing workflows (MAX 150 lines)
  - **Purpose**: Test end-to-end mixing functionality with real-world scenarios
  - Create integration tests for complete playlist mixing workflows
  - Test with various playlist sizes and configurations
  - Test error scenarios like empty playlists and invalid ratios
  - Verify mixing output consistency and correctness
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Add performance tests for critical paths (MAX 100 lines)
  - **Purpose**: Ensure performance remains acceptable with large datasets
  - Create performance tests with large playlists (1000+ tracks)
  - Profile memory usage during mixing operations
  - Benchmark against previous performance baselines
  - Optimize any performance bottlenecks found
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7. Mobile and keyboard accessibility testing for dnd-kit (Manual Testing)
  - **Purpose**: Complete the dnd-kit implementation with thorough testing
  - Test touch drag on actual iOS device (Safari)
  - Test touch drag on actual Android device (Chrome)
  - Test keyboard navigation with Tab, Space/Enter, and arrow keys
  - Test with screen reader if available
  - Verify 250ms delay feels responsive and 5px tolerance works
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Remove unused imports and clean up accumulated technical debt (MAX 20 lines per file)
  - **Purpose**: Clean up accumulated technical debt from multiple incomplete refactors
  - **Step 1**: Find unused imports: Run TypeScript compiler with `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` to identify unused imports and variables
  - **Step 2**: Find dead code: Search for commented code: `grep -r "//.*TODO\|//.*FIXME\|//.*console\|/\*.*\*/" src/ --include="*.ts" --include="*.tsx"`
  - **Step 3**: Find duplicate functions: Search for similar function names: `grep -r "export.*function" src/ --include="*.ts" | sort` to identify potential duplicates
  - **Step 4**: Find inconsistent naming: Search for inconsistent patterns: `grep -r "const.*Handler\|const.*handler\|function.*Handler\|function.*handler" src/ --include="*.ts" --include="*.tsx"`
  - **Technical Debt Cleanup Details**:
    - Remove unused imports identified by TypeScript compiler
    - Remove commented-out code blocks and TODO comments from incomplete refactors
    - Standardize naming conventions (camelCase for functions, PascalCase for components)
    - Remove any `.bak` files like `playlistMixer.js.bak`
    - Consolidate duplicate utility functions found in search
    - Update deprecated React patterns (class components to functional, old hook patterns)
    - Remove any temporary workarounds or feature flags from incomplete refactors
    - Standardize error message formats and logging patterns
  - Update deprecated patterns to use current best practices
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Final integration testing and validation (Manual Testing)
  - **Purpose**: Ensure all refactored components work together correctly
  - Test complete application with all refactored components
  - Verify no regressions in existing functionality
  - Test edge cases like rapid user interactions and network issues
  - Perform cross-browser testing (Chrome, Firefox, Safari, Edge)
  - Test with large playlists to verify performance
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Update documentation and create migration notes (MAX 100 lines)
  - **Purpose**: Document the completed refactors and architectural decisions
  - Update README with new architecture information
  - Document the dnd-kit drag system implementation
  - Create migration notes for the modular mixer system
  - Add JSDoc comments to any public APIs that lack them
  - Document established file size limits and coding standards
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

## Task Completion Gates

**NEVER mark a task complete unless ALL gates pass:**

### Gate 1: TypeScript Compilation
1. Run `npx tsc --noEmit`
2. Zero TypeScript errors allowed
3. Fix all type issues immediately

### Gate 2: Build Success
1. Run `npm run build`
2. Build must complete successfully
3. Fix any build errors immediately

### Gate 3: Test Success
1. Run `npm test -- --watchAll=false`
2. ALL tests must pass (existing + new)
3. Fix failing tests immediately
4. Never leave failing tests behind

### Gate 4: Pre-commit Quality Check
1. Run `npm run lint:fix` to auto-fix issues
2. Run `npm run lint` - zero errors allowed
3. Run `npm run format:check` - must pass

### Gate 5: File Size Limits
1. Check file size against task limits
2. If approaching limit, split functionality
3. Use line count tools to verify

### Gate 6: Function Size Check
1. No function over 45 lines (target: 35-40)
2. If over 45 lines, split or simplify
3. Event handlers get slight leeway for related event handling

**No exceptions. All gates must pass before marking complete.**

## Anti-Over-Engineering Safeguards

1. **Use existing patterns** - Don't create new architectural systems
2. **Complete existing work** - Don't start new refactors
3. **File size limits** - Enforce established limits strictly
4. **Test-driven** - Write tests for new functionality only
5. **Minimal changes** - Make the smallest change needed to complete requirements

## Success Criteria

- All TypeScript compilation passes without errors
- All tests pass with maintained or improved coverage
- Build succeeds without warnings
- No performance regressions in key workflows
- All existing functionality preserved exactly as before
- Documentation reflects current architecture accurately