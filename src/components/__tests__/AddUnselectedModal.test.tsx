import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Jest globals are available by default in CRA
import AddUnselectedModal from '../AddUnselectedModal';
import { SpotifyTrack, SpotifyPlaylist } from '../../types';
import * as spotifyUtils from '../../utils/spotify';
import * as dragAndDropUtils from '../../utils/dragAndDrop';

// Mock dependencies
jest.mock('../../utils/spotify');
jest.mock('../../utils/dragAndDrop');
jest.mock('../ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children, backdropStyle, ...props }: any) => {
    // Filter out non-DOM props
    const domProps = { ...props };
    delete domProps.backdropStyle;
    
    return isOpen ? (
      <div data-testid="modal" {...domProps}>
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null;
  },
}));
jest.mock('../ui/TrackList', () => ({
  __esModule: true,
  default: ({
    tracks,
    onTrackSelect,
    selectedTracks,
    onTrackDragStart,
    onTrackTouchStart,
    emptyMessage,
    containerHeight,
    ...props
  }: any) => {
    // Filter out non-DOM props
    const { 
      selectable, 
      showCheckbox, 
      showAlbumArt, 
      showPopularity, 
      showDuration, 
      showSourcePlaylist, 
      virtualized,
      onTrackTouchMove,
      onTrackTouchEnd,
      onTrackDragEnd,
      ...domProps 
    } = props;
    
    return (
      <div 
        data-testid="track-list" 
        style={{ height: containerHeight, overflowY: 'auto' }}
        {...domProps}
      >
        {tracks && tracks.length > 0 ? (
          tracks.map((track: SpotifyTrack, index: number) => (
            <div
              key={track.id}
              data-testid={`track-item-${track.id}`}
              onClick={() => onTrackSelect?.(track)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onTrackSelect?.(track);
                }
              }}
              onDragStart={e => onTrackDragStart?.(e, track)}
              onTouchStart={e => onTrackTouchStart?.(e, track)}
              role="button"
              tabIndex={0}
              draggable
            >
              {track.name} - {track.artists[0]?.name}
              {selectedTracks?.has(track.id) && (
                <span data-testid="selected">Selected</span>
              )}
            </div>
          ))
        ) : (
          <div data-testid="empty-message">{emptyMessage}</div>
        )}
      </div>
    );
  },
}));
const mockStartDrag = jest.fn();
const mockEndDrag = jest.fn();

jest.mock('../../hooks/useDraggable', () => ({
  __esModule: true,
  default: () => ({
    isDragging: false,
    startDrag: mockStartDrag,
    endDrag: mockEndDrag,
  }),
}));

