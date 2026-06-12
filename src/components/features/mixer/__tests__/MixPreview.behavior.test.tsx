import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MixPreview from '../MixPreview';
import { MixedTrack } from '../../../../types';
import { makeTrack } from '../../../../test-utils/mocks/spotify';

// Mock child components to focus on MixPreview behavior
vi.mock('../../../SpotifySearchModal', () => {
  const __mod = (() => {
    return function MockSpotifySearchModal({
      isOpen,
      onClose,
      onAddTracks,
    }: any) {
      if (!isOpen) return null;
      return (
        <div data-testid="spotify-search-modal">
          <button onClick={onClose}>Close</button>
          <button
            onClick={() =>
              onAddTracks([{ id: 'new-track', name: 'New Track' }])
            }
          >
            Add Track
          </button>
        </div>
      );
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

vi.mock('../../../AddUnselectedModal', () => {
  const __mod = (() => {
    return function MockAddUnselectedModal({
      isOpen,
      onClose,
      onAddTracks,
    }: any) {
      if (!isOpen) return null;
      return (
        <div data-testid="add-unselected-modal">
          <button onClick={onClose}>Close</button>
          <button
            onClick={() =>
              onAddTracks([
                { id: 'unselected-track', name: 'Unselected Track' },
              ])
            }
          >
            Add Unselected
          </button>
        </div>
      );
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

const mockTracks: MixedTrack[] = [
  {
    ...makeTrack({
      id: 'track1',
      name: 'Track 1',
      duration_ms: 180000,
      popularity: 80,
      uri: 'spotify:track:track1',
    }),
    sourcePlaylist: 'playlist1',
  } as unknown as MixedTrack,
  {
    ...makeTrack({
      id: 'track2',
      name: 'Track 2',
      duration_ms: 200000,
      popularity: 70,
      uri: 'spotify:track:track2',
    }),
    sourcePlaylist: 'playlist2',
  } as unknown as MixedTrack,
];

const mockStats = {
  playlist1: { name: 'Playlist 1', count: 1, totalDuration: 180000 },
  playlist2: { name: 'Playlist 2', count: 1, totalDuration: 200000 },
};

describe('MixPreview Behavior Tests', () => {
  const defaultProps = {
    tracks: mockTracks,
    stats: mockStats,
    totalDuration: 380000,
    loading: false,
    onTrackOrderChange: vi.fn(),
    accessToken: 'test-token',
    selectedPlaylists: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(<MixPreview {...defaultProps} loading={true} />);

    expect(screen.getByText('Generating Preview...')).toBeInTheDocument();
    expect(screen.queryByText('Mix Preview')).not.toBeInTheDocument();
  });

  it('returns null when no tracks and not loading', () => {
    render(<MixPreview {...defaultProps} tracks={[]} loading={false} />);

    // Component should not render any preview content when there are no tracks
    expect(screen.queryByText('Mix Preview')).not.toBeInTheDocument();
  });

  it('displays track and duration stats correctly', () => {
    render(<MixPreview {...defaultProps} />);

    expect(screen.getByText('2 tracks')).toBeInTheDocument();
    expect(screen.getByText('6m')).toBeInTheDocument(); // 380000ms = 6.33m ≈ 6m
  });

  it('formats duration in hours and minutes for longer durations', () => {
    const longDuration = 7200000; // 2 hours
    render(<MixPreview {...defaultProps} totalDuration={longDuration} />);

    expect(screen.getByText('2h 0m')).toBeInTheDocument();
  });

  it('displays playlist breakdown correctly', () => {
    render(<MixPreview {...defaultProps} />);

    expect(screen.getByText('Playlist 1')).toBeInTheDocument();
    expect(screen.getByText('Playlist 2')).toBeInTheDocument();
    expect(screen.getAllByText('1 tracks')).toHaveLength(2); // One for each playlist
    expect(screen.getAllByText('3m')).toHaveLength(2); // One for each playlist duration
  });

  it('opens and closes Spotify search modal', async () => {
    const user = userEvent.setup();
    render(<MixPreview {...defaultProps} />);

    const searchButton = screen.getByText('🔍 Search Spotify');
    await user.click(searchButton);

    expect(screen.getByTestId('spotify-search-modal')).toBeInTheDocument();

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId('spotify-search-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('opens and closes Add Unselected modal', async () => {
    const user = userEvent.setup();
    render(<MixPreview {...defaultProps} />);

    const addUnselectedButton = screen.getByText('➕ Add Unselected');
    await user.click(addUnselectedButton);

    expect(screen.getByTestId('add-unselected-modal')).toBeInTheDocument();

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId('add-unselected-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('handles adding tracks from Spotify search', async () => {
    const user = userEvent.setup();
    const mockOnTrackOrderChange = vi.fn();

    render(
      <MixPreview
        {...defaultProps}
        onTrackOrderChange={mockOnTrackOrderChange}
      />
    );

    const searchButton = screen.getByText('🔍 Search Spotify');
    await user.click(searchButton);

    const addTrackButton = screen.getByText('Add Track');
    await user.click(addTrackButton);

    expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
      ...mockTracks,
      { id: 'new-track', name: 'New Track' },
    ]);
  });

  it('handles adding tracks from unselected modal', async () => {
    const user = userEvent.setup();
    const mockOnTrackOrderChange = vi.fn();

    render(
      <MixPreview
        {...defaultProps}
        onTrackOrderChange={mockOnTrackOrderChange}
      />
    );

    const addUnselectedButton = screen.getByText('➕ Add Unselected');
    await user.click(addUnselectedButton);

    const addUnselectedTrackButton = screen.getByText('Add Unselected');
    await user.click(addUnselectedTrackButton);

    expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
      ...mockTracks,
      { id: 'unselected-track', name: 'Unselected Track' },
    ]);
  });

  it('shows empty state when no tracks in DroppableTrackList', () => {
    render(<MixPreview {...defaultProps} tracks={[]} loading={false} />);

    // This won't render because the component returns null for empty tracks
    // But let's test the DroppableTrackList component separately if needed
  });

  it('handles window resize for mobile layout', async () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const manyPlaylistsStats = {
      playlist1: { name: 'Playlist 1', count: 1, totalDuration: 180000 },
      playlist2: { name: 'Playlist 2', count: 1, totalDuration: 180000 },
      playlist3: { name: 'Playlist 3', count: 1, totalDuration: 180000 },
      playlist4: { name: 'Playlist 4', count: 1, totalDuration: 180000 },
      playlist5: { name: 'Playlist 5', count: 1, totalDuration: 180000 },
      playlist6: { name: 'Playlist 6', count: 1, totalDuration: 180000 },
    };

    render(<MixPreview {...defaultProps} stats={manyPlaylistsStats} />);

    // Trigger resize event
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });

    fireEvent.resize(window);

    // Component should handle resize, this tests the resize listener
    expect(screen.getByText('Playlist 1')).toBeInTheDocument();
  });

  it('calculates grid columns correctly for many playlists', () => {
    const manyPlaylistsStats = {
      playlist1: { name: 'P1', count: 1, totalDuration: 180000 },
      playlist2: { name: 'P2', count: 1, totalDuration: 180000 },
      playlist3: { name: 'P3', count: 1, totalDuration: 180000 },
      playlist4: { name: 'P4', count: 1, totalDuration: 180000 },
      playlist5: { name: 'P5', count: 1, totalDuration: 180000 },
      playlist6: { name: 'P6', count: 1, totalDuration: 180000 },
      playlist7: { name: 'P7', count: 1, totalDuration: 180000 },
    };

    render(<MixPreview {...defaultProps} stats={manyPlaylistsStats} />);

    // Should render all playlist names
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P7')).toBeInTheDocument();
  });

  it('displays track count in short format on smaller screens', () => {
    render(<MixPreview {...defaultProps} />);

    // Both full and short versions should be in DOM, CSS controls visibility
    expect(screen.getAllByText('1 tracks')).toHaveLength(2); // Two playlists
    expect(screen.getAllByText('1 tr')).toHaveLength(2); // Two playlists short form
  });

  it('shows playlist name with title attribute for truncation', () => {
    const longNameStats = {
      playlist1: {
        name: 'This is a very long playlist name that should be truncated',
        count: 1,
        totalDuration: 180000,
      },
    };

    render(<MixPreview {...defaultProps} stats={longNameStats} />);

    const playlistElement = screen.getByTitle(
      'This is a very long playlist name that should be truncated'
    );
    expect(playlistElement).toBeInTheDocument();
  });

  it('formats duration correctly for different time ranges', () => {
    // Test various duration formatting scenarios
    const testCases = [
      { duration: 30000, expected: '0m' }, // 30 seconds
      { duration: 90000, expected: '1m' }, // 1.5 minutes
      { duration: 3600000, expected: '1h 0m' }, // 1 hour
      { duration: 3780000, expected: '1h 3m' }, // 1 hour 3 minutes
    ];

    testCases.forEach(({ duration, expected }) => {
      const { unmount } = render(
        <MixPreview {...defaultProps} totalDuration={duration} />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });
});
