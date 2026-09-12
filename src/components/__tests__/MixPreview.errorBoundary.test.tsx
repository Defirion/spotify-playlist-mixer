// React import removed - using automatic JSX runtime
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';

// Mock hooks used by PlaylistMixer
vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));

vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: vi.fn(),
}));

vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: vi.fn(),
}));

// Mock MixPreview to throw when rendered
vi.mock('../features/mixer/MixPreview', () => {
  const __mod = (() => {
    return function ThrowingMixPreview() {
      throw new Error('Test throw from MixPreview');
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

// Minimal props to mount PlaylistMixer
const defaultProps: any = {
  accessToken: 'test-token',
  selectedPlaylists: [
    {
      id: 'p1',
      name: 'P1',
      images: [],
      tracks: { total: 1 },
      owner: { id: 'o1', display_name: 'o1', external_urls: { spotify: '' } },
      uri: '',
      external_urls: { spotify: '' },
      public: false,
      collaborative: false,
    },
  ],
  ratioConfig: { p1: { min: 1, max: 2, weight: 1, weightType: 'frequency' } },
  mixOptions: {
    playlistName: 'name',
    totalSongs: 10,
    targetDuration: 0,
    useTimeLimit: false,
    useAllSongs: true,
    shuffleTracks: false,
    continueWhenPlaylistEmpty: false,
  },
  updateMixOptions: vi.fn(),
  onMixedPlaylist: vi.fn(),
  onError: vi.fn(),
};

describe('MixPreview ErrorBoundary integration', () => {
  let consoleErrorSpy: import('vitest').MockInstance;

  beforeEach(async () => {
    // Silence expected React error logs during test
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { useMixGeneration } = await import('../../hooks/useMixGeneration');
    const { useMixPreview } = await import('../../hooks/useMixPreview');
    const { useMixWarnings } = await import('../../hooks/useMixWarnings');

    vi.mocked(useMixGeneration).mockReturnValue({
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

    // Provide a non-null preview so PlaylistMixer attempts to render MixPreview
    vi.mocked(useMixPreview).mockReturnValue({
      state: {
        preview: {
          tracks: [{ id: 't1', instanceId: 'i1' }],
          stats: {},
          totalDuration: 0,
        } as any,
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: vi.fn(),
      updateTrackOrder: vi.fn(),
      clearPreview: vi.fn(),
      getPreviewTracks: vi.fn(() => []),
    });

    vi.mocked(useMixWarnings).mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.resetAllMocks();
  });

  it('renders ErrorBoundary fallback when MixPreview throws', () => {
    render(<PlaylistMixer {...defaultProps} />);

    // ErrorBoundary default fallback contains the text 'Something went wrong'
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    // And the Try Again button should be present (button element)
    expect(
      screen.getByRole('button', { name: /Try Again/i })
    ).toBeInTheDocument();
  });
});