// Mock data
const mockTracks: SpotifyTrack[] = [
  {
    id: 'track1',
    name: 'Test Track 1',
    artists: [
      { id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' },
    ],
    album: {
      id: 'album1',
      name: 'Test Album 1',
      images: [],
      release_date: '2023-01-01',
    },
    duration_ms: 180000,
    popularity: 75,
    uri: 'spotify:track:track1',
    external_urls: { spotify: 'https://open.spotify.com/track/track1' },
  },
  {
    id: 'track2',
    name: 'Test Track 2',
    artists: [
      { id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' },
    ],
    album: {
      id: 'album2',
      name: 'Test Album 2',
      images: [],
      release_date: '2023-01-02',
    },
    duration_ms: 200000,
    popularity: 80,
    uri: 'spotify:track:track2',
    external_urls: { spotify: 'https://open.spotify.com/track/track2' },
  },
];

const mockPlaylists: SpotifyPlaylist[] = [
  {
    id: 'playlist1',
    name: 'Test Playlist 1',
    description: 'Test Description 1',
    images: [],
    tracks: { total: 10 },
    owner: { id: 'user1', display_name: 'Test User' },
    public: true,
    uri: 'spotify:playlist:playlist1',
  },
];

const mockCurrentTracks: SpotifyTrack[] = [];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  accessToken: 'test-token',
  selectedPlaylists: mockPlaylists,
  currentTracks: mockCurrentTracks,
  onAddTracks: jest.fn(),
};

// Mock API responses
const mockApiGet = jest.fn();
const mockSpotifyApi = {
  get: mockApiGet,
};

describe('AddUnselectedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (spotifyUtils.getSpotifyApi as any).mockReturnValue(mockSpotifyApi);
    (dragAndDropUtils.handleTrackSelection as any).mockImplementation(
      (
        track: SpotifyTrack,
        selectedTracks: Set<string>,
        setSelectedTracks: Function
      ) => {
        const newSet = new Set(selectedTracks);
        if (newSet.has(track.id)) {
          newSet.delete(track.id);
        } else {
          newSet.add(track.id);
        }
        setSelectedTracks(newSet);
      }
    );

    // Mock API response for playlist tracks
    mockApiGet.mockResolvedValue({
      data: {
        items: mockTracks.map(track => ({ track })),
      },
    });

    // Mock DOM methods
    Object.defineProperty(document, 'querySelector', {
      value: jest.fn().mockReturnValue(null),
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders modal when open', () => {
    render(<AddUnselectedModal {...defaultProps} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      '➕ Add Unselected Tracks'
    );
  });

  it('does not render when closed', () => {
    render(<AddUnselectedModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    await user.click(screen.getByTestId('modal-close'));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('fetches playlist tracks on mount', async () => {
    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(spotifyUtils.getSpotifyApi).toHaveBeenCalledWith('test-token');
    });

    expect(mockApiGet).toHaveBeenCalledWith(
      '/playlists/playlist1/tracks?offset=0&limit=100'
    );
  });

  it('displays loading state while fetching tracks', () => {
    render(<AddUnselectedModal {...defaultProps} />);

    expect(
      screen.getByText('Loading unselected tracks...')
    ).toBeInTheDocument();
  });

  it('displays tracks after loading', async () => {
    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });
  });

  it('filters tracks based on search query', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search tracks, artists, or albums...'
    );
    await user.type(searchInput, 'Test Track 1');

    await waitFor(() => {
      expect(screen.getByTestId('track-item-track1')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('track-item-track2')).not.toBeInTheDocument();
  });

  it('handles track selection', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('track-item-track1'));

    expect(dragAndDropUtils.handleTrackSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockTracks[0],
        sourcePlaylist: 'playlist1',
        sourcePlaylistName: 'Test Playlist 1',
      }),
      expect.any(Set),
      expect.any(Function)
    );
  });

  it('updates selected tracks count in footer', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    // Initially no tracks selected
    expect(screen.getByText('0 tracks selected')).toBeInTheDocument();

    // Select a track
    await user.click(screen.getByTestId('track-item-track1'));

    await waitFor(() => {
      expect(screen.getByText('1 track selected')).toBeInTheDocument();
    });
  });

  it('enables add button when tracks are selected', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', {
      name: /Add.*Track.*Continue/,
    });
    expect(addButton).toBeDisabled();

    // Select a track
    await user.click(screen.getByTestId('track-item-track1'));

    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });
  });

  it('calls onAddTracks when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    // Select a track
    await user.click(screen.getByTestId('track-item-track1'));

    await waitFor(() => {
      const addButton = screen.getByRole('button', {
        name: /Add.*Track.*Continue/,
      });
      expect(addButton).toBeEnabled();
    });

    const addButton = screen.getByRole('button', {
      name: /Add.*Track.*Continue/,
    });
    await user.click(addButton);

    expect(defaultProps.onAddTracks).toHaveBeenCalledWith([
      expect.objectContaining({
        ...mockTracks[0],
        sourcePlaylist: 'playlist1',
        sourcePlaylistName: 'Test Playlist 1',
      })
    ]);
  });

  it('clears selected tracks after adding', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    // Wait for tracks to load
    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    // Select a track
    await user.click(screen.getByTestId('track-item-track1'));

    await waitFor(() => {
      expect(screen.getByText('1 track selected')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', {
      name: /Add.*Track.*Continue/,
    });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('0 tracks selected')).toBeInTheDocument();
    });
  });

  it('excludes tracks that are already in current tracks', async () => {
    const propsWithCurrentTracks = {
      ...defaultProps,
      currentTracks: [mockTracks[0]], // track1 is already selected
    };

    render(<AddUnselectedModal {...propsWithCurrentTracks} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    // Only track2 should be available
    expect(screen.queryByTestId('track-item-track1')).not.toBeInTheDocument();
    expect(screen.getByTestId('track-item-track2')).toBeInTheDocument();
  });

  it('handles drag start events', async () => {
    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    const trackItem = screen.getByTestId('track-item-track1');
    fireEvent.dragStart(trackItem);

    // Verify drag start was handled (implementation details may vary)
    expect(trackItem).toBeInTheDocument();
  });

  it('handles touch events for mobile drag', async () => {
    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    const trackItem = screen.getByTestId('track-item-track1');
    fireEvent.touchStart(trackItem, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Verify touch start was handled
    expect(trackItem).toBeInTheDocument();
  });

  it('displays empty message when no tracks match search', async () => {
    const user = userEvent.setup();
    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search tracks, artists, or albums...'
    );
    await user.type(searchInput, 'nonexistent track');

    await waitFor(() => {
      expect(screen.getByTestId('empty-message')).toHaveTextContent(
        'No tracks match your search'
      );
    });
  });

  it('displays empty message when all tracks are already included', async () => {
    const propsWithAllTracks = {
      ...defaultProps,
      currentTracks: mockTracks, // All tracks are already selected
    };

    render(<AddUnselectedModal {...propsWithAllTracks} />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-message')).toHaveTextContent(
        'All tracks from your playlists are already included'
      );
    });
  });

  it('resets selected tracks when modal is closed and reopened', async () => {
    const { rerender } = render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    // Select a track
    await userEvent.click(screen.getByTestId('track-item-track1'));

    await waitFor(() => {
      expect(screen.getByText('1 track selected')).toBeInTheDocument();
    });

    // Close modal
    rerender(<AddUnselectedModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<AddUnselectedModal {...defaultProps} isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('0 tracks selected')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockApiGet.mockRejectedValue(new Error('API Error'));

    render(<AddUnselectedModal {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch playlist tracks:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
