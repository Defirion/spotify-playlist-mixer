// React import removed - using automatic JSX runtime
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { SpotifyPlaylist, MixOptions, RatioConfig } from '../../types';

// Import the mocked hooks
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';

// Mock the hooks with proper Jest hoisting
vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));

vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: vi.fn(),
}));

vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: vi.fn(),
}));

// Cast to vi mocks for TypeScript
const mockUseMixGeneration =
  useMixGeneration as import('vitest').MockedFunction<typeof useMixGeneration>;
const mockUseMixPreview = useMixPreview as import('vitest').MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as import('vitest').MockedFunction<
  typeof useMixWarnings
>;

// Mock the child components
vi.mock('../features/mixer/PlaylistForm', () => {
  const __mod = (() => {
    return function MockPlaylistForm({ mixOptions, onMixOptionsChange }: any) {
      return (
        <div data-testid="playlist-form">
          <input
            data-testid="playlist-name-input"
            value={mixOptions.playlistName}
            onChange={e => onMixOptionsChange({ playlistName: e.target.value })}
          />
        </div>
      );
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

vi.mock('../features/mixer/MixPreview', () => {
  const __mod = (() => {
    return function MockMixPreview({ tracks }: any) {
      return (
        <div data-testid="mix-preview">{tracks.length} tracks in preview</div>
      );
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

vi.mock('../features/mixer/MixControls', () => {
  const __mod = (() => {
    return function MockMixControls({
      onGeneratePreview,
      onCreatePlaylist,
    }: any) {
      return (
        <div data-testid="mix-controls">
          <button
            data-testid="generate-preview-btn"
            onClick={onGeneratePreview}
          >
            Generate Preview
          </button>
          <button data-testid="create-playlist-btn" onClick={onCreatePlaylist}>
            Create Playlist
          </button>
        </div>
      );
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

const mockSelectedPlaylists: SpotifyPlaylist[] = [
  {
    id: 'playlist1',
    name: 'Test Playlist 1',
    description: 'Test description',
    images: [],
    tracks: { total: 50, href: '' },
    owner: {
      id: 'user1',
      display_name: 'User 1',
      external_urls: { spotify: '' },
    },
    public: false,
    collaborative: false,
    uri: 'spotify:playlist:playlist1',
    external_urls: { spotify: '' },
    realAverageDurationSeconds: 210,
  },
  {
    id: 'playlist2',
    name: 'Test Playlist 2',
    description: 'Test description',
    images: [],
    tracks: { total: 75, href: '' },
    owner: {
      id: 'user1',
      display_name: 'User 1',
      external_urls: { spotify: '' },
    },
    public: false,
    collaborative: false,
    uri: 'spotify:playlist:playlist2',
    external_urls: { spotify: '' },
    realAverageDurationSeconds: 200,
  },
];

const mockMixOptions: MixOptions = {
  totalSongs: 100,
  targetDuration: 240,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'My Mixed Playlist',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: true,
  continueWhenPlaylistEmpty: false,
};

const mockRatioConfig: RatioConfig = {
  playlist1: {
    min: 0,
    max: 100,
    weight: 1,
    weightType: 'frequency',
  },
  playlist2: {
    min: 0,
    max: 100,
    weight: 1,
    weightType: 'frequency',
  },
};

describe('PlaylistMixer', () => {
  const defaultProps = {
    accessToken: 'test-token',
    selectedPlaylists: mockSelectedPlaylists,
    ratioConfig: mockRatioConfig,
    mixOptions: mockMixOptions,
    updateMixOptions: vi.fn(),
    onMixedPlaylist: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock return values
    mockUseMixGeneration.mockReturnValue({
      state: {
        loading: false,
        error: null,
        mixedTracks: [],
        exhaustedPlaylists: [],
        stoppedEarly: false,
      },
      generateMix: vi.fn(),
      createPlaylist: vi.fn(),
      reset: vi.fn(),
    });

    mockUseMixPreview.mockReturnValue({
      state: {
        preview: null,
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: vi.fn(),
      updateTrackOrder: vi.fn(),
      clearPreview: vi.fn(),
      getPreviewTracks: vi.fn(() => []),
    });

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    });
  });

  it('renders the component with title and subtitle', () => {
    render(<PlaylistMixer {...defaultProps} />);

    expect(screen.getByText('🎵 Create Your Mix')).toBeInTheDocument();
    expect(
      screen.getByText('Blend your playlists into the perfect mix')
    ).toBeInTheDocument();
  });

  it('renders the playlist form', () => {
    render(<PlaylistMixer {...defaultProps} />);

    expect(screen.getByTestId('playlist-form')).toBeInTheDocument();
    expect(screen.getByTestId('playlist-name-input')).toBeInTheDocument();
  });

  it('renders the mix controls', () => {
    render(<PlaylistMixer {...defaultProps} />);

    expect(screen.getByTestId('mix-controls')).toBeInTheDocument();
    expect(screen.getByTestId('generate-preview-btn')).toBeInTheDocument();
    expect(screen.getByTestId('create-playlist-btn')).toBeInTheDocument();
  });

  it('updates mix options when form changes', () => {
    const mockUpdateMixOptions = vi.fn();
    render(
      <PlaylistMixer
        {...defaultProps}
        updateMixOptions={mockUpdateMixOptions}
      />
    );

    const input = screen.getByTestId('playlist-name-input');
    fireEvent.change(input, { target: { value: 'New Playlist Name' } });

    expect(mockUpdateMixOptions).toHaveBeenCalledWith({
      playlistName: 'New Playlist Name',
    });
  });

  it('calls generate preview when button is clicked', () => {
    const mockGeneratePreview = vi.fn();
    mockUseMixPreview.mockReturnValue({
      state: {
        preview: null,
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: mockGeneratePreview,
      updateTrackOrder: vi.fn(),
      clearPreview: vi.fn(),
      getPreviewTracks: vi.fn(() => []),
    });

    render(<PlaylistMixer {...defaultProps} />);

    const generateBtn = screen.getByTestId('generate-preview-btn');
    fireEvent.click(generateBtn);

    expect(mockGeneratePreview).toHaveBeenCalledWith(
      mockSelectedPlaylists,
      mockRatioConfig,
      expect.objectContaining({
        playlistName: 'My Mixed Playlist',
        useAllSongs: true,
      })
    );
  });

  it('calls create playlist when button is clicked', async () => {
    const mockCreatePlaylist = vi
      .fn()
      .mockResolvedValue({ id: 'new-playlist' });
    const mockGenerateMix = vi.fn().mockResolvedValue([]);

    mockUseMixGeneration.mockReturnValue({
      state: {
        loading: false,
        error: null,
        mixedTracks: [],
        exhaustedPlaylists: [],
        stoppedEarly: false,
      },
      generateMix: mockGenerateMix,
      createPlaylist: mockCreatePlaylist,
      reset: vi.fn(),
    });

    render(<PlaylistMixer {...defaultProps} />);

    const createBtn = screen.getByTestId('create-playlist-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith('My Mixed Playlist', []);
    });
  });

  it('displays help text', () => {
    render(<PlaylistMixer {...defaultProps} />);

    expect(
      screen.getByText(
        'Happy with your mix? Create the playlist or regenerate with your current settings'
      )
    ).toBeInTheDocument();
  });

  it('displays updated mix options when props change', () => {
    const { rerender } = render(<PlaylistMixer {...defaultProps} />);

    const newMixOptions = {
      ...mockMixOptions,
      playlistName: 'Updated Playlist Name',
      useAllSongs: false,
    };

    rerender(<PlaylistMixer {...defaultProps} mixOptions={newMixOptions} />);

    const input = screen.getByTestId('playlist-name-input');
    expect(input).toHaveValue('Updated Playlist Name');
  });
});
