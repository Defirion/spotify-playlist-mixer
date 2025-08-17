import React from 'react';
import { render, screen } from '@testing-library/react';
// using inline mock factories in-place; legacy helpers omitted
import { makePlaylistWithTracks } from '../../test-utils/fixtures/playlistFactory';

import PlaylistMixer from '../../components/PlaylistMixer';

// Register mocks before importing PlaylistMixer using inline factories
jest.mock('../../hooks/useMixPreview', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixPreviewModule(
    async (cfg: any) => {
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
      const tracks = cfg.playlists.flatMap((p: any) => p._resolvedTracks || []);
      return { tracks };
    }
  )
);

const previewFn = () =>
  (require('../../hooks/useMixPreview') as any).useMixPreview()
    ._previewFn as jest.Mock;
const mixFn = () =>
  (require('../../hooks/useMixGeneration') as any).useMixGeneration()
    ._mixFn as jest.Mock;

describe('Playlist size variants (hook-mocked)', () => {
  test('small playlists (few tracks) render and expose hooks', () => {
    const p1 = makePlaylistWithTracks({ name: 'Small 1' }, 3);
    const p2 = makePlaylistWithTracks({ name: 'Small 2' }, 2);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[p1, p2]}
        ratioConfig={{} as any}
        mixOptions={{ playlistName: 'Small Mix', totalSongs: 4 } as any}
        updateMixOptions={() => {}}
        onError={() => {}}
        onMixedPlaylist={() => {}}
      />
    );

    // Basic smoke assertions: form rendered and hooks are wired
    expect(
      screen.getByRole('button', { name: /generate preview/i })
    ).toBeInTheDocument();
    expect(typeof previewFn()).toBe('function');
    expect(typeof mixFn()).toBe('function');
  });

  test('medium playlists (tens of tracks) render', () => {
    const p1 = makePlaylistWithTracks({ name: 'Medium 1' }, 15);
    const p2 = makePlaylistWithTracks({ name: 'Medium 2' }, 20);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[p1, p2]}
        ratioConfig={{} as any}
        mixOptions={{ playlistName: 'Medium Mix', totalSongs: 10 } as any}
        updateMixOptions={() => {}}
        onError={() => {}}
        onMixedPlaylist={() => {}}
      />
    );

    // Form present for medium mix
    expect(
      screen.getByRole('button', { name: /generate preview/i })
    ).toBeInTheDocument();
  });
});
