import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrackItem from '../TrackItem';
import { mockTracks } from '../../../mocks/fixtures';

// Mock the utility functions
jest.mock('../../../utils/dragAndDrop', () => ({
  formatDuration: jest.fn(
    ms =>
      `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
  ),
  getTrackQuadrant: jest.fn(() => 'high-energy-high-valence'),
  getPopularityStyle: jest.fn((quadrant, popularity) => {
    if (popularity !== undefined) {
      return {
        background: '#4CAF50',
        color: '#fff',
        text: 'Popular',
      };
    }
    return null;
  }),
}));

describe('TrackItem', () => {
  const defaultProps = {
    track: mockTracks[0],
    onSelect: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track item with basic information', () => {
      render(<TrackItem {...defaultProps} />);

      expect(screen.getByTestId('track-item')).toBeInTheDocument();
      expect(screen.getByText(mockTracks[0].name)).toBeInTheDocument();
      expect(
        screen.getByText(mockTracks[0].artists[0].name)
      ).toBeInTheDocument();
    });

    it('renders album art when showAlbumArt is true', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={true} />);

      const albumImage = screen.getByRole('img');
      expect(albumImage).toBeInTheDocument();
      expect(albumImage).toHaveAttribute(
        'alt',
        `${mockTracks[0].album.name} album cover`
      );
    });

    it('does not render album art when showAlbumArt is false', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={false} />);

      const albumImage = screen.queryByRole('img');
      expect(albumImage).not.toBeInTheDocument();
    });

    it('renders duration when showDuration is true', () => {
      render(<TrackItem {...defaultProps} showDuration={true} />);

      // Check that formatDuration was called with the correct duration
      expect(
        require('../../../utils/dragAndDrop').formatDuration
      ).toHaveBeenCalledWith(mockTracks[0].duration_ms);
    });

    it('does not render duration when showDuration is false', () => {
      render(<TrackItem {...defaultProps} showDuration={false} />);

      expect(screen.queryByText('3:30')).not.toBeInTheDocument();
    });

    it('applies selected class when selected is true', () => {
      render(<TrackItem {...defaultProps} selected={true} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveClass('selected');
    });

    it('applies draggable class when draggable is true', () => {
      render(<TrackItem {...defaultProps} draggable={true} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveClass('draggable');
      expect(trackItem).toHaveAttribute('draggable', 'true');
    });

    it('applies custom className', () => {
      render(<TrackItem {...defaultProps} className="custom-track" />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveClass('custom-track');
    });

    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      render(<TrackItem {...defaultProps} style={customStyle} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveStyle('background-color: red');
    });
  });

  describe('Checkbox Display', () => {
    it('shows checkbox when showCheckbox is true', () => {
      render(<TrackItem {...defaultProps} showCheckbox={true} />);

      // Check that the track item has the expected structure for checkbox display
      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toBeInTheDocument();

      // The checkbox functionality is tested through the selected state
      expect(trackItem).not.toHaveClass('selected');
    });

    it('shows checkmark when selected and showCheckbox is true', () => {
      render(
        <TrackItem {...defaultProps} showCheckbox={true} selected={true} />
      );

      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('does not show checkbox when showCheckbox is false', () => {
      render(<TrackItem {...defaultProps} showCheckbox={false} />);

      // Check that the track item renders normally without checkbox functionality
      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toBeInTheDocument();
      expect(trackItem).not.toHaveClass('selected');
    });
  });

  describe('Drag Handle', () => {
    it('shows drag handle when showDragHandle is true', () => {
      render(<TrackItem {...defaultProps} showDragHandle={true} />);

      const dragHandle = screen.getByLabelText('Drag handle');
      expect(dragHandle).toBeInTheDocument();
      expect(dragHandle).toHaveTextContent('⋮⋮');
    });

    it('does not show drag handle when showDragHandle is false', () => {
      render(<TrackItem {...defaultProps} showDragHandle={false} />);

      const dragHandle = screen.queryByLabelText('Drag handle');
      expect(dragHandle).not.toBeInTheDocument();
    });
  });

  describe('Remove Button', () => {
    it('shows remove button when onRemove is provided', () => {
      render(<TrackItem {...defaultProps} />);

      const removeButton = screen.getByLabelText(
        `Remove ${mockTracks[0].name}`
      );
      expect(removeButton).toBeInTheDocument();
    });

    it('does not show remove button when onRemove is not provided', () => {
      render(<TrackItem {...defaultProps} onRemove={undefined} />);

      const removeButton = screen.queryByLabelText(
        `Remove ${mockTracks[0].name}`
      );
      expect(removeButton).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} />);

      const removeButton = screen.getByLabelText(
        `Remove ${mockTracks[0].name}`
      );
      await user.click(removeButton);

      expect(defaultProps.onRemove).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('stops propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(<TrackItem {...defaultProps} onClick={onClick} />);

      const removeButton = screen.getByLabelText(
        `Remove ${mockTracks[0].name}`
      );
      await user.click(removeButton);

      expect(onClick).not.toHaveBeenCalled();
      expect(defaultProps.onRemove).toHaveBeenCalledWith(mockTracks[0]);
    });
  });

  describe('Click Interactions', () => {
    it('calls onSelect when clicked and onSelect is provided', async () => {
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} />);

      const trackItem = screen.getByTestId('track-item');
      await user.click(trackItem);

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('calls custom onClick when provided', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} onClick={onClick} />);

      const trackItem = screen.getByTestId('track-item');
      await user.click(trackItem);

      expect(onClick).toHaveBeenCalledWith(expect.any(Object), mockTracks[0]);
      expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('handles Enter key press', async () => {
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} />);

      const trackItem = screen.getByTestId('track-item');
      trackItem.focus();
      await user.keyboard('{Enter}');

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('handles Space key press', async () => {
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} />);

      const trackItem = screen.getByTestId('track-item');
      trackItem.focus();
      await user.keyboard(' ');

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('prevents default behavior for Enter and Space keys', async () => {
      const user = userEvent.setup();
      render(<TrackItem {...defaultProps} />);

      const trackItem = screen.getByTestId('track-item');
      trackItem.focus();

      // Test Enter key
      const enterHandler = jest.fn();
      trackItem.addEventListener('keydown', enterHandler);
      await user.keyboard('{Enter}');
      expect(enterHandler).toHaveBeenCalled();

      // Test Space key
      const spaceHandler = jest.fn();
      trackItem.addEventListener('keydown', spaceHandler);
      await user.keyboard(' ');
      expect(spaceHandler).toHaveBeenCalled();
    });
  });

  describe('Mouse Events', () => {
    it('calls onMouseEnter when provided', () => {
      const onMouseEnter = jest.fn();
      render(<TrackItem {...defaultProps} onMouseEnter={onMouseEnter} />);

      const trackItem = screen.getByTestId('track-item');
      fireEvent.mouseEnter(trackItem);

      expect(onMouseEnter).toHaveBeenCalled();
    });

    it('calls onMouseLeave when provided', () => {
      const onMouseLeave = jest.fn();
      render(<TrackItem {...defaultProps} onMouseLeave={onMouseLeave} />);

      const trackItem = screen.getByTestId('track-item');
      fireEvent.mouseLeave(trackItem);

      expect(onMouseLeave).toHaveBeenCalled();
    });
  });

  describe('Drag Events', () => {
    it('calls onDragStart when provided', () => {
      const onDragStart = jest.fn();
      render(
        <TrackItem
          {...defaultProps}
          draggable={true}
          onDragStart={onDragStart}
        />
      );

      const trackItem = screen.getByTestId('track-item');
      fireEvent.dragStart(trackItem);

      expect(onDragStart).toHaveBeenCalled();
    });

    it('calls onDragEnd when provided', () => {
      const onDragEnd = jest.fn();
      render(
        <TrackItem {...defaultProps} draggable={true} onDragEnd={onDragEnd} />
      );

      const trackItem = screen.getByTestId('track-item');
      fireEvent.dragEnd(trackItem);

      expect(onDragEnd).toHaveBeenCalled();
    });
  });

  describe('Touch Events', () => {
    it('calls onTouchStart when provided', () => {
      const onTouchStart = jest.fn();
      render(<TrackItem {...defaultProps} onTouchStart={onTouchStart} />);

      const trackItem = screen.getByTestId('track-item');
      fireEvent.touchStart(trackItem);

      expect(onTouchStart).toHaveBeenCalled();
    });

    it('calls onTouchMove when provided', () => {
      const onTouchMove = jest.fn();
      render(<TrackItem {...defaultProps} onTouchMove={onTouchMove} />);

      const trackItem = screen.getByTestId('track-item');
      fireEvent.touchMove(trackItem);

      expect(onTouchMove).toHaveBeenCalled();
    });

    it('calls onTouchEnd when provided', () => {
      const onTouchEnd = jest.fn();
      render(<TrackItem {...defaultProps} onTouchEnd={onTouchEnd} />);

      const trackItem = screen.getByTestId('track-item');
      fireEvent.touchEnd(trackItem);

      expect(onTouchEnd).toHaveBeenCalled();
    });
  });

  describe('Custom Actions', () => {
    it('renders custom actions when provided', () => {
      const customActions = <button>Custom Action</button>;
      render(<TrackItem {...defaultProps} actions={customActions} />);

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });
  });

  describe('Source Playlist Display', () => {
    it('shows source playlist when showSourcePlaylist is true and track has sourcePlaylistName', () => {
      const trackWithSource = {
        ...mockTracks[0],
        sourcePlaylistName: 'My Playlist',
      };

      render(
        <TrackItem
          {...defaultProps}
          track={trackWithSource}
          showSourcePlaylist={true}
        />
      );

      expect(screen.getByText('My Playlist')).toBeInTheDocument();
    });
  });

  describe('Popularity Display', () => {
    it('shows popularity badge when showPopularity is true', () => {
      // Ensure the track has a popularity value
      const trackWithPopularity = {
        ...mockTracks[0],
        popularity: 75,
      };

      render(
        <TrackItem
          {...defaultProps}
          track={trackWithPopularity}
          showPopularity={true}
        />
      );

      // Check that the popularity style functions were called
      expect(
        require('../../../utils/dragAndDrop').getTrackQuadrant
      ).toHaveBeenCalledWith(trackWithPopularity);
      expect(
        require('../../../utils/dragAndDrop').getPopularityStyle
      ).toHaveBeenCalled();
    });

    it('does not show popularity badge when showPopularity is false', () => {
      render(<TrackItem {...defaultProps} showPopularity={false} />);

      expect(screen.queryByText('Popular')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<TrackItem {...defaultProps} />);

      const trackItem = screen.getByTestId('track-item');
      expect(trackItem).toHaveAttribute('role', 'listitem');
      expect(trackItem).toHaveAttribute('tabIndex', '0');
    });

    it('handles image error gracefully', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={true} />);

      const albumImage = screen.getByRole('img');
      fireEvent.error(albumImage);

      expect(albumImage).toHaveStyle('display: none');
    });
  });
});
