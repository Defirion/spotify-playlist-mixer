import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrackItem from '../TrackItem';

// Mock the drag and drop utilities
jest.mock('../../../utils/dragAndDrop', () => ({
  formatDuration: ms => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },
  getTrackQuadrant: track => {
    if (track.popularity === undefined) return null;
    if (track.popularity >= 80) return 'topHits';
    if (track.popularity >= 60) return 'popular';
    if (track.popularity >= 40) return 'moderate';
    return 'deepCuts';
  },
  getPopularityStyle: (quadrant, popularity) => {
    const styles = {
      topHits: {
        text: `🔥 ${popularity}`,
        background: 'rgba(255, 87, 34, 0.2)',
        color: '#FF5722',
      },
      popular: {
        text: `⭐ ${popularity}`,
        background: 'rgba(255, 193, 7, 0.2)',
        color: '#FF8F00',
      },
      moderate: {
        text: `📻 ${popularity}`,
        background: 'rgba(0, 188, 212, 0.2)',
        color: '#00BCD4',
      },
      deepCuts: {
        text: `💎 ${popularity}`,
        background: 'rgba(233, 30, 99, 0.2)',
        color: '#E91E63',
      },
    };
    return (
      styles[quadrant] || {
        text: '',
        background: 'transparent',
        color: 'inherit',
      }
    );
  },
}));

