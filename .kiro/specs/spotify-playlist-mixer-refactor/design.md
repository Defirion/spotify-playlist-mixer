# Design Document

## Overview

This design document outlines the architectural transformation of the Spotify Playlist Mixer from its current "spaghetti code" state to a production-grade, maintainable application. The refactoring will address code duplication, complex drag-and-drop logic, scattered API calls, performance issues, and poor maintainability while preserving all existing functionality.

The new architecture will follow modern React patterns with clear separation of concerns, reusable components, centralized state management, and optimized performance for large datasets.

## Architecture

### High-Level Architecture Principles

1. **Component Composition**: Replace large, monolithic components with smaller, focused, reusable components
2. **Custom Hooks**: Extract complex logic into reusable custom hooks
3. **Centralized API Layer**: Consolidate all Spotify API interactions in a dedicated service layer
4. **Performance Optimization**: Implement virtualization and eliminate performance bottlenecks
5. **Type Safety**: Gradually introduce TypeScript for better developer experience
6. **Accessibility**: Ensure keyboard navigation and screen reader compatibility

### Directory Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Modal.js
│   │   ├── TrackList.js
│   │   ├── TrackItem.js
│   │   └── Button.js
│   ├── features/              # Feature-specific components
│   │   ├── auth/
│   │   ├── playlist/
│   │   ├── mixer/
│   │   └── drag-drop/
│   └── layout/                # Layout components
├── hooks/                     # Custom hooks
│   ├── useDraggable.js
│   ├── useSpotifyApi.js
│   ├── useVirtualization.js
│   └── useKeyboardNavigation.js
├── services/                  # API and business logic
│   ├── spotify.js
│   ├── playlistMixer.js
│   └── storage.js
├── utils/                     # Utility functions
├── contexts/                  # React contexts
├── types/                     # TypeScript type definitions
└── styles/                    # CSS modules and global styles
```

## Components and Interfaces

### Core UI Components

#### Modal Component

```javascript
// components/ui/Modal.js
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className,
}) => {
  // Unified modal implementation
  // Handles backdrop clicks, ESC key, focus management
  // Supports different sizes and custom styling
};
```

#### TrackList Component

```javascript
// components/ui/TrackList.js
const TrackList = ({
  tracks,
  onTrackSelect,
  onTrackRemove,
  virtualized = false,
  draggable = false,
  selectable = false,
  renderTrackActions,
  className,
}) => {
  // Unified track list with optional virtualization
  // Supports different interaction modes
  // Customizable track actions via render props
};
```

#### TrackItem Component

```javascript
// components/ui/TrackItem.js
const TrackItem = ({
  track,
  onSelect,
  onRemove,
  draggable = false,
  selected = false,
  actions,
  className,
}) => {
  // Single track display component
  // Handles popularity indicators, duration formatting
  // Supports drag handles and custom actions
};
```

### Feature Components

#### Drag and Drop System

```javascript
// hooks/useDraggable.js
const useDraggable = ({
  onDragStart,
  onDragEnd,
  onDrop,
  type = 'default',
  data,
}) => {
  // Unified drag-and-drop logic
  // Handles mouse, touch, and keyboard interactions
  // Provides auto-scroll functionality
  // Manages drag state and cleanup

  return {
    dragHandleProps,
    dropZoneProps,
    isDragging,
    draggedItem,
    previewElement,
  };
};
```

#### Playlist Mixer Refactored

```javascript
// components/features/mixer/PlaylistMixer.js
const PlaylistMixer = ({
  accessToken,
  selectedPlaylists,
  ratioConfig,
  mixOptions,
  onMixedPlaylist,
  onError,
}) => {
  // Simplified mixer component
  // Uses custom hooks for API calls and state management
  // Delegates preview functionality to separate component
};
```

### API Service Layer

#### Spotify API Service

```javascript
// services/spotify.js
class SpotifyService {
  constructor(accessToken) {
    this.api = getSpotifyApi(accessToken);
  }

  async searchTracks(query, options = {}) {
    // Centralized search implementation
  }

  async getPlaylistTracks(playlistId, options = {}) {
    // Handles pagination automatically
    // Returns normalized track data
  }

  async createPlaylist(userId, playlistData) {
    // Playlist creation with error handling
  }

  async addTracksToPlaylist(playlistId, trackUris) {
    // Handles batch operations (100 tracks per request)
  }

  async getUserProfile() {
    // User profile retrieval
  }

  async getUserPlaylists(options = {}) {
    // User playlists with pagination
  }
}
```

#### Custom API Hooks

```javascript
// hooks/useSpotifyApi.js
const useSpotifySearch = (query, options = {}) => {
  // Returns { data, loading, error, refetch }
};

const usePlaylistTracks = (playlistId, options = {}) => {
  // Returns { tracks, loading, error, hasMore, loadMore }
};

const useUserPlaylists = (options = {}) => {
  // Returns { playlists, loading, error, refetch }
};
```

## Data Models

### Track Interface

```typescript
interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  popularity?: number;
  uri: string;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
  sourcePlaylist?: string; // For mixed tracks
}

interface Artist {
  id: string;
  name: string;
  uri: string;
}

interface Album {
  id: string;
  name: string;
  images: Image[];
  release_date: string;
}
```

### Playlist Interface

```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  images: Image[];
  tracks: {
    total: number;
  };
  owner: {
    id: string;
    display_name: string;
  };
  public: boolean;
  uri: string;
  realAverageDurationSeconds?: number;
}
```

### Mix Configuration

```typescript
interface MixOptions {
  totalSongs: number;
  targetDuration: number;
  useTimeLimit: boolean;
  useAllSongs: boolean;
  playlistName: string;
  shuffleWithinGroups: boolean;
  popularityStrategy: 'mixed' | 'popular' | 'balanced';
  recencyBoost: boolean;
  continueWhenPlaylistEmpty: boolean;
}

