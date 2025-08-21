import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';

// We'll simulate the hash-based token flow when not authenticated
jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;

describe('App auth hash handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses access token from hash and calls setAccessToken when not authenticated', () => {
    const setAccessToken = jest.fn();
    // not authenticated initially
    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      isAuthenticated: false,
      setAccessToken,
      clearAuth: jest.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk: jest.fn(),
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: { playlistName: 'x' },
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
    });

    // set window hash to include access_token
    const originalHash = window.location.hash;
    window.location.hash = '#access_token=FAKE_TOKEN&token_type=Bearer';

    render(<App />);

    // setAccessToken should have been called with the token (after effect runs)
    expect(setAccessToken).toHaveBeenCalledWith('FAKE_TOKEN');

    // restore
    window.location.hash = originalHash;
  });
});
