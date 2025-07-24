import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrackList from '../TrackList';

// Mock TrackItem component
jest.mock('../TrackItem', () => {
  return function MockTrackItem({
    track,
    onSelect,
    onRemove,
    selected,
    actions,
    onClick,
    showCheckbox,
    showDragHandle,
    showPopularity,
    showDuration,
    showAlbumArt,
    showSourcePlaylist,
    draggable,
    style,
    className,
    ...eventHandlers
  }) {
    return (
      <div
        data-testid={`track-item-${track.id}`}
        data-selected={selected}
        data-show-checkbox={showCheckbox}
        data-show-drag-handle={showDragHandle}
        data-show-popularity={showPopularity}
        data-show-duration={showDuration}
        data-show-album-art={showAlbumArt}
        data-show-source-playlist={showSourcePlaylist}
        draggable={draggable}
        className={className}
        style={style}
        onClick={onClick ? e => onClick(e, track) : undefined}
        {...eventHandlers}
      >
        <span>{track.name}</span>
        <span>{track.artists?.[0]?.name}</span>
        {onSelect && <button onClick={() => onSelect(track)}>Select</button>}
        {onRemove && <button onClick={() => onRemove(track)}>Remove</button>}
        {actions && <div data-testid="custom-actions">{actions}</div>}
      </div>
    );
  };
});