interface RatioConfig {
  [playlistId: string]: {
    min: number;
    max: number;
    weight: number;
    weightType: 'frequency' | 'time';
  };
}
```

## Error Handling

### Error Boundary Implementation

```javascript
// components/ErrorBoundary.js
class ErrorBoundary extends React.Component {
  // Catches JavaScript errors anywhere in the child component tree
  // Logs error details and displays fallback UI
  // Provides error recovery mechanisms
}
```

### API Error Handling

```javascript
// services/errorHandler.js
class APIErrorHandler {
  static handle(error, context) {
    // Centralized error handling for API calls
    // Categorizes errors (network, auth, rate limit, etc.)
    // Provides user-friendly error messages
    // Implements retry logic for transient failures
  }
}
```

### Error Types

- **Authentication Errors**: Token expiry, invalid credentials
- **Network Errors**: Connection issues, timeouts
- **Rate Limiting**: Spotify API rate limits
- **Validation Errors**: Invalid input data
- **Business Logic Errors**: Playlist mixing failures

## Testing Strategy

### Unit Testing

- **Components**: Test rendering, props handling, user interactions
- **Hooks**: Test state management, side effects, cleanup
- **Services**: Test API calls with mocked responses
- **Utilities**: Test pure functions and data transformations

### Integration Testing

- **Component Integration**: Test component interactions and data flow
- **API Integration**: Test service layer with real API responses
- **User Workflows**: Test complete user journeys

### Testing Tools

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking for tests
- **User Event**: Realistic user interaction simulation

### Test Structure

```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── __mocks__/
│   ├── spotify.js
│   └── localStorage.js
└── test-utils/
    ├── renderWithProviders.js
    └── mockData.js
```

## Performance Optimizations

### Virtualization Strategy

```javascript
// hooks/useVirtualization.js
const useVirtualization = ({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}) => {
  // Calculates visible items based on scroll position
  // Returns only items that need to be rendered
  // Handles dynamic item heights
  // Provides smooth scrolling experience
};
```

### Memoization Strategy

- **React.memo**: Prevent unnecessary re-renders of pure components
- **useMemo**: Cache expensive calculations (track filtering, sorting)
- **useCallback**: Stabilize function references for child components
- **Component-level memoization**: Cache API responses and computed data

### Code Splitting

```javascript
// Lazy load heavy components
const PlaylistMixer = React.lazy(
  () => import('./components/features/mixer/PlaylistMixer')
);
const SpotifySearchModal = React.lazy(
  () => import('./components/features/search/SpotifySearchModal')
);
```

### Bundle Optimization

- **Tree shaking**: Remove unused code
- **Code splitting**: Load components on demand
- **Asset optimization**: Optimize images and fonts
- **Dependency analysis**: Remove unnecessary dependencies

## Accessibility Enhancements

### Keyboard Navigation

```javascript
// hooks/useKeyboardNavigation.js
const useKeyboardNavigation = ({
  items,
  onSelect,
  onMove,
  orientation = 'vertical',
}) => {
  // Handles arrow key navigation
  // Supports item selection and reordering
  // Provides focus management
  // Announces changes to screen readers
};
```

### Screen Reader Support

- **ARIA labels**: Descriptive labels for interactive elements
- **Live regions**: Announce dynamic content changes
- **Focus management**: Proper focus handling in modals and lists
- **Semantic HTML**: Use appropriate HTML elements and roles

### Accessibility Features

- **High contrast mode**: Support for high contrast themes
- **Reduced motion**: Respect user's motion preferences
- **Keyboard shortcuts**: Provide keyboard alternatives for all actions
- **Focus indicators**: Clear visual focus indicators

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)

1. Set up new directory structure
2. Create base UI components (Modal, TrackList, TrackItem)
3. Implement centralized API service
4. Add TypeScript configuration and basic types

### Phase 2: Core Refactoring (Weeks 3-4)

1. Refactor drag-and-drop system with useDraggable hook
2. Consolidate modal components
3. Implement virtualization for track lists
4. Replace inline styles with CSS modules

### Phase 3: Performance & Polish (Weeks 5-6)

1. Add comprehensive testing suite
2. Implement accessibility features
3. Optimize performance with memoization
4. Add error boundaries and improved error handling

### Phase 4: Advanced Features (Week 7)

1. Add keyboard navigation
2. Implement advanced TypeScript types
3. Add development tooling (ESLint, Prettier, pre-commit hooks)
4. Performance monitoring and optimization

## Risk Mitigation

### Technical Risks

- **Breaking Changes**: Maintain backward compatibility during migration
- **Performance Regression**: Benchmark before and after changes
- **API Changes**: Abstract API calls to minimize impact of Spotify API changes

### Mitigation Strategies

- **Feature Flags**: Use feature flags to gradually roll out changes
- **Rollback Plan**: Maintain ability to quickly revert changes
- **Comprehensive Testing**: Ensure all functionality works after refactoring
- **User Testing**: Validate that UX improvements don't break workflows

## Success Metrics

### Code Quality Metrics

- **Reduced Code Duplication**: Eliminate redundant components and logic
- **Improved Test Coverage**: Achieve >80% test coverage
- **Better Performance**: Reduce bundle size by 20%, improve load times
- **Enhanced Maintainability**: Reduce cyclomatic complexity

### User Experience Metrics

- **Improved Accessibility**: Pass WCAG 2.1 AA compliance
- **Better Performance**: Support playlists with 1000+ tracks smoothly
- **Enhanced Usability**: Maintain all existing functionality while improving UX
