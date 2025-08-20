# Test Infrastructure Repair Requirements

## Introduction

The test suite is experiencing critical failures that prevent proper testing and break core functionality like Spotify playlist search. Multiple issues need to be addressed systematically to restore a working test environment.

## Requirements

### Requirement 1: Fix Jest Worker Crashes

**User Story:** As a developer, I want Jest tests to run without worker crashes, so that I can reliably test the application.

#### Acceptance Criteria

1. WHEN running `npm test` THEN Jest workers SHALL NOT crash with "child process exceptions"
2. WHEN tests complete THEN there SHALL be no "Converting circular structure to JSON" errors
3. WHEN MSW handlers return responses THEN they SHALL NOT contain circular references
4. IF MSW setup fails THEN tests SHALL gracefully fall back without crashing the entire suite

### Requirement 2: Restore Spotify Search Functionality

**User Story:** As a developer, I want Spotify playlist search to work in tests and production, so that users can find and add playlists.

#### Acceptance Criteria

1. WHEN a user searches for playlists THEN search results SHALL appear in the UI
2. WHEN MSW handlers mock Spotify API THEN they SHALL return properly formatted playlist data
3. WHEN search API calls are made THEN they SHALL match the expected Spotify API response format
4. IF search fails THEN appropriate error handling SHALL be displayed to the user

### Requirement 3: Fix MSW Handler Response Format

**User Story:** As a developer, I want MSW handlers to return consistent API responses, so that tests accurately simulate real Spotify API behavior.

#### Acceptance Criteria

1. WHEN MSW handles `/search` requests THEN it SHALL return playlist data under `playlists.items`
2. WHEN playlist search is performed THEN the response format SHALL match Spotify's actual API structure
3. WHEN multiple handlers exist THEN they SHALL use consistent response formats
4. IF different test files use different MSW setups THEN they SHALL not conflict with each other

### Requirement 4: Eliminate Test Suite Inconsistencies

**User Story:** As a developer, I want all tests to use consistent mocking strategies, so that test results are reliable and predictable.

#### Acceptance Criteria

1. WHEN tests import MSW handlers THEN they SHALL use the same handler definitions
2. WHEN multiple MSW handler files exist THEN they SHALL be consolidated or clearly separated by purpose
3. WHEN tests run THEN there SHALL be no conflicting mock implementations
4. IF a test needs custom handlers THEN it SHALL extend base handlers rather than replace them

### Requirement 5: Restore Test Coverage

**User Story:** As a developer, I want all previously passing tests to pass again, so that I can maintain confidence in the codebase.

#### Acceptance Criteria

1. WHEN tests run THEN the number of passing tests SHALL be restored to previous levels
2. WHEN integration tests run THEN they SHALL successfully find UI elements and complete workflows
3. WHEN search functionality is tested THEN it SHALL work with proper MSW mocking
4. IF tests were skipped due to infrastructure issues THEN they SHALL be re-enabled once fixed