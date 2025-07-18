# Architecture Refactor Design Document

## Overview

This design outlines a comprehensive refactoring of the Spotify Playlist Mixer application to implement clean architecture principles while maintaining identical frontend functionality. The refactor will introduce proper separation of concerns, centralized state management, and a service-oriented architecture that makes the codebase more maintainable, testable, and extensible.

## Architecture

### High-Level Architecture Pattern

The refactored application will follow a **Layered Architecture** with clear separation between:

1. **Presentation Layer** - React components focused purely on UI rendering and user interactions
2. **Application Layer** - Custom hooks and context providers managing application state and orchestrating business logic
3. **Domain Layer** - Pure business logic, data models, and domain services
4. **Infrastructure Layer** - External API integrations, data persistence, and platform-specific code

### Directory Structure

```
src/
├── components/           # Presentation Layer - Pure UI components
│   ├── ui/              # Reusable UI components
│   ├── features/        # Feature-specific components
│   └── layout/          # Layout components
├── hooks/               # Application Layer - Custom hooks
├── context/             # Application Layer - React Context providers
├── services/            # Domain Layer - Business logic services
├── models/              # Domain Layer - Data models and types
├── infrastructure/      # Infrastructure Layer - External integrations
│   ├── api/            # API clients and adapters
│   ├── storage/        # Local storage utilities
│   └── config/         # Configuration management
├── utils/               # Shared utilities (pure functions)
└── types/               # TypeScript type definitions
```

## Components and Interfaces

### 1. State Management Architecture

**Context-Based State Management**
- Replace prop drilling with React Context API
- Implement separate contexts for different domains (Auth, Playlists, Mixer)
- Use reducer pattern for complex state updates

```typescript
// Context Structure
interface AppState {
  auth: AuthState;
  playlists: PlaylistState;
  mixer: MixerState;
  ui: UIState;
}
```

### 2. Service Layer Architecture

**Spotify Service**
```typescript
interface SpotifyService {
  authenticate(): Promise<AuthResult>;
  getUserPlaylists(): Promise<Playlist[]>;
  getPlaylistTracks(playlistId: string): Promise<Track[]>;
  createPlaylist(name: string, tracks: Track[]): Promise<Playlist>;
  searchTracks(query: string): Promise<Track[]>;
}
```

**Playlist Mixer Service**
```typescript
interface PlaylistMixerService {
  mixPlaylists(config: MixConfig): Promise<Track[]>;
  previewMix(config: MixConfig): Promise<MixPreview>;
  applyStrategy(tracks: Track[], strategy: MixStrategy): Track[];
}
```

**Authentication Service**
```typescript
interface AuthService {
  login(): Promise<void>;
  logout(): void;
  getToken(): string | null;
  isAuthenticated(): boolean;
  onTokenExpired(callback: () => void): void;
}
```

### 3. Component Architecture

**Container vs Presentational Pattern**
- Container components handle data fetching and state management
- Presentational components focus purely on rendering
- Custom hooks bridge the gap between containers and services

**Component Hierarchy**
```
App
├── AuthProvider
├── PlaylistProvider
├── MixerProvider
└── Router
    ├── MainPage (Container)
    │   ├── PlaylistSelector (Presentational)
    │   ├── RatioConfig (Presentational)
    │   └── PlaylistMixer (Container)
    └── PolicyPages (Presentational)
```

### 4. Data Flow Architecture

**Unidirectional Data Flow**
1. User interactions trigger actions in components
2. Components dispatch actions to context providers
3. Context providers call appropriate services
4. Services handle business logic and API calls
5. Results flow back through context to components
6. Components re-render with updated state

## Data Models

### Core Domain Models

```typescript
// User and Authentication
interface User {
  id: string;
  displayName: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Playlist Domain
interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  owner: User;
  images: PlaylistImage[];
}

interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  popularity: number;
  uri: string;
  preview_url?: string;
}

// Mixer Domain
interface MixConfig {
  playlists: SelectedPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
}

interface SelectedPlaylist {
  playlist: Playlist;
  tracks: Track[];
  config: PlaylistRatioConfig;
}

interface MixResult {
  tracks: Track[];
  metadata: MixMetadata;
  statistics: MixStatistics;
}
```

### State Models

