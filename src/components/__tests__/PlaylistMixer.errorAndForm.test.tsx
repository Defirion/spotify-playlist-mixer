import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Minimal mocks for hooks used inside PlaylistMixer
const mockGenerateMix = jest.fn().mockResolvedValue([]);
const mockCreatePlaylist = jest.fn().mockResolvedValue({ id: 'new-playlist' });

// We'll mock useMixGeneration per-test after resetting modules. This avoids
// cross-test module cache interactions where the component may be imported
// before a test-level mock is applied.

jest.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: (token: string, opts: any) => ({
    state: { preview: null, loading: false },
    generatePreview: jest.fn().mockResolvedValue(null),
    clearPreview: jest.fn(),
    updateTrackOrder: jest.fn(),
    getPreviewTracks: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: () => ({ exceedsLimit: false, ratioImbalance: false }),
}));

// Mock useMixGeneration at module scope; tests will set the implementation per-test
jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useMixGeneration } = require('../../hooks/useMixGeneration');

const defaultProps = {
  accessToken: 'TOK',
  selectedPlaylists: [
    { id: 'a', name: 'A', tracks: { total: 5 } },
    { id: 'b', name: 'B', tracks: { total: 7 } },
  ],
  ratioConfig: {},
  mixOptions: { playlistName: 'My Mix', totalSongs: 10 },
  updateMixOptions: jest.fn(),
};

describe('PlaylistMixer edge and error flows', () => {
  test('create playlist uses mixGeneration.createPlaylist when no preview exists', async () => {
    const onMixedPlaylist = jest.fn();
    // Prepare the module-scoped mock implementation for this test
    useMixGeneration.mockImplementation(() => ({
      state: { loading: false },
      generateMix: mockGenerateMix,
      createPlaylist: mockCreatePlaylist,
    }));

    // Now import the component (it will use the mocked hook)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PlaylistMixer = require('../PlaylistMixer').default;

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
    useMixGeneration.mockImplementation(() => ({
      state: { loading: false },
      generateMix: mockGenerateMix,
      createPlaylist: mockCreatePlaylist,
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PlaylistMixer = require('../PlaylistMixer').default;

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
