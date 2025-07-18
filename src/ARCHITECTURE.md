# Architecture Documentation

## Overview

This document describes the new layered architecture implemented for the Spotify Playlist Mixer application. The architecture follows clean architecture principles with proper separation of concerns.

## Directory Structure

```
src/
├── components/           # Presentation Layer
│   ├── ui/              # Reusable UI components
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout components
│   └── [legacy files]   # Existing components (to be refactored)
├── hooks/               # Application Layer - Custom hooks
├── context/             # Application Layer - React Context providers
├── services/            # Domain Layer - Business logic services
├── models/              # Domain Layer - Data models and entities
├── infrastructure/      # Infrastructure Layer
│   ├── api/            # API clients and adapters
│   ├── storage/        # Local storage utilities
│   └── config/         # Configuration management
├── types/               # TypeScript type definitions
│   ├── index.ts        # Main type exports
│   ├── errors.ts       # Error types and utilities
│   ├── utils.ts        # Utility types
│   ├── services.ts     # Service interface definitions
│   ├── actions.ts      # State management action types
│   └── constants.ts    # Application constants
└── utils/               # Shared utilities (pure functions)
```

## Architecture Layers

### 1. Presentation Layer (`components/`)
- **Purpose**: Handle UI rendering and user interactions
- **Responsibilities**: 
  - Render UI components
  - Handle user events
  - Display data from application layer
- **Dependencies**: Can only depend on Application Layer (hooks, contexts)

### 2. Application Layer (`hooks/`, `context/`)
- **Purpose**: Orchestrate business logic and manage application state
- **Responsibilities**:
  - Custom hooks for business logic
  - React Context providers for state management
  - Coordinate between UI and domain layers
- **Dependencies**: Can depend on Domain Layer (services, models)

### 3. Domain Layer (`services/`, `models/`)
- **Purpose**: Contain pure business logic and domain models
- **Responsibilities**:
  - Business logic implementation
  - Data models and domain entities
  - Domain-specific operations
- **Dependencies**: Can depend on Infrastructure Layer for external concerns

### 4. Infrastructure Layer (`infrastructure/`)
- **Purpose**: Handle external concerns and platform-specific code
- **Responsibilities**:
  - API integrations
  - Data persistence
  - Configuration management
  - External service adapters
- **Dependencies**: No dependencies on other layers

## Type System

### Core Types (`types/index.ts`)
- Domain models (User, Playlist, Track, etc.)
- Application state types
- Configuration interfaces

### Error Handling (`types/errors.ts`)
- Structured error types
- Error factory functions
- Error type guards

### Service Interfaces (`types/services.ts`)
- Service contract definitions
- Dependency injection interfaces
- Service configuration types

### State Management (`types/actions.ts`)
- Redux-style action types
- Action creators
- State reducer types

### Utilities (`types/utils.ts`)
- Generic utility types
- Common patterns
- Type helpers

### Constants (`types/constants.ts`)
- Application configuration
- API endpoints
- Error messages
- Feature flags

## Key Principles

### 1. Separation of Concerns
- Each layer has a single responsibility
- Clear boundaries between layers
- Minimal coupling between components

### 2. Dependency Inversion
- Higher layers depend on abstractions, not implementations
- Service interfaces define contracts
- Easy to mock and test

### 3. Immutability
- State updates follow immutable patterns
- Pure functions for data transformations
- Predictable data flow

### 4. Type Safety
- Comprehensive TypeScript coverage
- Strong typing for all interfaces
- Compile-time error detection

### 5. Testability
- Pure functions for business logic
- Dependency injection for services
- Isolated components for testing

## Migration Strategy

The existing components will be gradually refactored to use the new architecture:

1. **Phase 1**: Foundation (Current)
   - ✅ Directory structure created
   - ✅ Type definitions established
   - ✅ Service interfaces defined

2. **Phase 2**: Services Implementation
   - Implement core domain services
   - Create infrastructure adapters
   - Add error handling

3. **Phase 3**: State Management
   - Implement React Context providers
   - Create custom hooks
   - Add state management logic

4. **Phase 4**: Component Refactoring
   - Convert components to use new architecture
   - Remove business logic from components
   - Add error boundaries

5. **Phase 5**: Testing & Optimization
   - Add comprehensive tests
   - Performance optimizations
   - Final cleanup

## Benefits

### For Developers
- **Maintainability**: Clear structure and separation of concerns
- **Testability**: Isolated business logic and pure functions
- **Extensibility**: Easy to add new features without breaking existing code
- **Type Safety**: Comprehensive TypeScript coverage prevents runtime errors

### For the Application
- **Performance**: Optimized rendering and state management
- **Reliability**: Proper error handling and recovery
- **Scalability**: Modular architecture supports growth
- **User Experience**: Consistent behavior and error handling

## Next Steps

1. Implement core services (AuthService, SpotifyService, PlaylistMixerService)
2. Create React Context providers for state management
3. Develop custom hooks for business logic
4. Refactor existing components to use new architecture
5. Add comprehensive testing coverage

## Guidelines

### When Adding New Features
1. Define types first in appropriate type files
2. Create service interfaces if needed
3. Implement business logic in services
4. Create custom hooks for React integration
5. Build presentational components
6. Add comprehensive tests

### When Modifying Existing Code
1. Follow the established patterns
2. Maintain type safety
3. Keep components pure and focused
4. Use dependency injection for services
5. Update tests accordingly