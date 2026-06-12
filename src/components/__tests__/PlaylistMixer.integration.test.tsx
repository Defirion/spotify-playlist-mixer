import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';
// Mock child components to expose test hooks and buttons
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

vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));

vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: vi.fn(),
}));

vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: vi.fn(),
}));

const mockUseMixGeneration =
  useMixGeneration as import('vitest').MockedFunction<typeof useMixGeneration>;
const mockUseMixPreview = useMixPreview as import('vitest').MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as import('vitest').MockedFunction<
  typeof useMixWarnings
>;

const sampleTrack = (i: number) => ({
  id: `t${i}`,
  name: `Track ${i}`,
  instanceId: `inst-${i}`,
  sourcePlaylist: 'playlist1',
});

const mockSelectedPlaylists = [
  {
    id: 'p1',
    name: 'P1',
    images: [],
    tracks: { total: 1, href: '' },
    owner: { id: 'u' },
    public: false,
    collaborative: false,
    uri: '',
    external_urls: {},
    realAverageDurationSeconds: 200,
  },
];

const baseMixOptions = {
  totalSongs: 10,
  targetDuration: 200,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'Integration Mix',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: false,
  continueWhenPlaylistEmpty: false,
};

const baseRatio = {
  p1: { min: 0, max: 100, weight: 1, weightType: 'frequency' },
};

describe('PlaylistMixer integration-style flow', () => {
  let mockGeneratePreview: import('vitest').Mock;
  let mockUpdateTrackOrder: import('vitest').Mock;
  let mockCreatePlaylist: import('vitest').Mock;
  let mockGenerateMix: import('vitest').Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreatePlaylist = vi.fn().mockResolvedValue({ id: 'new-playlist' });
    mockGenerateMix = vi
      .fn()
      .mockResolvedValue([sampleTrack(1), sampleTrack(2)]);

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
    } as any);

    const previewState = {
      preview: { tracks: [sampleTrack(1)], stats: {}, totalDuration: 200 },
      loading: false,
      error: null,
      customTrackOrder: null,
    };

    mockUpdateTrackOrder = vi.fn();
    mockGeneratePreview = vi.fn().mockResolvedValue(undefined);

    mockUseMixPreview.mockReturnValue({
      state: previewState,
      generatePreview: mockGeneratePreview,
      updateTrackOrder: mockUpdateTrackOrder,
      clearPreview: vi.fn(),
      getPreviewTracks: vi.fn(() => previewState.preview!.tracks),
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);
  });

  it('generates a preview and creates playlist using preview tracks', async () => {
    const onMixedPlaylist = vi.fn();

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={vi.fn()}
        onMixedPlaylist={onMixedPlaylist}
        onError={vi.fn()}
      />
    );

    // generate preview
    const genBtn = screen.getByTestId('generate-preview-btn');
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(mockGeneratePreview).toHaveBeenCalled();
    });

    // create playlist should use preview tracks (getPreviewTracks mocked)
    const createBtn = screen.getByTestId('create-playlist-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith(
        baseMixOptions.playlistName,
        expect.any(Array)
      );
    });

    await waitFor(() => {
      expect(onMixedPlaylist).toHaveBeenCalled();
    });
  });
});
