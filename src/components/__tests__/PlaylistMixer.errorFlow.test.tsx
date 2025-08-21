import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';

jest.mock('../DndProvider', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(),
}));
jest.mock('../../hooks/useMixPreview', () => ({ useMixPreview: jest.fn() }));
jest.mock('../../hooks/useMixWarnings', () => ({ useMixWarnings: jest.fn() }));

const mockUseMixGeneration = useMixGeneration as jest.MockedFunction<
  typeof useMixGeneration
>;
const mockUseMixPreview = useMixPreview as jest.MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as jest.MockedFunction<
  typeof useMixWarnings
>;

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
  {
    id: 'p2',
    name: 'P2',
    images: [],
    tracks: { total: 2, href: '' },
    owner: { id: 'u2' },
    public: false,
    collaborative: false,
    uri: '',
    external_urls: {},
    realAverageDurationSeconds: 180,
  },
];

const baseMixOptions = {
  totalSongs: 3,
  targetDuration: 120,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'Error Mix',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: false,
  continueWhenPlaylistEmpty: false,
};
const baseRatio = {
  p1: { min: 0, max: 100, weight: 1, weightType: 'frequency' },
};

describe('PlaylistMixer error and edge flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows console error when createPlaylist throws', async () => {
    const createPlaylist = jest.fn().mockRejectedValue(new Error('boom'));
    mockUseMixGeneration.mockReturnValue({
      state: { loading: false, error: null, mixedTracks: [] },
      generateMix: jest.fn(),
      createPlaylist,
      reset: jest.fn(),
    } as any);

    mockUseMixPreview.mockReturnValue({
      state: { preview: null, loading: false, error: null },
      generatePreview: jest.fn(),
      updateTrackOrder: jest.fn(),
      clearPreview: jest.fn(),
      getPreviewTracks: jest.fn(() => []),
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={jest.fn()}
      />
    );

    // click create - should hit generateMix/createPlaylist path where createPlaylist rejects
    const createBtn = screen.getByRole('button', {
      name: /create this playlist/i,
    });
    fireEvent.click(createBtn);

    await waitFor(() => expect(createPlaylist).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
