# Design Document

## Overview

This design document outlines the final consolidation phase of the Spotify Playlist Mixer refactoring effort. The design focuses on three main areas: consolidating duplicate track components, implementing comprehensive error handling, and creating a complete testing suite. The approach emphasizes maintainability, performance, and user experience while building upon the existing refactored architecture.

## Architecture

### Current State Analysis

The application has undergone three major refactors:
1. **Drag-Drop System Refactor**: Implemented modular drag system with Zustand state management
2. **Monolithic File Refactor**: Broke down large files into focused, testable modules
3. **Spotify Playlist Mixer Refactor**: Modernized components with TypeScript and CSS modules

**Key Issues Identified:**
- TrackItem (generic UI component) and TrackListItem (specific draggable implementation) have overlapping functionality
- Error handling is partially implemented but not consistently applied across all components
- Test coverage is incomplete, particularly for newer refactored modules
- Some error boundaries and cleanup mechanisms need full integration

### Target Architecture

The final architecture will feature:
- **Unified Track Component**: Single, configurable component handling all track display scenarios
- **Comprehensive Error Handling**: Consistent error boundaries and recovery mechanisms
- **Complete Test Coverage**: Unit and integration tests for all components and utilities
- **Performance Optimization**: Memory leak prevention and resource cleanup

## Components and Interfaces

### 1. Unified Track Component System

#### TrackItem Component (Enhanced)
```typescript
interface UnifiedTrackItemProps {
  // Core track data
  track: MixedTrack | SpotifyTrack;
  
  // Display configuration
  variant: 'modal' | 'draggable-list' | 'static-list';
  showIndex?: boolean;
  showCheckbox?: boolean;
  showDragHandle?: boolean;
  showPopularity?: boolean;
  showDuration?: boolean;
  showAlbumArt?: boolean;
  showSourcePlaylist?: boolean;
  
  // Interaction handlers
  onSelect?: (track: MixedTrack | SpotifyTrack) => void;
  onRemove?: (track: MixedTrack | SpotifyTrack, index?: number) => void;
  onClick?: (event: React.MouseEvent, track: MixedTrack | SpotifyTrack) => void;
  
  // Drag configuration (for draggable-list variant)
  dragConfig?: {
    type: DragSourceType;
    scrollContainer?: HTMLElement | null;
    onDragStart?: (item: DraggedItem) => void;
    onDragEnd?: (item: DraggedItem, success: boolean) => void;
  };
  
  // Drop position (for draggable-list variant)
  dropPosition?: DropPosition | null;
  
  // Context data (for draggable-list variant)
  index?: number;
  selectedPlaylists?: SpotifyPlaylist[];
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
  selected?: boolean;
}
```

#### Component Variants
- **Modal Variant**: Checkbox selection, search context styling, modal-specific drag behavior
- **Draggable List Variant**: Drag handles, drop indicators, index display, reordering functionality
- **Static List Variant**: Read-only display, no interaction handlers

### 2. Error Handling Architecture

#### Error Boundary Hierarchy
```typescript
// Application Level
<AppErrorBoundary>
  // Feature Level
  <PlaylistMixerErrorBoundary>
    // Component Level
    <DragErrorBoundary>
      <DraggableTrackList />
    </DragErrorBoundary>
  </PlaylistMixerErrorBoundary>
</AppErrorBoundary>
```

#### Error Recovery Service
```typescript
interface ErrorRecoveryService {
  // Error handling
  handleComponentError(error: Error, errorInfo: ErrorInfo, context: string): Promise<RecoveryResult>;
  handleDragError(error: Error, dragContext: DragContext): Promise<RecoveryResult>;
  handleApiError(error: ApiError, requestContext: RequestContext): Promise<RecoveryResult>;
  
  // Recovery strategies
  recoverDragState(): void;
  recoverScrollPosition(): void;
  clearCorruptedState(): void;
  
  // Monitoring
  reportError(error: Error, context: ErrorContext): void;
  getErrorStatistics(): ErrorStatistics;
}
```

### 3. Testing Architecture

#### Test Structure
```
src/
├── components/
│   ├── __tests__/
│   │   ├── TrackItem.test.tsx (comprehensive unified component tests)
│   │   ├── DraggableTrackList.test.tsx (integration tests)
│   │   └── ErrorBoundaries.test.tsx (error handling tests)
│   └── ui/
│       └── __tests__/
│           └── TrackItem.test.tsx (unit tests)
├── hooks/
│   ├── __tests__/
│   │   ├── useDraggable.test.ts (complete drag hook tests)
│   │   └── useErrorRecovery.test.ts (error handling hook tests)
│   └── drag/
│       └── __tests__/
│           ├── useDragState.test.ts
│           ├── useDragHandlers.test.ts
│           └── useDragCleanup.test.ts
├── services/
│   └── __tests__/
│       ├── errorRecovery.test.ts
│       └── dragCleanupManager.test.ts
└── utils/
    ├── mixer/
    │   └── __tests__/
    │       ├── playlistMixer.test.ts
    │       ├── mixingStrategies.test.ts
    │       └── popularityCalculator.test.ts
    └── __tests__/
        └── dragAndDrop.test.ts
```

## Data Models

### Unified Track Interface
```typescript
interface UnifiedTrack extends SpotifyTrack {
  // Additional fields for mixed tracks
  sourcePlaylist?: string;
  sourcePlaylistName?: string;
  index?: number;
  
  // Computed fields
  quadrant?: PopularityQuadrant;
  adjustedPopularity?: number;
}
```

