import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  makeUseMixPreviewMock,
  makeUseMixGenerationMock,
} from '../../test-utils/mocks/mixHooks';
import { makePlaylistWithTracks } from '../../../src/test-utils/fixtures/playlistFactory';

import PlaylistMixer from '../../components/PlaylistMixer';

// IMPORTANT: mocks first (before importing PlaylistMixer)
jest.mock('../../hooks/useMixPreview', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixPreviewModule()
);
jest.mock('../../hooks/useMixGeneration', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixGenerationModule()
);

const getPreviewMock = () =>
  (require('../../hooks/useMixPreview') as any).useMixPreview()
    ._previewFn as jest.Mock;
const getMixMock = () =>
  (require('../../hooks/useMixGeneration') as any).useMixGeneration()
    ._mixFn as jest.Mock;

describe('Mixer error scenarios (hook-mocked)', () => {
  test('handles empty playlists with user-friendly error via hook error', async () => {
    const playlists = [
      makePlaylistWithTracks({ id: 'empty1' }, 0),
      makePlaylistWithTracks({ id: 'empty2' }, 0),
    ];

    const mockOnError = jest.fn();

    // Render and assert user-friendly message appears in UI
    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={playlists}
        ratioConfig={{} as any}
        mixOptions={{ playlistName: 'Empty Test', totalSongs: 10 } as any}
        updateMixOptions={() => {}}
        onError={mockOnError}
      />
    );

    // The UI should display a helpful warning about insufficient tracks
    const matches = screen.getAllByText(
      /Not enough content|not enough content|0 songs available/i
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  test('invalid ratio configuration triggers validation path (no crash)', async () => {
    const mockOnError = jest.fn();
    const playlist = makePlaylistWithTracks({ name: 'A' }, 3);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[playlist]}
        ratioConfig={{} as any}
        mixOptions={{ playlistName: 'Invalid Ratio', totalSongs: 3 } as any}
        updateMixOptions={() => {}}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/Generated Playlist|A/)).toBeInTheDocument();
  });
});
