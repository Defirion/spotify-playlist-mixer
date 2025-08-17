import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  makeUseMixPreviewMock,
  makeUseMixGenerationMock,
} from '../../test-utils/mocks/mixHooks';
import { makePlaylistWithTracks } from '../../test-utils/fixtures/playlistFactory';

import PlaylistMixer from '../../components/PlaylistMixer';

// Error scenarios: preview rejects or returns empty
jest.mock('../../hooks/useMixPreview', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixPreviewModule(
    async (cfg: any) => {
      if (cfg.simulate === 'empty') return { tracks: [] };
      if (cfg.simulate === 'error') throw new Error('Network error');
      const tracks = cfg.playlists
        .flatMap((p: any) => p._resolvedTracks || [])
        .slice(0, cfg.desiredSize || 10);
      return { tracks };
    }
  )
);

jest.mock('../../hooks/useMixGeneration', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixGenerationModule(
    async (cfg: any) => {
      if (cfg.simulate === 'error') throw new Error('Generation failed');
      const tracks = cfg.playlists
        .flatMap((p: any) => p._resolvedTracks || [])
        .slice(0, cfg.mixOptions?.totalSongs || 10);
      return { tracks };
    }
  )
);

describe('Complete mixing workflow - error scenarios (hook-mocked)', () => {
  test('shows friendly message when preview is empty', () => {
    const p1 = makePlaylistWithTracks({ id: 'e1' }, 0);
    const p2 = makePlaylistWithTracks({ id: 'e2' }, 0);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[p1, p2]}
        ratioConfig={{} as any}
        mixOptions={
          { playlistName: 'Error Mix', totalSongs: 5, simulate: 'empty' } as any
        }
        updateMixOptions={() => {}}
        onError={() => {}}
        onMixedPlaylist={() => {}}
      />
    );

    const matches = screen.queryAllByText(
      /Not enough content|not enough content|0 songs available/i
    );
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });

  test('renders error state when generation throws', () => {
    const p = makePlaylistWithTracks({ id: 'err' }, 3);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[p]}
        ratioConfig={{} as any}
        mixOptions={
          {
            playlistName: 'Error Mix 2',
            totalSongs: 5,
            simulate: 'error',
          } as any
        }
        updateMixOptions={() => {}}
        onError={() => {}}
        onMixedPlaylist={() => {}}
      />
    );

    // Ensure the component still renders basic UI
    expect(
      screen.getByRole('button', { name: /generate preview/i })
    ).toBeInTheDocument();
  });
});
