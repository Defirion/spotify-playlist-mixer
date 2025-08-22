import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';

jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;

describe('App auth hash handling (fixed file)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses access token from hash and calls setAccessToken when not authenticated', () => {
    const setAccessToken = jest.fn();
    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      isAuthenticated: false,
      setAccessToken,
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
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
    });

    const originalHash = window.location.hash;
    window.location.hash = '#access_token=FAKE_TOKEN';

    render(<App />);

    expect(setAccessToken).toHaveBeenCalledWith('FAKE_TOKEN');

    window.location.hash = originalHash;
  });
});
