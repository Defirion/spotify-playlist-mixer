import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';

jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;

describe('App state handlers (integration surface)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls clearAllPlaylists when user clicks Clear All in PlaylistSelector', () => {
    const clearAllPlaylists = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p1', name: 'P1', tracks: { total: 1 } }],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists,
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

    render(<App />);

    // The PlaylistSelector renders a "Clear All" button when playlists exist
    const clearBtn = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearBtn);

    expect(clearAllPlaylists).toHaveBeenCalled();
  });
});