```typescript
interface PlaylistState {
  userPlaylists: Playlist[];
  selectedPlaylists: SelectedPlaylist[];
  isLoading: boolean;
  error: string | null;
}

interface MixerState {
  currentMix: MixResult | null;
  previewMix: MixResult | null;
  isGenerating: boolean;
  mixHistory: MixResult[];
  error: string | null;
}
```

## Error Handling

### Error Boundary Strategy

**Hierarchical Error Boundaries**
- Global error boundary for unhandled errors
- Feature-specific error boundaries for isolated error handling
- Service-level error handling with proper error types

```typescript
interface AppError {
  type: 'NETWORK' | 'AUTH' | 'VALIDATION' | 'UNKNOWN';
  message: string;
  details?: any;
  timestamp: Date;
}
```

### Error Recovery Patterns

1. **Retry Logic** - Automatic retry for transient failures
2. **Fallback UI** - Graceful degradation when features fail
3. **Error Reporting** - Centralized error logging and reporting
4. **User Feedback** - Clear error messages with actionable guidance

## Testing Strategy

### Testing Architecture

**Three-Layer Testing Approach**

1. **Unit Tests** - Pure functions, services, and utilities
   - Test business logic in isolation
   - Mock external dependencies
   - Focus on edge cases and error conditions

2. **Integration Tests** - Service interactions and data flow
   - Test service integrations
   - Test context providers with reducers
   - Test custom hooks with mock services

3. **Component Tests** - UI behavior and user interactions
   - Test component rendering with various props
   - Test user interactions and event handling
   - Test component integration with contexts

### Testing Tools and Patterns

```typescript
// Service Testing Example
describe('PlaylistMixerService', () => {
  it('should mix playlists according to ratio configuration', () => {
    const service = new PlaylistMixerService();
    const result = service.mixPlaylists(mockConfig);
    expect(result.tracks).toHaveLength(100);
    expect(result.statistics.ratioCompliance).toBeGreaterThan(0.9);
  });
});

// Hook Testing Example
describe('usePlaylistMixer', () => {
  it('should handle mix generation lifecycle', async () => {
    const { result } = renderHook(() => usePlaylistMixer());
    act(() => {
      result.current.generateMix(mockConfig);
    });
    expect(result.current.isGenerating).toBe(true);
    await waitFor(() => {
      expect(result.current.mixResult).toBeDefined();
    });
  });
});
```

### Mocking Strategy

- **API Mocking** - Mock Spotify API responses for consistent testing
- **Service Mocking** - Mock services for component testing
- **Context Mocking** - Mock context providers for isolated component tests

## Performance Optimizations

### Rendering Optimizations

1. **React.memo** - Prevent unnecessary re-renders of pure components
2. **useMemo/useCallback** - Memoize expensive calculations and functions
3. **Code Splitting** - Lazy load components and routes
4. **Virtual Scrolling** - Handle large playlist displays efficiently

### Data Management Optimizations

1. **Caching Strategy** - Cache API responses and computed results
2. **Debouncing** - Debounce search and filter operations
3. **Pagination** - Implement pagination for large datasets
4. **Background Processing** - Use Web Workers for heavy computations

### Bundle Optimization

1. **Tree Shaking** - Remove unused code from bundles
2. **Dynamic Imports** - Load features on demand
3. **Asset Optimization** - Optimize images and static assets
4. **Service Worker** - Cache resources for offline functionality

## Migration Strategy

### Phase 1: Foundation Setup
- Set up new directory structure
- Create base interfaces and types
- Implement core services without UI integration

### Phase 2: State Management Migration
- Implement context providers
- Create custom hooks
- Migrate state from components to contexts

### Phase 3: Service Integration
- Replace direct API calls with service layer
- Implement error handling and retry logic
- Add comprehensive logging

### Phase 4: Component Refactoring
- Refactor components to use new architecture
- Implement error boundaries
- Add performance optimizations

### Phase 5: Testing and Validation
- Add comprehensive test coverage
- Performance testing and optimization
- User acceptance testing

## Security Considerations

### Token Management
- Secure token storage and refresh logic
- Automatic token cleanup on logout
- Protection against token leakage

### API Security
- Request validation and sanitization
- Rate limiting compliance
- CORS and CSP configuration

### Data Privacy
- Minimize data collection and storage
- Secure handling of user data
- Compliance with privacy regulations

## Monitoring and Observability

### Error Monitoring
- Centralized error logging
- Performance monitoring
- User behavior analytics

### Development Tools
- Enhanced debugging capabilities
- Development-only logging
- Performance profiling tools