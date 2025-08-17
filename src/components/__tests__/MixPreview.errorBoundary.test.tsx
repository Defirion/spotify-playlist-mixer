import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';

// Mock hooks used by PlaylistMixer
jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(),
}));

jest.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: jest.fn(),
}));

jest.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: jest.fn(),
}));

// Mock MixPreview to throw when rendered
jest.mock('../features/mixer/MixPreview', () => {
  return function ThrowingMixPreview() {
    throw new Error('Test throw from MixPreview');
  };
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
    shuffleWithinGroups: false,
    popularityStrategy: 'mixed',
    recencyBoost: false,
    continueWhenPlaylistEmpty: false,
  },
  updateMixOptions: jest.fn(),
  onMixedPlaylist: jest.fn(),
  onError: jest.fn(),
};

describe('MixPreview ErrorBoundary integration', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Silence expected React error logs during test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { useMixGeneration } = require('../../hooks/useMixGeneration');
    const { useMixPreview } = require('../../hooks/useMixPreview');
    const { useMixWarnings } = require('../../hooks/useMixWarnings');

    useMixGeneration.mockReturnValue({
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
    });

    // Provide a non-null preview so PlaylistMixer attempts to render MixPreview
    useMixPreview.mockReturnValue({
      state: {
        preview: {
          tracks: [{ id: 't1', instanceId: 'i1' }],
          stats: {},
          totalDuration: 0,
        },
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: jest.fn(),
      updateTrackOrder: jest.fn(),
      clearPreview: jest.fn(),
      getPreviewTracks: jest.fn(() => []),
    });

    useMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetAllMocks();
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
