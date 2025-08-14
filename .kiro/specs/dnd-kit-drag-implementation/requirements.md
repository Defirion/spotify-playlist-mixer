# Requirements Document

## Introduction

The current mobile touch drag implementation is overly complex and unreliable, with over 1000 lines of coordination logic, multiple hooks, and frequent mobile failures. After analysis, we've determined that dnd-kit provides a battle-tested solution that directly addresses our core problems: mobile touch reliability, complex state coordination, and over-engineering. This spec will replace the complex custom implementation with dnd-kit's proven 10KB library that handles all input methods reliably.

## Requirements

### Requirement 1: dnd-kit Integration for Reliable Drag Operations

**User Story:** As a user, I want to drag tracks reliably using mouse, touch, or keyboard so that I can reorder my playlist regardless of my input method, using a proven library solution.

#### Acceptance Criteria

1. WHEN I use a mouse on desktop THEN the system SHALL use dnd-kit's MouseSensor with 10px distance activation constraint
2. WHEN I long-press a track on mobile THEN the system SHALL use dnd-kit's TouchSensor with 250ms delay and 5px tolerance
3. WHEN I use keyboard navigation THEN the system SHALL use dnd-kit's KeyboardSensor with sortableKeyboardCoordinates
4. WHEN switching between input methods THEN dnd-kit SHALL handle sensor coordination automatically without conflicts

### Requirement 2: Minimal Implementation with Maximum Reliability

**User Story:** As a developer, I want a simple dnd-kit implementation that replaces our complex custom system so that mobile drag works reliably with minimal code.

#### Acceptance Criteria

1. WHEN implementing the drag system THEN it SHALL use dnd-kit's SortableContext and useSortable hook
2. WHEN managing state THEN it SHALL integrate with existing Zustand store using arrayMove utility
3. WHEN handling drag events THEN it SHALL use only onDragEnd callback with active/over event data
4. WHEN debugging issues THEN the system SHALL have minimal custom code and rely on dnd-kit's proven implementation

### Requirement 3: Direct Library Integration

**User Story:** As a developer, I want to use dnd-kit's APIs directly so that I benefit from their battle-tested mobile touch handling without abstraction layers.

#### Acceptance Criteria

1. WHEN setting up drag functionality THEN it SHALL use DndContext, SortableContext, and useSortable directly
2. WHEN configuring sensors THEN it SHALL use useSensors with MouseSensor, TouchSensor, and KeyboardSensor
3. WHEN handling reordering THEN it SHALL use dnd-kit's arrayMove utility function
4. WHEN applying transforms THEN it SHALL use CSS.Transform.toString from @dnd-kit/utilities

### Requirement 4: Proven Mobile Touch Reliability

**User Story:** As a mobile user, I want touch drag to work reliably so that I can reorder tracks without the current failures and stuck states.

#### Acceptance Criteria

1. WHEN configuring TouchSensor THEN it SHALL use delay: 250ms and tolerance: 5px activation constraints
2. WHEN touch dragging THEN dnd-kit SHALL handle all timing, debouncing, and coordination internally
3. WHEN touch events conflict THEN dnd-kit SHALL manage sensor priorities and prevent race conditions
4. WHEN drag operations fail THEN dnd-kit SHALL handle cleanup and state reset automatically

### Requirement 5: Built-in Accessibility Support

**User Story:** As a user with accessibility needs, I want keyboard drag functionality that works out of the box so that I can reorder tracks without custom implementation.

#### Acceptance Criteria

1. WHEN using keyboard navigation THEN dnd-kit SHALL provide sortableKeyboardCoordinates for arrow key movement
2. WHEN using screen readers THEN dnd-kit SHALL provide built-in ARIA attributes and announcements
3. WHEN focusing elements THEN dnd-kit SHALL handle focus management automatically
4. WHEN customizing announcements THEN the system SHALL use dnd-kit's accessibility prop for custom messages

### Requirement 6: Integration with Existing Architecture

**User Story:** As a developer, I want dnd-kit to integrate cleanly with our existing Zustand store and React components so that the migration is straightforward.

#### Acceptance Criteria

1. WHEN integrating with Zustand THEN dnd-kit SHALL work with external state management via onDragEnd callback
2. WHEN updating track order THEN it SHALL call Zustand actions with arrayMove results
3. WHEN rendering track items THEN existing TrackItem components SHALL be wrapped with useSortable
4. WHEN maintaining visual feedback THEN existing CSS classes SHALL work with dnd-kit's transform system

### Requirement 7: Performance and Bundle Size

**User Story:** As a developer, I want the drag system to be performant and lightweight so that it doesn't impact app performance or bundle size significantly.

#### Acceptance Criteria

1. WHEN adding dnd-kit THEN the total bundle size increase SHALL be approximately 10KB
2. WHEN dragging items THEN performance SHALL be smooth with 60fps animations
3. WHEN handling large lists THEN dnd-kit SHALL use efficient collision detection algorithms
4. WHEN cleaning up THEN dnd-kit SHALL handle memory management and event listener cleanup automatically

### Requirement 8: Elimination of Complex Custom Logic

**User Story:** As a developer, I want to eliminate our complex custom drag coordination so that the system is maintainable and reliable.

#### Acceptance Criteria

1. WHEN replacing the current system THEN it SHALL remove all custom touch handling, timing logic, and coordination code
2. WHEN implementing drag functionality THEN it SHALL NOT require custom event dispatching or state synchronization
3. WHEN handling errors THEN it SHALL rely on dnd-kit's internal error handling rather than custom recovery systems
4. WHEN debugging issues THEN problems SHALL be traceable to dnd-kit's well-documented behavior rather than custom logic

### Requirement 9: Visual Feedback Integration

**User Story:** As a user, I want visual feedback during drag operations so that I can see what I'm dragging and where it will drop, using dnd-kit's transform system.

#### Acceptance Criteria

1. WHEN dragging starts THEN dnd-kit SHALL provide transform values for visual feedback
2. WHEN dragging over drop zones THEN existing drop line indicators SHALL work with dnd-kit's collision detection
3. WHEN drag ends THEN dnd-kit SHALL handle transition animations automatically
4. WHEN applying styles THEN it SHALL use CSS.Transform.toString for consistent transform application

### Requirement 10: Simplified Migration Strategy

**User Story:** As a developer, I want a clear migration path from the complex custom system to dnd-kit so that the transition is safe and verifiable.

#### Acceptance Criteria

1. WHEN planning migration THEN it SHALL install @dnd-kit/core, @dnd-kit/sortable, and @dnd-kit/utilities packages
2. WHEN implementing the new system THEN it SHALL create new components alongside existing ones for testing
3. WHEN verifying functionality THEN both mouse and touch drag SHALL work reliably before removing old code
4. WHEN completing migration THEN it SHALL remove all custom drag hooks, coordination logic, and complex state management