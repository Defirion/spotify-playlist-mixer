// React import removed - using automatic JSX runtime
import { render, screen } from '@testing-library/react';
import DraggableTrackList from '../DraggableTrackList';

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
  verticalListSortingStrategy: 'verticalListSortingStrategy',
}));

describe('DraggableTrackList', () => {
  const mockTracks = ['track1', 'track2', 'track3'];

  it('renders children unchanged', () => {
    render(
      <DraggableTrackList tracks={mockTracks}>
        <div data-testid="test-child">Test Content</div>
      </DraggableTrackList>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('sets up SortableContext with verticalListSortingStrategy', () => {
    render(
      <DraggableTrackList tracks={mockTracks}>
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
});
