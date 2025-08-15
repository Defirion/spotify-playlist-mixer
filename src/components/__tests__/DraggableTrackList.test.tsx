import React from 'react';
import { render, screen } from '@testing-library/react';
import DraggableTrackList from '../DraggableTrackList';

// Mock dnd-kit modules
const mockOnDragEnd = jest.fn();
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, sensors, collisionDetection, onDragEnd }: any) => {
    // Store the onDragEnd handler so we can test it
    mockOnDragEnd.mockImplementation(onDragEnd);
    return (
      <div
        data-testid="dnd-context"
        data-sensors={sensors}
        data-collision={collisionDetection}
      >
        {children}
      </div>
    );
  },
  closestCenter: 'closestCenter',
  KeyboardSensor: 'KeyboardSensor',
  MouseSensor: 'MouseSensor',
  TouchSensor: 'TouchSensor',
  useSensor: jest.fn((sensor, config) => ({ sensor, config })),
  useSensors: jest.fn((...sensors) => sensors),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children, items, strategy }: any) => (
    <div
      data-testid="sortable-context"
      data-items={items}
      data-strategy={strategy}
    >
      {children}
    </div>
  ),
  sortableKeyboardCoordinates: 'sortableKeyboardCoordinates',
  verticalListSortingStrategy: 'verticalListSortingStrategy',
}));

describe('DraggableTrackList', () => {
  const mockOnReorder = jest.fn();
  const mockTracks = ['track1', 'track2', 'track3'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children unchanged', () => {
    render(
      <DraggableTrackList tracks={mockTracks} onReorder={mockOnReorder}>
        <div data-testid="test-child">Test Content</div>
      </DraggableTrackList>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('sets up DndContext with correct sensors', () => {
    render(
      <DraggableTrackList tracks={mockTracks} onReorder={mockOnReorder}>
        <div>Test</div>
      </DraggableTrackList>
    );

    const dndContext = screen.getByTestId('dnd-context');
    expect(dndContext).toBeInTheDocument();
    expect(dndContext).toHaveAttribute('data-collision', 'closestCenter');
  });

  it('sets up SortableContext with verticalListSortingStrategy', () => {
    render(
      <DraggableTrackList tracks={mockTracks} onReorder={mockOnReorder}>
        <div>Test</div>
      </DraggableTrackList>
    );

    const sortableContext = screen.getByTestId('sortable-context');
    expect(sortableContext).toBeInTheDocument();
    expect(sortableContext).toHaveAttribute(
      'data-strategy',
      'verticalListSortingStrategy'
    );
    expect(sortableContext).toHaveAttribute('data-items', mockTracks.join(','));
  });

  it('calls onReorder with correct parameters when drag ends', () => {
    render(
      <DraggableTrackList tracks={mockTracks} onReorder={mockOnReorder}>
        <div>Test</div>
      </DraggableTrackList>
    );

    // Simulate drag end event with different active and over IDs
    const mockEvent = {
      active: { id: 'track1' },
      over: { id: 'track2' },
    };

    // Call the captured onDragEnd handler
    mockOnDragEnd(mockEvent);

    // Verify onReorder was called with correct parameters
    expect(mockOnReorder).toHaveBeenCalledWith('track1', 'track2');
  });
});
