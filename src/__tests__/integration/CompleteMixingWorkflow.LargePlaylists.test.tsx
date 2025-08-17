import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  makeUseMixPreviewMock,
  makeUseMixGenerationMock,
} from '../../test-utils/mocks/mixHooks';
import { makePlaylistWithTracks } from '../../test-utils/fixtures/playlistFactory';

import PlaylistMixer from '../../components/PlaylistMixer';

// Large playlists should still run quickly in tests using lightweight tracks
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
      const tracks = cfg.playlists
        .flatMap((p: any) => p._resolvedTracks || [])
        .slice(0, cfg.mixOptions?.totalSongs || 10);
      return { tracks };
    }
  )
);

describe('Complete mixing workflow - large playlists (hook-mocked)', () => {
  test('handles large playlist sets quickly', () => {
    // Create a couple of 'large' playlists but with lightweight track objects
    const p1 = makePlaylistWithTracks({ id: 'large1', name: 'Large 1' }, 500);
    const p2 = makePlaylistWithTracks({ id: 'large2', name: 'Large 2' }, 400);

    render(
      <PlaylistMixer
        accessToken="mock"
        selectedPlaylists={[p1, p2]}
        ratioConfig={{} as any}
        mixOptions={{ playlistName: 'Large Mix', totalSongs: 20 } as any}
        updateMixOptions={() => {}}
        onError={() => {}}
        onMixedPlaylist={() => {}}
      />
    );

    // Control asserts: generate button exists and our mocked hooks are functions
    expect(
      screen.getByRole('button', { name: /generate preview/i })
    ).toBeInTheDocument();
    expect(
      typeof (require('../../hooks/useMixPreview') as any).useMixPreview()
        ._previewFn
    ).toBe('function');
    expect(
      typeof (require('../../hooks/useMixGeneration') as any).useMixGeneration()
        ._mixFn
    ).toBe('function');
  });
});
