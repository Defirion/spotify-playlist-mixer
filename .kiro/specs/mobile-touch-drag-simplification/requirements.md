# Requirements Document

## Introduction

The current mobile touch drag implementation is overly complex and unreliable. Despite extensive refactoring efforts documented in DRAG_ERROR_HANDLING_SUMMARY.md, DRAG_STATE_COORDINATION_SOLUTION.md, and TOUCH_DRAG_TIMING_FIXES.md, mobile dragging still fails frequently. The system has too many layers of coordination, excessive logging, complex timing mechanisms, and multiple state management systems that conflict with each other. This spec will create a simplified, reliable mobile touch drag system that actually works.

## Requirements

### Requirement 1: Unified Input Method Support

**User Story:** As a user, I want to drag tracks reliably using mouse, touch, or keyboard so that I can reorder my playlist regardless of my input method.

#### Acceptance Criteria

1. WHEN I use a mouse on desktop THEN the system SHALL use HTML5 drag events for smooth native drag behavior
2. WHEN I long-press a track on mobile THEN the system SHALL detect the long-press within 300ms using a simple timer
3. WHEN I use keyboard navigation THEN the system SHALL support arrow keys and space/enter for drag operations
4. WHEN switching between input methods THEN the system SHALL handle each method independently without conflicts

### Requirement 2: Minimal State Management

**User Story:** As a developer, I want minimal state management for touch drag so that the system is maintainable and debuggable.

#### Acceptance Criteria

1. WHEN implementing touch drag THEN the system SHALL use only essential state variables (isActive, startPosition, currentPosition)
2. WHEN a drag starts THEN the system SHALL set a single boolean flag without complex coordination between multiple systems
3. WHEN drag state changes THEN the system SHALL update state directly without setTimeout delays or complex timing logic
4. WHEN debugging drag issues THEN the system SHALL have minimal, focused logging instead of excessive console output

### Requirement 3: Direct Event Handling

**User Story:** As a developer, I want direct event handling for touch events so that the system is predictable and reliable.

#### Acceptance Criteria

1. WHEN touch events occur THEN the system SHALL handle them directly without dispatching custom events or complex event coordination
2. WHEN a touch drag moves THEN the system SHALL calculate drop position directly without intermediate event systems
3. WHEN a touch drag ends THEN the system SHALL execute the drop logic immediately without event dispatching
4. WHEN touch events are processed THEN the system SHALL prevent default behavior simply and consistently

### Requirement 4: Clean Input Method Separation

**User Story:** As a developer, I want clean separation between input methods so that each method works independently without interference.

#### Acceptance Criteria

1. WHEN implementing the drag system THEN each input method (mouse, touch, keyboard) SHALL have its own dedicated handler
2. WHEN a touch drag is active THEN HTML5 draggable SHALL be temporarily disabled to prevent conflicts
3. WHEN a mouse drag is active THEN touch handlers SHALL be temporarily disabled to prevent interference
4. WHEN one input method is active THEN other methods SHALL be cleanly disabled without complex coordination

### Requirement 5: Simplified Visual Feedback

**User Story:** As a mobile user, I want clear visual feedback during drag operations so that I can see what I'm dragging and where it will drop.

#### Acceptance Criteria

1. WHEN I start a touch drag THEN the dragged element SHALL become semi-transparent (0.7 opacity) immediately
2. WHEN I drag over valid drop zones THEN the system SHALL show a simple drop line indicator
3. WHEN I drag over invalid areas THEN the system SHALL provide clear visual feedback without complex state management
4. WHEN the drag ends THEN all visual feedback SHALL be cleared immediately without cleanup delays

### Requirement 6: Removed Excessive Logging

**User Story:** As a developer, I want minimal logging for touch drag so that I can focus on actual issues without noise.

#### Acceptance Criteria

1. WHEN touch drag operates normally THEN the system SHALL log only essential events (start, end, errors)
2. WHEN debugging is needed THEN the system SHALL provide a debug flag to enable detailed logging
3. WHEN touch events fire rapidly THEN the system SHALL NOT log every movement to avoid console spam
4. WHEN drag operations complete THEN the system SHALL log only success/failure without timing details

### Requirement 7: Eliminated Timing Complexity

**User Story:** As a developer, I want to eliminate complex timing logic so that the touch drag system is predictable and maintainable.

#### Acceptance Criteria

1. WHEN implementing touch drag THEN the system SHALL NOT use setTimeout delays for state updates
2. WHEN drag operations complete THEN callbacks SHALL execute immediately without artificial delays
3. WHEN cleaning up drag state THEN the system SHALL reset state synchronously without timing dependencies
4. WHEN handling rapid touch events THEN the system SHALL use simple debouncing without complex timing logic

### Requirement 8: Streamlined Error Handling

**User Story:** As a developer, I want simple error handling for touch drag so that errors are caught and handled without complex recovery systems.

#### Acceptance Criteria

1. WHEN touch drag errors occur THEN the system SHALL log the error and reset to a clean state immediately
2. WHEN implementing error handling THEN the system SHALL NOT use complex error recovery services or retry logic
3. WHEN drag operations fail THEN the system SHALL provide simple user feedback without complex error categorization
4. WHEN errors are handled THEN the system SHALL return to a known good state without complex cleanup procedures

### Requirement 9: Direct Drop Zone Integration

**User Story:** As a mobile user, I want touch drag to work directly with drop zones so that I can drop tracks where I intend without complex event systems.

#### Acceptance Criteria

1. WHEN I drag over a drop zone THEN the system SHALL detect the drop zone using direct element queries
2. WHEN I release my finger over a drop zone THEN the system SHALL execute the drop logic immediately
3. WHEN calculating drop positions THEN the system SHALL use direct coordinate calculations without event dispatching
4. WHEN drop operations complete THEN the system SHALL update the track list directly without complex state coordination

### Requirement 10: Maintainable Unified Architecture

**User Story:** As a developer, I want a maintainable unified drag architecture so that all input methods are handled consistently and future changes are easy to implement.

#### Acceptance Criteria

1. WHEN implementing drag functionality THEN the system SHALL use a single `useSimpleDraggable` hook that handles all input methods
2. WHEN adding new drag features THEN the system SHALL extend the unified architecture without adding complexity layers
3. WHEN debugging drag issues THEN the code SHALL be easy to follow with clear separation between input method handlers
4. WHEN maintaining the system THEN developers SHALL be able to understand the entire drag system in under 300 lines of code