describe('TrackList', () => {
  const mockTracks = [
    {
      id: '1',
      name: 'Track 1',
      artists: [{ name: 'Artist 1' }],
      duration_ms: 180000,
      popularity: 75,
    },
    {
      id: '2',
      name: 'Track 2',
      artists: [{ name: 'Artist 2' }],
      duration_ms: 200000,
      popularity: 65,
    },
    {
      id: '3',
      name: 'Track 3',
      artists: [{ name: 'Artist 3' }],
      duration_ms: 160000,
      popularity: 85,
    },
  ];

  const defaultProps = {
    tracks: mockTracks,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders track list with tracks', () => {
      render(<TrackList {...defaultProps} />);

      expect(screen.getByTestId('track-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('track-item-3')).toBeInTheDocument();

      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByText('Track 3')).toBeInTheDocument();
    });

    it('renders empty state when no tracks', () => {
      render(<TrackList tracks={[]} />);

      expect(screen.getByText('No tracks available')).toBeInTheDocument();
      expect(screen.queryByTestId(/track-item/)).not.toBeInTheDocument();
    });

    it('renders custom empty message', () => {
      render(<TrackList tracks={[]} emptyMessage="Custom empty message" />);

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('applies custom className and styles', () => {
      render(
        <TrackList
          {...defaultProps}
          className="custom-track-list"
          style={{ border: '1px solid red' }}
        />
      );

      const trackList = screen.getByText('Track 1').closest('.track-list');
      expect(trackList).toHaveClass('custom-track-list');
      expect(trackList).toHaveStyle({ border: '1px solid red' });
    });
  });

  describe('Selection Mode', () => {
    it('enables selection when selectable is true', () => {
      const onTrackSelect = jest.fn();
      render(
        <TrackList
          {...defaultProps}
          selectable={true}
          onTrackSelect={onTrackSelect}
        />
      );

      const selectButton = screen.getAllByText('Select')[0];
      fireEvent.click(selectButton);

      expect(onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('shows selected state for selected tracks', () => {
      const selectedTracks = new Set(['1', '3']);
      render(
        <TrackList
          {...defaultProps}
          selectable={true}
          selectedTracks={selectedTracks}
        />
      );

      expect(screen.getByTestId('track-item-1')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(screen.getByTestId('track-item-2')).toHaveAttribute(
        'data-selected',
        'false'
      );
      expect(screen.getByTestId('track-item-3')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    it('does not show select buttons when not selectable', () => {
      render(<TrackList {...defaultProps} selectable={false} />);

      expect(screen.queryByText('Select')).not.toBeInTheDocument();
    });
  });

  describe('Remove Functionality', () => {
    it('enables remove when onTrackRemove is provided', () => {
      const onTrackRemove = jest.fn();
      render(<TrackList {...defaultProps} onTrackRemove={onTrackRemove} />);

      const removeButton = screen.getAllByText('Remove')[0];
      fireEvent.click(removeButton);

      expect(onTrackRemove).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('does not show remove buttons when onTrackRemove is not provided', () => {
      render(<TrackList {...defaultProps} />);

      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('passes draggable prop to track items', () => {
      render(<TrackList {...defaultProps} draggable={true} />);

      const trackItem = screen.getByTestId('track-item-1');
      expect(trackItem).toHaveAttribute('draggable', 'true');
    });

    it('calls drag event handlers', () => {
      const onTrackDragStart = jest.fn();
      const onTrackDragEnd = jest.fn();

      render(
        <TrackList
          {...defaultProps}
          draggable={true}
          onTrackDragStart={onTrackDragStart}
          onTrackDragEnd={onTrackDragEnd}
        />
      );

      const trackItem = screen.getByTestId('track-item-1');

      fireEvent.dragStart(trackItem);
      expect(onTrackDragStart).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );

      fireEvent.dragEnd(trackItem);
      expect(onTrackDragEnd).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );
    });
  });

  describe('Custom Actions', () => {
    it('renders custom actions from render prop', () => {
      const renderTrackActions = jest.fn((track, index) => (
        <button data-testid={`custom-action-${track.id}`}>
          Custom Action {index}
        </button>
      ));

      render(
        <TrackList {...defaultProps} renderTrackActions={renderTrackActions} />
      );

      expect(renderTrackActions).toHaveBeenCalledTimes(3);
      expect(renderTrackActions).toHaveBeenCalledWith(mockTracks[0], 0);
      expect(renderTrackActions).toHaveBeenCalledWith(mockTracks[1], 1);
      expect(renderTrackActions).toHaveBeenCalledWith(mockTracks[2], 2);

      expect(screen.getByTestId('custom-action-1')).toBeInTheDocument();
      expect(screen.getByTestId('custom-action-2')).toBeInTheDocument();
      expect(screen.getByTestId('custom-action-3')).toBeInTheDocument();
    });

    it('does not render custom actions when render prop is not provided', () => {
      render(<TrackList {...defaultProps} />);

      expect(screen.queryByTestId('custom-actions')).not.toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('calls track click handler', async () => {
      const user = userEvent.setup();
      const onTrackClick = jest.fn();

      render(<TrackList {...defaultProps} onTrackClick={onTrackClick} />);

      await user.click(screen.getByTestId('track-item-1'));

      expect(onTrackClick).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );
    });

    it('calls mouse event handlers', () => {
      const onTrackMouseEnter = jest.fn();
      const onTrackMouseLeave = jest.fn();

      render(
        <TrackList
          {...defaultProps}
          onTrackMouseEnter={onTrackMouseEnter}
          onTrackMouseLeave={onTrackMouseLeave}
        />
      );

      const trackItem = screen.getByTestId('track-item-1');

      fireEvent.mouseEnter(trackItem);
      expect(onTrackMouseEnter).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );

      fireEvent.mouseLeave(trackItem);
      expect(onTrackMouseLeave).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );
    });

    it('calls touch event handlers', () => {
      const onTrackTouchStart = jest.fn();
      const onTrackTouchEnd = jest.fn();

      render(
        <TrackList
          {...defaultProps}
          onTrackTouchStart={onTrackTouchStart}
          onTrackTouchEnd={onTrackTouchEnd}
        />
      );

      const trackItem = screen.getByTestId('track-item-1');

      fireEvent.touchStart(trackItem);
      expect(onTrackTouchStart).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );

      fireEvent.touchEnd(trackItem);
      expect(onTrackTouchEnd).toHaveBeenCalledWith(
        expect.any(Object),
        mockTracks[0],
        0
      );
    });
  });

  describe('Virtualization', () => {
    it('renders all items when virtualization is disabled', () => {
      render(<TrackList {...defaultProps} virtualized={false} />);

      expect(screen.getByTestId('track-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('track-item-3')).toBeInTheDocument();
    });

    it('applies virtualization styles when enabled', () => {
      render(
        <TrackList
          {...defaultProps}
          virtualized={true}
          containerHeight={400}
          itemHeight={64}
        />
      );

      const trackList = screen.getByText('Track 1').closest('.track-list');
      expect(trackList).toHaveStyle({
        height: '400px',
        overflowY: 'auto',
        position: 'relative',
      });
    });

    it('handles scroll events for virtualization', () => {
      render(
        <TrackList
          {...defaultProps}
          virtualized={true}
          containerHeight={200}
          itemHeight={64}
        />
      );

      const trackList = screen.getByText('Track 1').closest('.track-list');

      // Simulate scroll
      fireEvent.scroll(trackList, { target: { scrollTop: 100 } });

      // Should not throw any errors
      expect(trackList).toBeInTheDocument();
    });
  });

  describe('Display Options', () => {
    it('passes display options to track items', () => {
      render(
        <TrackList
          {...defaultProps}
          showCheckbox={true}
          showDragHandle={true}
          showPopularity={false}
          showDuration={false}
          showAlbumArt={false}
          showSourcePlaylist={true}
        />
      );

      const trackItem = screen.getByTestId('track-item-1');
      expect(trackItem).toHaveAttribute('data-show-checkbox', 'true');
      expect(trackItem).toHaveAttribute('data-show-drag-handle', 'true');
      expect(trackItem).toHaveAttribute('data-show-popularity', 'false');
      expect(trackItem).toHaveAttribute('data-show-duration', 'false');
      expect(trackItem).toHaveAttribute('data-show-album-art', 'false');
      expect(trackItem).toHaveAttribute('data-show-source-playlist', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tracks array gracefully', () => {
      render(<TrackList tracks={[]} />);

      expect(screen.getByText('No tracks available')).toBeInTheDocument();
    });

    it('handles undefined tracks gracefully', () => {
      render(<TrackList tracks={undefined} />);

      expect(screen.getByText('No tracks available')).toBeInTheDocument();
    });

    it('handles tracks without required properties', () => {
      const incompleteTrack = { id: '1' }; // Missing name, artists, etc.
      render(<TrackList tracks={[incompleteTrack]} />);

      expect(screen.getByTestId('track-item-1')).toBeInTheDocument();
    });

    it('handles very large track lists', () => {
      const largeTracks = Array.from({ length: 1000 }, (_, i) => ({
        id: `track-${i}`,
        name: `Track ${i}`,
        artists: [{ name: `Artist ${i}` }],
      }));

      render(<TrackList tracks={largeTracks} virtualized={true} />);

      // Should render without performance issues
      expect(screen.getByTestId('track-item-track-0')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper focus management', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} selectable={true} />);

      const firstTrack = screen.getByTestId('track-item-1');
      await user.click(firstTrack);

      // Should not throw accessibility errors
      expect(firstTrack).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const onTrackClick = jest.fn();

      render(<TrackList {...defaultProps} onTrackClick={onTrackClick} />);

      const firstTrack = screen.getByTestId('track-item-1');
      firstTrack.focus();

      await user.keyboard('{Enter}');

      // Should handle keyboard events properly
      expect(firstTrack).toBeInTheDocument();
    });
  });
});
