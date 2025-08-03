# Centralized State Management with Zustand

This directory contains the centralized state management implementation using Zustand, replacing the previous "God Component" pattern in App.js.

## Overview

The refactoring addresses the following issues from the original App.js:

1. **God Component Anti-pattern**: App.js was managing excessive state and creating complex prop drilling
2. **Scattered State Logic**: State management was spread across multiple custom hooks
3. **Tight Coupling**: Components were tightly coupled to specific state structures
4. **Complex Event Handling**: Multiple callback functions managing state interactions

## Architecture

### Store Structure

```
src/store/
├── index.ts              # Main store configuration and selector hooks
├── slices/
│   ├── authSlice.ts      # Authentication state
│   ├── playlistSlice.ts  # Playlist selection and ratio configuration
│   ├── mixingSlice.ts    # Mix options and settings
│   └── uiSlice.ts        # UI state (errors, toasts)
├── migration.ts          # Legacy hook compatibility and migration utilities
├── StoreProvider.tsx     # Store provider with persistence
└── __tests__/
    └── store.test.ts     # Comprehensive store tests
```

### State Domains

#### 1. Authentication (`authSlice.ts`)

- `accessToken`: Spotify access token
- `isAuthenticated`: Authentication status
- Actions: `setAccessToken`, `clearAuth`

#### 2. Playlist Management (`playlistSlice.ts`)

- `selectedPlaylists`: Array of selected playlists
- `ratioConfig`: Ratio configuration for each playlist
- Actions: Playlist selection, ratio configuration management

#### 3. Mixing Configuration (`mixingSlice.ts`)

- `mixOptions`: Mix settings (total songs, duration, etc.)
- Actions: `updateMixOptions`, `resetMixOptions`, `applyPresetOptions`

#### 4. UI State (`uiSlice.ts`)

- `error`: Global error state
- `mixedPlaylists`: Success toast notifications
- Actions: Error handling, toast management

## Usage

### Basic Store Access

```typescript
import { useAppStore } from './store';

// Direct store access
const accessToken = useAppStore(state => state.accessToken);
const setError = useAppStore(state => state.setError);
```

### Selector Hooks

```typescript
import { useAuth, usePlaylistSelection, useMixOptions, useUI } from './store';

// Clean, focused hooks
const { accessToken, isAuthenticated, setAccessToken } = useAuth();
const { selectedPlaylists, togglePlaylistSelection } = usePlaylistSelection();
const { mixOptions, updateMixOptions } = useMixOptions();
const { error, setError, dismissError } = useUI();
```

### Combined Selectors

```typescript
import { usePlaylistOperations, useMixingState } from './store';

// Complex operations
const playlistOps = usePlaylistOperations();
const mixingState = useMixingState();
```

## Benefits

### 1. Eliminated Prop Drilling

- Components access state directly through hooks
- No need to pass props through multiple component layers
- Cleaner component interfaces

### 2. Better Performance

- Selective subscriptions prevent unnecessary re-renders
- Components only re-render when their specific state changes
- Optimized with Zustand's built-in optimizations

### 3. Improved Developer Experience

- TypeScript support with full type safety
- DevTools integration for debugging
- Clear separation of concerns

### 4. Maintainability

- Modular slice-based architecture
- Easy to test individual state domains
- Clear action patterns

## Migration from Legacy Hooks

The store provides backward compatibility through migration utilities:

```typescript
import { useLegacyAppState } from './store/migration';

// Legacy hook (deprecated)
const legacyState = useLegacyAppState();

// New approach
const { accessToken, error } = useAuth();
const { mixedPlaylists, setError } = useUI();
```

## Testing

Comprehensive test suite covers:

- Individual slice functionality
- Combined selector behavior
- State consistency across hooks
- Integration scenarios

```bash
npm test -- --testPathPattern=store.test.ts
```

## Persistence

The `StoreProvider` handles:

- Access token persistence in localStorage
- Store initialization
- Subscription management

## Best Practices

### 1. Use Selector Hooks

```typescript
// ✅ Good - focused selector
const { selectedPlaylists } = usePlaylistSelection();

// ❌ Avoid - direct store access in components
const selectedPlaylists = useAppStore(state => state.selectedPlaylists);
```

### 2. Batch Related Updates

```typescript
// ✅ Good - single action for related updates
const handlePlaylistSelection = playlist => {
  togglePlaylistSelection(playlist);
  if (isSelected) {
    removeRatioConfig(playlist.id);
  } else {
    addPlaylistToRatioConfig(playlist.id);
  }
};
```

### 3. Use Combined Selectors for Complex Operations

```typescript
// ✅ Good - combined selector
const mixingState = useMixingState();

// ❌ Avoid - multiple individual selectors
const selectedPlaylists = usePlaylistSelection();
const ratioConfig = useRatioConfig();
const mixOptions = useMixOptions();
```

## Future Enhancements

1. **Persistence Layer**: Add more sophisticated persistence with versioning
2. **Middleware**: Add logging, analytics, or other middleware
3. **Optimistic Updates**: Implement optimistic updates for better UX
4. **State Normalization**: Consider normalizing complex nested state

## Troubleshooting

### Common Issues

1. **State Not Updating**: Ensure you're using the action functions, not mutating state directly
2. **Performance Issues**: Use specific selectors instead of selecting entire state
3. **Type Errors**: Ensure TypeScript types are properly imported and used

### Debugging

Use Zustand DevTools for debugging:

1. Install Redux DevTools Extension
2. State changes will appear in the DevTools
3. Time-travel debugging available

## Conclusion

This centralized state management solution transforms the application from a "God Component" architecture to a clean, maintainable, and performant state management system. The modular approach makes it easy to understand, test, and extend while providing excellent developer experience with full TypeScript support.
