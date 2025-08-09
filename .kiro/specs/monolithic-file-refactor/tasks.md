# Implementation Plan

- [x] 1. Set up modular directory structure and types





  - Create `src/utils/mixer/` directory structure
  - Create `src/utils/mixer/types.ts` with internal interfaces and types
  - Create `src/utils/mixer/index.ts` as main export barrel
  - Set up proper TypeScript module exports and imports
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

- [x] 2. Extract and implement utility functions module





  - Create `src/utils/mixer/mixerUtils.ts` with utility functions
  - Move `safeObjectKeys`, `calculateTotalDuration` functions from original file
  - Implement `validateTrack`, `cleanPlaylistTracks`, `formatDuration` functions
  - Add centralized debug logging function `logDebugInfo`
  - Write comprehensive unit tests for all utility functions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2_

- [x] 3. Implement track shuffling module





  - Create `src/utils/mixer/trackShuffler.ts` with shuffling algorithms
  - Move `shuffleArray` function from original file with Fisher-Yates implementation
  - Implement `shuffleQuadrants` function for shuffling within popularity groups
  - Implement `shuffleWithinGroups` function for playlist-level shuffling
  - Add `getRandomTrack` function with exclusion support
  - Write unit tests covering all shuffling scenarios and edge cases
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2_

- [x] 4. Implement popularity calculator module





  - Create `src/utils/mixer/popularityCalculator.ts` with popularity logic
  - Move `getAdjustedPopularity` function from original file
  - Implement `calculateRecencyBonus` function for date-based calculations
  - Implement `sortTracksByPopularity` function for track ordering
  - Add `getPopularityMetrics` function for debugging and statistics
  - Write unit tests covering recency calculations, edge cases, and sorting
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_

- [x] 5. Implement popularity quadrants module





  - Create `src/utils/mixer/popularityQuadrants.ts` with quadrant management
  - Move `createPopularityQuadrants` function from original file
  - Move `createPopularityPools` function from original file
  - Implement `getQuadrantStats` function for debugging information
  - Implement `validateQuadrants` function for data integrity
  - Integrate with popularity calculator and track shuffler modules
  - Write unit tests for quadrant creation, validation, and statistics
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_

- [ ] 6. Implement mixing strategies module using strategy pattern
  - Create `src/utils/mixer/mixingStrategies.ts` with strategy implementations
  - Move `getTracksForPosition` logic from original file
  - Implement `MixingStrategy` interface and individual strategy classes
  - Create `MixedStrategy`, `FrontLoadedStrategy`, `MidPeakStrategy`, `CrescendoStrategy` classes
  - Implement `StrategyManager` class with factory pattern
  - Add fallback mechanism when strategy pools are exhausted
  - Write unit tests for each strategy and the strategy manager
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2_

- [ ] 7. Refactor main playlist mixer orchestrator
  - Create new streamlined `src/utils/mixer/playlistMixer.ts` (target ~200 lines)
  - Implement `createMixingContext` function for initialization
  - Implement `validateInputs` function for input validation
  - Implement `calculateTargetCounts` function for ratio calculations
  - Refactor main `mixPlaylists` function to orchestrate other modules
  - Remove all implementation details, focus on coordination and flow control
  - Integrate all extracted modules through clean interfaces
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2_

- [ ] 8. Update main export and maintain backward compatibility
  - Update `src/utils/mixer/index.ts` to export main `mixPlaylists` function
  - Create compatibility layer in original `src/utils/playlistMixer.ts` location
  - Ensure exact same function signature and behavior as original implementation
  - Add deprecation notice for direct imports from old location
  - Update all existing imports throughout the codebase to use new module structure
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. Implement comprehensive error handling
  - Add input validation with clear error messages in main orchestrator
  - Implement graceful degradation when playlists are exhausted
  - Add fallback mechanisms in strategy implementations
  - Implement infinite loop protection with attempt counters
  - Add proper error context and debugging information
  - Create error recovery mechanisms for common failure scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2_

- [ ] 10. Write comprehensive test suite for all modules
  - Create unit tests for `mixerUtils.ts` covering all utility functions
  - Create unit tests for `trackShuffler.ts` covering shuffling algorithms
  - Create unit tests for `popularityCalculator.ts` covering popularity calculations
  - Create unit tests for `popularityQuadrants.ts` covering quadrant management
  - Create unit tests for `mixingStrategies.ts` covering all strategies
  - Create unit tests for main `playlistMixer.ts` orchestrator
  - Create integration tests for complete mixing workflows
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 11. Performance testing and optimization
  - Create performance tests with large playlists (1000+ tracks)
  - Profile memory usage during mixing operations
  - Optimize algorithms for computational efficiency
  - Benchmark against original implementation to ensure no performance regression
  - Add performance monitoring and metrics collection
  - Document performance characteristics and limitations
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 12. Add comprehensive documentation
  - Add JSDoc documentation to all public functions and interfaces
  - Create inline comments explaining complex algorithms
  - Document the strategy pattern implementation
  - Create usage examples for each module
  - Document migration guide from monolithic to modular structure
  - Add troubleshooting guide for common issues
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 13. Validation and backward compatibility testing
  - Create test suite comparing outputs between old and new implementations
  - Test with real-world playlist data to ensure identical behavior
  - Validate that all existing functionality works exactly as before
  - Test edge cases and error scenarios for consistency
  - Perform regression testing on all mixing strategies
  - Validate performance characteristics match or exceed original
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2_

- [ ] 14. Code quality and standards compliance
  - Ensure all modules follow TypeScript best practices
  - Run ESLint and fix any code quality issues
  - Ensure consistent code formatting with Prettier
  - Add type safety checks and eliminate any `any` types where possible
  - Follow established naming conventions and code organization patterns
  - Ensure all modules have proper error handling and input validation
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 15. Final integration and cleanup
  - Remove original monolithic `playlistMixer.ts` file after migration
  - Update all imports throughout the codebase to use new modular structure
  - Clean up any unused code or temporary compatibility layers
  - Verify all tests pass with the new modular implementation
  - Update build configuration if needed for new module structure
  - Create final documentation and migration notes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2_