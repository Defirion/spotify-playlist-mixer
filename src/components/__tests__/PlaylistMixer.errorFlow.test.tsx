import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';

vi.mock('../DndProvider', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));
vi.mock('../../hooks/useMixPreview', () => ({ useMixPreview: vi.fn() }));
vi.mock('../../hooks/useMixWarnings', () => ({ useMixWarnings: vi.fn() }));

const mockUseMixGeneration =
  useMixGeneration as import('vitest').MockedFunction<typeof useMixGeneration>;
const mockUseMixPreview = useMixPreview as import('vitest').MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as import('vitest').MockedFunction<
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
    vi.clearAllMocks();
  });

  it('recovers without crashing when createPlaylist throws', async () => {
    const createPlaylist = vi.fn().mockRejectedValue(new Error('boom'));
    mockUseMixGeneration.mockReturnValue({
      state: { loading: false, error: null, mixedTracks: [] },
      generateMix: vi.fn(),
      createPlaylist,
      reset: vi.fn(),
    } as any);

    mockUseMixPreview.mockReturnValue({
      state: { preview: null, loading: false, error: null },
      generatePreview: vi.fn(),
      updateTrackOrder: vi.fn(),
      clearPreview: vi.fn(),
      getPreviewTracks: vi.fn(() => []),
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);

    // Keep the expected rejection from polluting test output.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={vi.fn()}
      />
    );

    // click create - should hit generateMix/createPlaylist path where createPlaylist rejects
    const createBtn = screen.getByRole('button', {
      name: /create this playlist/i,
    });
    fireEvent.click(createBtn);

    await waitFor(() => expect(createPlaylist).toHaveBeenCalled());
    // The rejection is caught: the component stays mounted and usable.
    expect(
      screen.getByRole('button', { name: /create this playlist/i })
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
