import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { SpotifyPlaylist, MixOptions, RatioConfig } from '../../types';

// Mock the hooks
jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(() => ({
    state: {
      loading: false,
      error: null,
      mixedTracks: [],
      exhaustedPlaylists: [],
      stoppedEarly: false,
    },
    generateMix: jest.fn(),
    createPlaylist: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: jest.fn(() => ({
    state: {
      preview: null,
      loading: false,
      error: null,
      customTrackOrder: null,
    },
    generatePreview: jest.fn(),
    updateTrackOrder: jest.fn(),
    clearPreview: jest.fn(),
    getPreviewTracks: jest.fn(() => []),
  })),
}));

jest.mock('../../hooks/useMixOptions', () => ({
  useMixOptions: jest.fn(() => ({
    mixOptions: {
      totalSongs: 100,
      targetDuration: 240,
      useTimeLimit: false,
      useAllSongs: true,
      playlistName: 'My Mixed Playlist',
      shuffleWithinGroups: true,
      popularityStrategy: 'mixed',
      recencyBoost: true,
      continueWhenPlaylistEmpty: false,
    },
    updateMixOptions: jest.fn(),
    resetMixOptions: jest.fn(),
    applyPresetOptions: jest.fn(),
  })),
}));

// Mock the child components
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
    onMixedPlaylist: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    render(<PlaylistMixer {...defaultProps} />);

    const input = screen.getByTestId('playlist-name-input');
    fireEvent.change(input, { target: { value: 'New Playlist Name' } });

    expect(input).toHaveValue('New Playlist Name');
  });

  it('calls generate preview when button is clicked', () => {
    const { useMixPreview } = require('../../hooks/useMixPreview');
    const mockGeneratePreview = jest.fn();
    useMixPreview.mockReturnValue({
      state: {
        preview: null,
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: mockGeneratePreview,
      updateTrackOrder: jest.fn(),
      clearPreview: jest.fn(),
      getPreviewTracks: jest.fn(() => []),
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
    const { useMixGeneration } = require('../../hooks/useMixGeneration');
    const mockCreatePlaylist = jest
      .fn()
      .mockResolvedValue({ id: 'new-playlist' });
    const mockGenerateMix = jest.fn().mockResolvedValue([]);

    useMixGeneration.mockReturnValue({
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

  it('syncs local mix options with prop changes', () => {
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
