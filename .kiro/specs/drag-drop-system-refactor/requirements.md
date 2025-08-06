# Requirements Document

## Introduction

The current drag-and-drop system in the Spotify Playlist Mixer suffers from critical architectural issues that prevent proper functionality. Internal reordering within DraggableTrackList fails completely, external track transfers from modals are impossible, scroll locking is ineffective, and scroll position is lost after operations. This refactor will create a robust, type-safe, coordinated drag-and-drop system using centralized state management with Zustand.

## Requirements

### Requirement 1: Functional Internal Track Reordering

**User Story:** As a user, I want to reorder tracks within my mixed playlist so that I can customize the track sequence to my preference.

#### Acceptance Criteria

1. WHEN I drag a track within the DraggableTrackList THEN the system SHALL provide visual feedback showing where the track will be dropped
2. WHEN I complete a drag-and-drop operation within the list THEN the track order SHALL be updated immediately in the application state
3. WHEN I drag a track to a new position THEN other tracks SHALL shift to accommodate the new position during the drag
4. WHEN the drag operation completes THEN the final track order SHALL persist in the mixed playlist

### Requirement 2: External Track Transfer Capability

**User Story:** As a user, I want to drag tracks from search results and unselected track modals into my mixed playlist so that I can easily add new tracks.

#### Acceptance Criteria

1. WHEN I drag a track from AddUnselectedModal or SpotifySearchModal THEN the cursor SHALL indicate a valid drop operation when over the DraggableTrackList
2. WHEN I drag a track from a modal THEN the source modal SHALL become visually muted and uninteractable to highlight the drop target
3. WHEN I drop a track from a modal onto the DraggableTrackList THEN the track SHALL be added to the mixed playlist at the drop position
4. WHEN I complete an external track transfer THEN the source modal SHALL return to its normal interactive state

### Requirement 3: Effective Scroll Isolation and Control

**User Story:** As a user, I want scroll behavior to be isolated to the intended component during drag operations so that I can precisely control track placement without unwanted page scrolling.

#### Acceptance Criteria

1. WHEN I drag a track near the top or bottom of the DraggableTrackList THEN only the track list SHALL scroll, not the entire page
2. WHEN I perform a drag operation on mobile devices THEN the system SHALL prevent body scroll and focus scrolling on the track list container
3. WHEN I drag a track THEN the system SHALL provide auto-scroll functionality when approaching container boundaries
4. WHEN the drag operation ends THEN normal scroll behavior SHALL be restored to all components

### Requirement 4: Scroll Position Preservation

**User Story:** As a user, I want my scroll position to be maintained after track operations so that I don't lose my place in long playlists.

#### Acceptance Criteria

1. WHEN I reorder a track within the DraggableTrackList THEN my scroll position SHALL be preserved after the operation completes
2. WHEN a new preview is generated THEN the DraggableTrackList SHALL maintain its current scroll position
3. WHEN tracks are programmatically updated THEN the system SHALL capture and restore the scroll position automatically
4. WHEN the track list re-renders due to state changes THEN the user SHALL remain at the same relative position in the list

### Requirement 5: Centralized Drag State Management

**User Story:** As a developer, I want centralized drag state management so that all drag operations are coordinated and consistent across the application.

#### Acceptance Criteria

1. WHEN any drag operation begins THEN the system SHALL use a single Zustand store to manage drag state
2. WHEN multiple components need drag state information THEN they SHALL access it through the centralized store
3. WHEN a drag operation is in progress THEN the system SHALL prevent concurrent drag operations
4. WHEN drag state changes occur THEN all relevant components SHALL be notified through the store subscription

### Requirement 6: Type-Safe Drag Operations

**User Story:** As a developer, I want type-safe drag operations so that I can catch errors at compile time and ensure data integrity.

#### Acceptance Criteria

1. WHEN implementing drag operations THEN all drag data SHALL be properly typed with TypeScript interfaces
2. WHEN different drag sources are used THEN the system SHALL distinguish between internal-track, modal-track, and search-track types
3. WHEN drag payloads are created THEN they SHALL conform to strict type definitions
4. WHEN drag operations are processed THEN TypeScript SHALL enforce type safety at compile time

### Requirement 7: Simplified Hook-Based Architecture

**User Story:** As a developer, I want a simplified hook-based drag system so that components can easily integrate drag functionality without complex implementation.

#### Acceptance Criteria

1. WHEN components need drag functionality THEN they SHALL use the useDraggable hook instead of implementing custom logic
2. WHEN the useDraggable hook is used THEN it SHALL handle all event listeners and state management internally
3. WHEN drag events occur THEN the hook SHALL report events to the centralized store automatically
4. WHEN components are refactored THEN all useState calls related to drag state SHALL be removed in favor of the centralized store

### Requirement 8: Modal Coordination During Drag Operations

**User Story:** As a user, I want modals to respond appropriately during drag operations so that I can clearly see valid drop targets and understand the current drag context.

#### Acceptance Criteria

1. WHEN a drag operation starts from outside a modal THEN the modal SHALL become visually muted with reduced opacity
2. WHEN a drag operation starts from outside a modal THEN the modal SHALL become uninteractable with pointer-events disabled
3. WHEN a drag operation starts from within a modal THEN the modals SHALL become visually muted with reduced opacity and uninteractable so the drag can be completed on the preview panel behind the modal
4. WHEN a drag operation ends THEN all modals SHALL return to their normal interactive state

### Requirement 9: Robust Event Handling and Cleanup

**User Story:** As a developer, I want robust event handling and cleanup so that drag operations don't cause memory leaks or interfere with normal application behavior.

#### Acceptance Criteria

1. WHEN drag operations complete THEN all event listeners SHALL be properly cleaned up
2. WHEN components unmount during a drag operation THEN the drag state SHALL be safely reset
3. WHEN drag operations are interrupted THEN the system SHALL gracefully handle the interruption and reset state
4. WHEN the endDrag function is called THEN it SHALL be wrapped in setTimeout to ensure onDrop events fire before state cleanup

### Requirement 10: Cross-Platform Compatibility

**User Story:** As a user, I want drag operations to work consistently across desktop and mobile devices so that I can manage my playlists regardless of my device.

#### Acceptance Criteria

1. WHEN using a desktop browser THEN drag operations SHALL work with mouse events
2. WHEN using a mobile device THEN drag operations SHALL work with touch events
3. WHEN using keyboard navigation THEN drag operations SHALL be accessible through keyboard controls
4. WHEN switching between input methods THEN the drag system SHALL handle all interaction types seamlessly