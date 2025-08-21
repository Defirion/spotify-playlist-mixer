import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';
// Mock child components to expose test hooks and buttons
jest.mock('../features/mixer/PlaylistForm', () => {
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
});

jest.mock('../features/mixer/MixPreview', () => {
  return function MockMixPreview({ tracks }: any) {
    return (
      <div data-testid="mix-preview">{tracks.length} tracks in preview</div>
    );
  };
});

jest.mock('../features/mixer/MixControls', () => {
  return function MockMixControls({
    onGeneratePreview,
    onCreatePlaylist,
  }: any) {
    return (
      <div data-testid="mix-controls">
        <button data-testid="generate-preview-btn" onClick={onGeneratePreview}>
          Generate Preview
        </button>
        <button data-testid="create-playlist-btn" onClick={onCreatePlaylist}>
          Create Playlist
        </button>
      </div>
    );
  };
});

jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(),
}));

jest.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: jest.fn(),
}));

jest.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: jest.fn(),
}));

const mockUseMixGeneration = useMixGeneration as jest.MockedFunction<
  typeof useMixGeneration
>;
const mockUseMixPreview = useMixPreview as jest.MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as jest.MockedFunction<
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
  let mockGeneratePreview: jest.Mock;
  let mockUpdateTrackOrder: jest.Mock;
  let mockCreatePlaylist: jest.Mock;
  let mockGenerateMix: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreatePlaylist = jest.fn().mockResolvedValue({ id: 'new-playlist' });
    mockGenerateMix = jest
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
      reset: jest.fn(),
    } as any);

    const previewState = {
      preview: { tracks: [sampleTrack(1)], stats: {}, totalDuration: 200 },
      loading: false,
      error: null,
      customTrackOrder: null,
    };

    mockUpdateTrackOrder = jest.fn();
    mockGeneratePreview = jest.fn().mockResolvedValue(undefined);

    mockUseMixPreview.mockReturnValue({
      state: previewState,
      generatePreview: mockGeneratePreview,
      updateTrackOrder: mockUpdateTrackOrder,
      clearPreview: jest.fn(),
      getPreviewTracks: jest.fn(() => previewState.preview!.tracks),
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);
  });

  it('generates a preview and creates playlist using preview tracks', async () => {
    const onMixedPlaylist = jest.fn();

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={jest.fn()}
        onMixedPlaylist={onMixedPlaylist}
        onError={jest.fn()}
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