### Error Context Models
```typescript
interface ErrorContext {
  component: string;
  operation: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

interface DragErrorContext extends ErrorContext {
  dragType: DragSourceType;
  draggedItem?: DraggedItem;
  isDragging: boolean;
  scrollPosition?: number;
}

interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  shouldRetry: boolean;
  retryDelay?: number;
}
```

## Error Handling

### Error Categories and Strategies

#### 1. Component Rendering Errors
- **Detection**: React Error Boundaries
- **Recovery**: Fallback UI, component isolation
- **User Experience**: Graceful degradation with retry options

#### 2. Drag Operation Errors
- **Detection**: Try-catch blocks in drag handlers, state validation
- **Recovery**: Automatic state cleanup, scroll position restoration
- **User Experience**: Visual feedback reset, operation cancellation

#### 3. API Communication Errors
- **Detection**: HTTP status codes, network timeouts, response validation
- **Recovery**: Exponential backoff retry, cached data fallback
- **User Experience**: Loading states, error messages, manual retry

#### 4. Memory and Performance Errors
- **Detection**: Resource monitoring, memory leak detection
- **Recovery**: Automatic cleanup, resource release
- **User Experience**: Performance warnings, optimization suggestions

### Error Boundary Implementation

#### Specialized Error Boundaries
```typescript
// Drag-specific error boundary
<DragErrorBoundary
  onError={(error, errorInfo) => {
    // Clean up drag state
    dragStore.getState().endDrag();
    // Restore scroll position
    scrollStore.getState().restoreScrollPosition();
    // Report error
    errorService.reportDragError(error, errorInfo);
  }}
  fallback={<DragErrorFallback />}
>
  <DraggableTrackList />
</DragErrorBoundary>

// API operation error boundary
<ApiErrorBoundary
  onError={(error, errorInfo) => {
    // Clear loading states
    uiStore.getState().clearLoadingStates();
    // Show error notification
    notificationStore.getState().showError(error.message);
  }}
  fallback={<ApiErrorFallback />}
>
  <PlaylistSelector />
</ApiErrorBoundary>
```

## Testing Strategy

### Unit Testing Approach

#### Component Testing
- **Rendering Tests**: Verify correct rendering with different props
- **Interaction Tests**: Test user interactions (clicks, drags, keyboard)
- **State Tests**: Verify state changes and prop updates
- **Error Tests**: Test error scenarios and recovery

#### Hook Testing
- **State Management**: Test state updates and side effects
- **Cleanup**: Verify proper resource cleanup
- **Error Handling**: Test error scenarios and recovery
- **Performance**: Test with large datasets and edge cases

#### Utility Testing
- **Pure Functions**: Test all input/output combinations
- **Edge Cases**: Test boundary conditions and invalid inputs
- **Performance**: Test with large datasets
- **Error Handling**: Test error scenarios and recovery

### Integration Testing Approach

#### Workflow Testing
- **Complete User Flows**: Test end-to-end user scenarios
- **Component Interactions**: Test component communication
- **State Synchronization**: Test state consistency across components
- **Error Recovery**: Test error scenarios in complete workflows

#### Performance Testing
- **Large Datasets**: Test with 1000+ track playlists
- **Memory Usage**: Monitor memory consumption during operations
- **Drag Performance**: Test smooth drag operations with large lists
- **API Performance**: Test API operations under load

### Test Coverage Goals
- **Unit Tests**: >95% code coverage
- **Integration Tests**: All major user workflows
- **Error Scenarios**: All error types and recovery paths
- **Performance Tests**: All performance-critical operations

## Performance Considerations

### Memory Management
- **Resource Cleanup**: Automatic cleanup of timers, listeners, observers
- **Component Unmounting**: Proper cleanup during component lifecycle
- **Drag Operations**: Immediate resource release after drag completion
- **Memory Leak Detection**: Monitoring and alerting for memory issues

### Rendering Performance
- **Component Memoization**: React.memo for pure components
- **Callback Stabilization**: useCallback for event handlers
- **Expensive Calculations**: useMemo for complex computations
- **Virtual Scrolling**: For large track lists (1000+ items)

### Bundle Optimization
- **Code Splitting**: Lazy loading for non-critical components
- **Tree Shaking**: Remove unused code from bundles
- **Asset Optimization**: Optimize images and static assets
- **Dependency Analysis**: Monitor and optimize bundle size

## Security Considerations

### Error Information Security
- **Sensitive Data Filtering**: Remove sensitive information from error logs
- **User Data Protection**: Ensure user data is not exposed in errors
- **Development vs Production**: Different error detail levels
- **External Reporting**: Safe error reporting to monitoring services

### Resource Security
- **Resource Exhaustion**: Prevent resource exhaustion attacks
- **Cleanup Timeouts**: Timeout mechanisms for stuck operations
- **Memory Limits**: Monitor and limit memory usage
- **Error Rate Limiting**: Prevent error spam and abuse

## Migration Strategy

### Phase 1: Component Consolidation
1. Create unified TrackItem component with variant support
2. Update all usage sites to use unified component
3. Remove duplicate TrackListItem component
4. Update tests and documentation

### Phase 2: Error Handling Implementation
1. Implement comprehensive error boundaries
2. Add error recovery services
3. Integrate cleanup mechanisms
4. Add error monitoring and reporting

### Phase 3: Testing Implementation
1. Create comprehensive unit test suite
2. Add integration tests for workflows
3. Implement performance tests
4. Add error scenario tests

### Phase 4: Optimization and Cleanup
1. Performance optimization and monitoring
2. Memory leak detection and prevention
3. Bundle optimization
4. Documentation and final cleanup