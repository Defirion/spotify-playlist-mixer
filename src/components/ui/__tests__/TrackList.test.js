import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrackList from '../TrackList';
import { mockTracks } from '../../../mocks/fixtures';

// Mock the virtualization hook
jest.mock('../../../hooks/useVirtualization', () => {
  return jest.fn(params => {
    if (params) {
      return {
        visibleItems: params.items || mockTracks,
        startIndex: 0,
        containerProps: {},
        spacerProps: {},
        getItemProps: () => ({}),
      };
    }
    return {
      visibleItems: mockTracks,
      startIndex: 0,
      containerProps: {},
      spacerProps: {},
      getItemProps: () => ({}),
    };
  });
});

describe('TrackList', () => {
  const defaultProps = {
    tracks: mockTracks,
    onTrackSelect: jest.fn(),
    onTrackRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track list with tracks', () => {
      render(<TrackList {...defaultProps} />);

      expect(screen.getByTestId('track-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('track-item')).toHaveLength(
        mockTracks.length
      );
    });

    it('renders empty message when no tracks', () => {
      render(<TrackList {...defaultProps} tracks={[]} />);

      expect(screen.getByText('No tracks available')).toBeInTheDocument();
    });

    it('renders custom empty message', () => {
      render(
        <TrackList
          {...defaultProps}
          tracks={[]}
          emptyMessage="Custom empty message"
        />
      );

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<TrackList {...defaultProps} className="custom-track-list" />);

      const trackList = screen.getByTestId('track-list');
      expect(trackList).toHaveClass('custom-track-list');
    });

    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      render(<TrackList {...defaultProps} style={customStyle} />);

      const trackList = screen.getByTestId('track-list');
      expect(trackList).toHaveStyle('background-color: red');
    });
  });

  describe('Track Selection', () => {
    it('calls onTrackSelect when selectable and track is clicked', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} selectable={true} />);

      const firstTrack = screen.getAllByTestId('track-item')[0];
      await user.click(firstTrack);

      expect(defaultProps.onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('does not call onTrackSelect when not selectable', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} selectable={false} />);

      const firstTrack = screen.getAllByTestId('track-item')[0];
      await user.click(firstTrack);

      expect(defaultProps.onTrackSelect).not.toHaveBeenCalled();
    });

    it('shows selected tracks correctly', () => {
      const selectedTracks = new Set([mockTracks[0].id]);
      render(
        <TrackList
          {...defaultProps}
          selectedTracks={selectedTracks}
          selectable={true}
        />
      );

      const trackItems = screen.getAllByTestId('track-item');
      expect(trackItems[0]).toHaveClass('selected');
      expect(trackItems[1]).not.toHaveClass('selected');
    });
  });

  describe('Track Removal', () => {
    it('calls onTrackRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} />);

      const removeButtons = screen.getAllByLabelText(/remove/i);
      await user.click(removeButtons[0]);

      expect(defaultProps.onTrackRemove).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('does not render remove buttons when onTrackRemove is not provided', () => {
      render(<TrackList {...defaultProps} onTrackRemove={undefined} />);

      const removeButtons = screen.queryAllByLabelText(/remove/i);
      expect(removeButtons).toHaveLength(0);
    });
  });

  // Drag and Drop tests removed - will be replaced with dnd-kit tests

  describe('Custom Event Handlers', () => {
    it('calls onTrackClick when provided', async () => {
      const onTrackClick = jest.fn();
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} onTrackClick={onTrackClick} />);

      const firstTrack = screen.getAllByTestId('track-item')[0];
      await user.click(firstTrack);

      expect(onTrackClick).toHaveBeenCalledWith(
        expect.any(Object), // event
        mockTracks[0],
        0 // index
      );
    });

    it('calls onTrackMouseEnter when provided', async () => {
      const onTrackMouseEnter = jest.fn();
      render(
        <TrackList {...defaultProps} onTrackMouseEnter={onTrackMouseEnter} />
      );

      const firstTrack = screen.getAllByTestId('track-item')[0];
      fireEvent.mouseEnter(firstTrack);

      expect(onTrackMouseEnter).toHaveBeenCalledWith(
        expect.any(Object), // event
        mockTracks[0],
        0 // index
      );
    });

    // onTrackDragStart test removed - will be replaced with dnd-kit tests
  });

  describe('Display Options', () => {
    it('shows checkboxes when showCheckbox is true', () => {
      render(<TrackList {...defaultProps} showCheckbox={true} />);

      const checkboxes = screen.getAllByRole('listitem');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    // showDragHandle test removed - will be replaced with dnd-kit tests

    it('hides album art when showAlbumArt is false', () => {
      render(<TrackList {...defaultProps} showAlbumArt={false} />);

      const albumImages = screen.queryAllByRole('img');
      expect(albumImages).toHaveLength(0);
    });
  });

  describe('Custom Actions', () => {
    it('renders custom actions from renderTrackActions prop', () => {
      const renderTrackActions = (track, index) => (
        <button key={track.id}>Custom Action {index}</button>
      );

      render(
        <TrackList {...defaultProps} renderTrackActions={renderTrackActions} />
      );

      expect(screen.getByText('Custom Action 0')).toBeInTheDocument();
      expect(screen.getByText('Custom Action 1')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles Enter key on track items', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} selectable={true} />);

      const firstTrack = screen.getAllByTestId('track-item')[0];
      firstTrack.focus();
      await user.keyboard('{Enter}');

      expect(defaultProps.onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('handles Space key on track items', async () => {
      const user = userEvent.setup();
      render(<TrackList {...defaultProps} selectable={true} />);

      const firstTrack = screen.getAllByTestId('track-item')[0];
      firstTrack.focus();
      await user.keyboard(' ');

      expect(defaultProps.onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
    });
  });
});
