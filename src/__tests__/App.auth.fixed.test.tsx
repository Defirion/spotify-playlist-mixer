import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';
import * as spotifyAuth from '../services/spotifyAuth';

vi.spyOn(store, 'useAuth') as any;
vi.spyOn(store, 'usePlaylistSelection') as any;
vi.spyOn(store, 'useRatioConfig') as any;
vi.spyOn(store, 'useMixOptions') as any;
vi.spyOn(store, 'useUI') as any;

vi.mock('../services/spotifyAuth', async () => ({
  ...(await vi.importActual('../services/spotifyAuth')),
  completeAuthorization: vi.fn(),
}));

describe('App auth code callback handling (fixed file)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test-client-id';
    window.history.replaceState({}, '', '/');
  });

  it('exchanges the authorization code and stores the tokens when not authenticated', async () => {
    const setAccessToken = vi.fn();
    const setTokens = vi.fn();
    const fakeTokens = {
      accessToken: 'FAKE_TOKEN',
      refreshToken: 'FAKE_REFRESH',
      expiresAt: Date.now() + 3600_000,
    };
    (
      spotifyAuth.completeAuthorization as import('vitest').Mock
    ).mockResolvedValue(fakeTokens);

    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAccessToken,
      setTokens,
      clearAuth: vi.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection: vi.fn(),
      clearAllPlaylists: vi.fn(),
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk: vi.fn(),
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: vi.fn(),
      applyPresetOptions: vi.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: vi.fn(),
      addMixedPlaylist: vi.fn(),
    });

    window.history.replaceState({}, '', '/?code=FAKE_CODE&state=FAKE_STATE');

    render(<App />);

    await waitFor(() => {
      expect(setTokens).toHaveBeenCalledWith(fakeTokens);
    });
    expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'test-client-id',
        code: 'FAKE_CODE',
        state: 'FAKE_STATE',
      })
    );
    // one-time code is removed from the address bar
    expect(window.location.search).toBe('');
  });
});
