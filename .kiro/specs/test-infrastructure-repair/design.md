# Test Infrastructure Repair Design

## Overview

The test infrastructure has multiple critical issues causing Jest worker crashes, broken Spotify search functionality, and inconsistent MSW handler behavior. This design addresses these issues systematically by consolidating MSW handlers, fixing circular reference issues, and ensuring consistent API response formats.

## Architecture

### Current Problem Analysis

1. **Duplicate MSW Handler Files**: Two separate handler files exist with different response formats
   - `src/mocks/handlers.ts` - Returns `tracks.items` for search
   - `src/test-utils/mocks/mswHandlers.ts` - Returns `playlists.items` for search

2. **Circular JSON References**: MSW responses contain circular references causing Jest worker crashes

3. **Inconsistent Search Response Format**: Search handlers return different data structures

4. **MSW Setup Conflicts**: Multiple MSW setup patterns causing initialization issues

### Solution Architecture

```
Test Infrastructure
├── Single Source of Truth MSW Handlers
│   ├── Consolidated handlers in src/mocks/handlers.ts
│   ├── Proper Spotify API response format
│   └── No circular references in responses
├── Consistent MSW Setup
│   ├── Single setup pattern across all tests
│   ├── Graceful fallback for MSW failures
│   └── Proper cleanup between tests
└── Fixed Search Implementation
    ├── Correct playlist search response format
    ├── Proper error handling
    └── Consistent with actual Spotify API
```

## Components and Interfaces

### MSW Handler Consolidation

**Primary Handler File**: `src/mocks/handlers.ts`
- Single source of truth for all MSW handlers
- Proper Spotify API response format
- No circular references

**Response Format Standardization**:
```typescript
// Search endpoint should return:
{
  playlists: {
    items: SpotifyPlaylist[],
    total: number,
    limit: number,
    offset: number
  }
}
```

### MSW Setup Simplification

**Setup Pattern**:
- Use single MSW setup in `src/test-utils/msw-setup.ts`
- Remove duplicate setup files
- Ensure proper cleanup between tests

### Search Hook Fix

**usePlaylistSearch Hook**:
- Expect `response.data.playlists.items` format
- Remove fallback to `tracks.items` which was causing confusion
- Proper error handling for malformed responses

## Data Models

### Spotify API Response Format

```typescript
interface SpotifySearchResponse {
  playlists: {
    items: SpotifyPlaylist[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
    href: string;
  };
  images: any[];
  external_urls: {
    spotify: string;
  };
}
```

## Error Handling

### MSW Handler Error Prevention

1. **Avoid Circular References**: Ensure all response objects are serializable
2. **Proper Error Responses**: Return standard HTTP error responses without circular refs
3. **Graceful Degradation**: If MSW fails to load, tests should continue with fallback mocks

### Search Error Handling

1. **API Response Validation**: Check response structure before processing
2. **Fallback Behavior**: Return empty results for malformed responses
3. **User Feedback**: Display appropriate error messages for search failures

## Testing Strategy

### Test Phases

1. **Phase 1**: Fix MSW handler consolidation and circular reference issues
2. **Phase 2**: Restore search functionality with proper response format
3. **Phase 3**: Verify all integration tests pass with fixed infrastructure
4. **Phase 4**: Clean up any remaining test inconsistencies

### Validation Approach

1. **Unit Tests**: Verify individual MSW handlers return correct format
2. **Integration Tests**: Ensure search workflow works end-to-end
3. **Regression Tests**: Confirm previously passing tests still pass
4. **Error Scenario Tests**: Verify graceful handling of MSW failures

## Implementation Notes

### Critical Fixes Required

1. **Remove Duplicate Handler Files**: Consolidate to single source of truth
2. **Fix Search Response Format**: Ensure consistent `playlists.items` structure
3. **Eliminate Circular References**: Clean up all MSW response objects
4. **Standardize MSW Setup**: Use single setup pattern across all tests

### Migration Strategy

1. **Backup Current State**: Document current test failures for comparison
2. **Incremental Fixes**: Address one issue at a time to track progress
3. **Validation at Each Step**: Run tests after each fix to ensure progress
4. **Rollback Plan**: Keep ability to revert changes if issues worsen