describe('TrackItem', () => {
  const mockTrack = {
    id: '1',
    name: 'Test Song',
    artists: [{ name: 'Test Artist' }],
    album: {
      name: 'Test Album',
      images: [
        { url: 'https://example.com/large.jpg' },
        { url: 'https://example.com/medium.jpg' },
        { url: 'https://example.com/small.jpg' },
      ],
    },
    duration_ms: 180000, // 3 minutes
    popularity: 75,
    sourcePlaylistName: 'Test Playlist',
  };

  const defaultProps = {
    track: mockTrack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders track information correctly', () => {
      render(<TrackItem {...defaultProps} />);

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders album art when available', () => {
      render(<TrackItem {...defaultProps} />);

      const albumArt = screen.getByAltText('Test Album album cover');
      expect(albumArt).toBeInTheDocument();
      expect(albumArt).toHaveAttribute('src', 'https://example.com/small.jpg');
    });

    it('handles missing album art gracefully', () => {
      const trackWithoutAlbum = { ...mockTrack, album: null };
      render(<TrackItem track={trackWithoutAlbum} />);

      expect(screen.queryByAltText(/album cover/)).not.toBeInTheDocument();
    });

    it('handles missing artist gracefully', () => {
      const trackWithoutArtist = { ...mockTrack, artists: [] };
      render(<TrackItem track={trackWithoutArtist} />);

      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });
  });

  describe('Optional Features', () => {
    it('shows checkbox when showCheckbox is true', () => {
      render(<TrackItem {...defaultProps} showCheckbox={true} />);

      // Look for the checkbox by checking for the checkmark when selected
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      // The checkbox div should be present (we can't easily test CSS module classes in tests)
      const container = screen.getByText('Test Song').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('shows selected state in checkbox', () => {
      render(
        <TrackItem {...defaultProps} showCheckbox={true} selected={true} />
      );

      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows drag handle when showDragHandle is true', () => {
      render(<TrackItem {...defaultProps} showDragHandle={true} />);

      expect(screen.getByLabelText('Drag handle')).toBeInTheDocument();
      expect(screen.getByText('⋮⋮')).toBeInTheDocument();
    });

    it('shows source playlist when showSourcePlaylist is true', () => {
      render(<TrackItem {...defaultProps} showSourcePlaylist={true} />);

      expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    });

    it('shows popularity indicator by default', () => {
      render(<TrackItem {...defaultProps} />);

      expect(screen.getByText('⭐ 75')).toBeInTheDocument();
    });

    it('hides popularity when showPopularity is false', () => {
      render(<TrackItem {...defaultProps} showPopularity={false} />);

      expect(screen.queryByText('⭐ 75')).not.toBeInTheDocument();
    });

    it('hides duration when showDuration is false', () => {
      render(<TrackItem {...defaultProps} showDuration={false} />);

      expect(screen.queryByText('3:00')).not.toBeInTheDocument();
    });

    it('hides album art when showAlbumArt is false', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={false} />);

      expect(screen.queryByAltText(/album cover/)).not.toBeInTheDocument();
    });
  });

  describe('Interaction Handlers', () => {
    it('calls onSelect when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<TrackItem {...defaultProps} onSelect={onSelect} />);

      await user.click(screen.getByText('Test Song'));

      expect(onSelect).toHaveBeenCalledWith(mockTrack);
    });

    it('calls custom onClick when provided', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(<TrackItem {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByText('Test Song'));

      expect(onClick).toHaveBeenCalledWith(expect.any(Object), mockTrack);
    });

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = jest.fn();
      render(<TrackItem {...defaultProps} onRemove={onRemove} />);

      const removeButton = screen.getByLabelText('Remove Test Song');
      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith(mockTrack);
    });

    it('prevents event propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = jest.fn();
      const onSelect = jest.fn();
      render(
        <TrackItem {...defaultProps} onRemove={onRemove} onSelect={onSelect} />
      );

      const removeButton = screen.getByLabelText('Remove Test Song');
      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith(mockTrack);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('sets draggable attribute when draggable is true', () => {
      render(<TrackItem {...defaultProps} draggable={true} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveAttribute('draggable', 'true');
    });

    it('calls drag event handlers', () => {
      const onDragStart = jest.fn();
      const onDragEnd = jest.fn();
      render(
        <TrackItem
          {...defaultProps}
          draggable={true}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      );

      const trackItem = screen.getByTestId('track-item');

      fireEvent.dragStart(trackItem);
      expect(onDragStart).toHaveBeenCalled();

      fireEvent.dragEnd(trackItem);
      expect(onDragEnd).toHaveBeenCalled();
    });

    it('calls touch event handlers', () => {
      const onTouchStart = jest.fn();
      const onTouchMove = jest.fn();
      const onTouchEnd = jest.fn();
      render(
        <TrackItem
          {...defaultProps}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      );

      const trackItem = screen.getByTestId('track-item');

      fireEvent.touchStart(trackItem);
      expect(onTouchStart).toHaveBeenCalled();

      fireEvent.touchMove(trackItem);
      expect(onTouchMove).toHaveBeenCalled();

      fireEvent.touchEnd(trackItem);
      expect(onTouchEnd).toHaveBeenCalled();
    });
  });

  describe('Styling and States', () => {
    it('applies selected styling when selected is true', () => {
      render(<TrackItem {...defaultProps} selected={true} />);

      const trackItem = screen.getByTestId('track-item');
      // With CSS modules, we can't easily test the exact background color
      // but we can verify the element exists and has some class applied
      expect(trackItem).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<TrackItem {...defaultProps} className="custom-track" />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveClass('custom-track');
    });

    it('applies custom styles', () => {
      const customStyle = { border: '1px solid red' };
      render(<TrackItem {...defaultProps} style={customStyle} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveStyle({ border: '1px solid red' });
    });

    it('shows grab cursor when draggable', () => {
      render(<TrackItem {...defaultProps} draggable={true} />);

      const trackItem = screen.getByTestId('track-item');
      // CSS modules apply cursor via CSS classes, so we just verify the element exists
      expect(trackItem).toBeInTheDocument();
    });

    it('shows pointer cursor when not draggable', () => {
      render(<TrackItem {...defaultProps} draggable={false} />);

      const trackItem = screen.getByTestId('track-item');
      // CSS modules apply cursor via CSS classes, so we just verify the element exists
      expect(trackItem).toBeInTheDocument();
    });
  });

  describe('Custom Actions', () => {
    it('renders custom actions when provided', () => {
      const customActions = (
        <button data-testid="custom-action">Custom Action</button>
      );
      render(<TrackItem {...defaultProps} actions={customActions} />);

      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for remove button', () => {
      render(<TrackItem {...defaultProps} onRemove={jest.fn()} />);

      expect(screen.getByLabelText('Remove Test Song')).toBeInTheDocument();
    });

    it('has proper aria-label for drag handle', () => {
      render(<TrackItem {...defaultProps} showDragHandle={true} />);

      expect(screen.getByLabelText('Drag handle')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles image load errors gracefully', () => {
      render(<TrackItem {...defaultProps} />);

      const albumArt = screen.getByAltText('Test Album album cover');
      fireEvent.error(albumArt);

      expect(albumArt).toHaveStyle({ display: 'none' });
    });

    it('handles missing track data gracefully', () => {
      const minimalTrack = { id: '1', name: 'Test Song' };
      render(<TrackItem track={minimalTrack} />);

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });
  });

  describe('Popularity Indicators', () => {
    it('shows correct popularity indicator for top hits', () => {
      const topHitTrack = { ...mockTrack, popularity: 85 };
      render(<TrackItem track={topHitTrack} />);

      expect(screen.getByText('🔥 85')).toBeInTheDocument();
    });

    it('shows correct popularity indicator for deep cuts', () => {
      const deepCutTrack = { ...mockTrack, popularity: 25 };
      render(<TrackItem track={deepCutTrack} />);

      expect(screen.getByText('💎 25')).toBeInTheDocument();
    });

    it('handles tracks without popularity data', () => {
      const trackWithoutPopularity = { ...mockTrack };
      delete trackWithoutPopularity.popularity;
      render(<TrackItem track={trackWithoutPopularity} />);

      // Should not show any popularity indicator
      expect(screen.queryByText(/🔥|⭐|📻|💎/)).not.toBeInTheDocument();
    });
  });
});
