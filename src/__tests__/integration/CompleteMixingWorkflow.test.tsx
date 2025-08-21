import React from 'react';
/// <reference types="@testing-library/jest-dom" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// using inline mock factories below; legacy helpers omitted
// MSW removed; use local mocks only
// Component under test (use real hooks to exercise mixing logic)
import {
  mockPlaylists,
  mockTracks,
  mockUserProfile,
} from '../../mocks/fixtures';

import PlaylistMixer from '../../components/PlaylistMixer';

// MSW removed; no server started here

// Mock the SpotifyService class used by hooks so mixing flow runs deterministically
jest.mock('../../services/spotify', () => {
  return {
    __esModule: true,
    default: class MockSpotifyService {
      accessToken: string;
      constructor(token: string) {
        this.accessToken = token;
      }

      async getPlaylistTracks(playlistId: string) {
        return { tracks: mockTracks };
      }

      async getUserProfile() {
        return mockUserProfile;
      }

      async createPlaylist(userId: string, data: any) {
        return { id: 'created_playlist_1', name: data.name || 'created' };
      }

      async addTracksToPlaylist(playlistId: string, request: any) {
        return { snapshot_id: 'snapshot_123' };
      }
    },
  };
});

// Provide hook mocks via centralized helpers using inline factories
jest.mock('../../hooks/useMixPreview', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixPreviewModule(
    async (cfg: any) => {
      const tracks = (mockTracks || [])
        .slice(0, cfg.mixOptions?.totalSongs || 4)
        .map((t: any, i: number) => ({
          id: t.id || `m${i}`,
          uri: t.uri || `spotify:track:${t.id || i}`,
          duration_ms: t.duration_ms || 180000,
          sourcePlaylist:
            Object.keys(cfg.playlistTracks || {})[0] || 'playlist_1',
        }));
      (tracks as any).exhaustedPlaylists = [];
      (tracks as any).stoppedEarly = false;
      return tracks;
    }
  )
);

jest.mock('../../hooks/useMixGeneration', () =>
  require('../../test-utils/mocks/mixHooks').makeUseMixGenerationModule(
    async (cfg: any) => {
      const tracks = (mockTracks || [])
        .slice(0, cfg.mixOptions?.totalSongs || 4)
        .map((t: any, i: number) => ({
          id: t.id || `m${i}`,
          uri: t.uri || `spotify:track:${t.id || i}`,
          duration_ms: t.duration_ms || 180000,
          sourcePlaylist:
            Object.keys(cfg.playlistTracks || {})[0] || 'playlist_1',
        }));
      (tracks as any).exhaustedPlaylists = [];
      (tracks as any).stoppedEarly = false;
      return tracks;
    }
  )
);

describe('Complete mixing workflow (integration with MSW)', () => {
  const defaultProps = {
    accessToken: 'mock_access_token',
    // fixtures provide playlist-like objects; cast to satisfy PlaylistMixer props
    selectedPlaylists: mockPlaylists.slice(0, 2) as unknown as any,
    ratioConfig: {} as any,
    mixOptions: { playlistName: 'Integration Mix', totalSongs: 4 } as any,
    updateMixOptions: () => {},
  };

  it('generates a preview then creates a playlist successfully', async () => {
    const user = userEvent.setup();
    const onMixedPlaylist = jest.fn();

    render(
      <PlaylistMixer {...defaultProps} onMixedPlaylist={onMixedPlaylist} />
    );

    // Wait for UI to render the generate button
    const generateBtn = await screen.findByRole('button', {
      name: /generate preview/i,
    });
    expect(generateBtn).toBeInTheDocument();

    // Click generate preview to exercise the preview generation path
    await user.click(generateBtn);

    // Now click create playlist; handleCreatePlaylist will call generateMix when no preview exists
    const createBtn = screen.getByRole('button', {
      name: /create this playlist/i,
    });
    await user.click(createBtn);

    // Wait for onMixedPlaylist to be called with created playlist result
    await waitFor(() => {
      expect(onMixedPlaylist).toHaveBeenCalled();
    });

    const arg = onMixedPlaylist.mock.calls[0][0];
    expect(arg).toHaveProperty('id');
    expect(arg).toHaveProperty('name');
    expect(arg.name).toMatch(/Integration Mix|Mixed playlist|created/i);
  });
});
