import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { useMixGeneration } from '../../hooks/useMixGeneration';

// Minimal mocks for hooks used inside PlaylistMixer
const mockGenerateMix = vi.fn().mockResolvedValue([]);
const mockCreatePlaylist = vi.fn().mockResolvedValue({ id: 'new-playlist' });

// We'll mock useMixGeneration per-test after resetting modules. This avoids
// cross-test module cache interactions where the component may be imported
// before a test-level mock is applied.

vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: (token: string, opts: any) => ({
    state: { preview: null, loading: false },
    generatePreview: vi.fn().mockResolvedValue(null),
    clearPreview: vi.fn(),
    updateTrackOrder: vi.fn(),
    getPreviewTracks: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: () => ({ exceedsLimit: false, ratioImbalance: false }),
}));

// Mock useMixGeneration at module scope; tests will set the implementation per-test
vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));

const defaultProps: any = {
  accessToken: 'TOK',
  selectedPlaylists: [
    { id: 'a', name: 'A', tracks: { total: 5 } },
    { id: 'b', name: 'B', tracks: { total: 7 } },
  ] as any,
  ratioConfig: {},
  mixOptions: { playlistName: 'My Mix', totalSongs: 10 },
  updateMixOptions: vi.fn(),
};

describe('PlaylistMixer edge and error flows', () => {
  let consoleErrorSpy: any;
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore?.();
  });
  test('create playlist uses mixGeneration.createPlaylist when no preview exists', async () => {
    const onMixedPlaylist = vi.fn();
    // Prepare the module-scoped mock implementation for this test
    vi.mocked(useMixGeneration).mockImplementation(
      () =>
        ({
          state: { loading: false },
          generateMix: mockGenerateMix,
          createPlaylist: mockCreatePlaylist,
        }) as any
    );

    // Now import the component (it will use the mocked hook)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PlaylistMixer = (await import('../PlaylistMixer')).default;

    render(
      <PlaylistMixer {...defaultProps} onMixedPlaylist={onMixedPlaylist} />
    );

    // Create button should be enabled because playlistName and two playlists present
    const createButton = screen.getByText(/Create This Playlist/i);
    fireEvent.click(createButton);

    await waitFor(() => expect(onMixedPlaylist).toHaveBeenCalled());
  });

  test('handles mix generation error gracefully', async () => {
    // Replace generateMix to throw
    mockGenerateMix.mockRejectedValueOnce(new Error('boom'));
    vi.mocked(useMixGeneration).mockImplementation(
      () =>
        ({
          state: { loading: false },
          generateMix: mockGenerateMix,
          createPlaylist: mockCreatePlaylist,
        }) as any
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PlaylistMixer = (await import('../PlaylistMixer')).default;

    render(<PlaylistMixer {...defaultProps} />);

    // There may be multiple buttons rendered (portals); pick the first visible
    const matches = screen.getAllByText(/Create This Playlist/i);
    const visible =
      matches.find((el: HTMLElement) => el.offsetParent !== null) || matches[0];
    fireEvent.click(visible);

    // Nothing to assert UI-wise (error caught), but ensure generateMix was called
    await waitFor(() => expect(mockGenerateMix).toHaveBeenCalled());
  });
});
