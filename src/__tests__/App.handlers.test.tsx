import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import App from '../App';
import * as store from '../store';
import * as spotifyAuth from '../services/spotifyAuth';

// Mock the auth service so no real token exchange happens
vi.mock('../services/spotifyAuth', async () => ({
  ...(await vi.importActual('../services/spotifyAuth')),
  completeAuthorization: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Mock the heavy child components so we can trigger the callbacks provided by App
vi.mock('../components/PlaylistSelector', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <button
          onClick={() => props.onPlaylistSelect({ id: 'p-mock', name: 'Mock' })}
        >
          Select Mock Playlist
        </button>
        <button onClick={() => props.onClearAll && props.onClearAll()}>
          Clear All Mock
        </button>
      </div>
    );
  },
}));

vi.mock('../components/PresetTemplates', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <button
          aria-label="Apply Mock preset"
          onClick={() =>
            props.onApplyPreset &&
            props.onApplyPreset({
              ratioConfig: {
                'p-mock': {
                  min: 1,
                  max: 2,
                  weight: 1,
                  weightType: 'frequency',
                },
              },
              strategy: 'mid-peak',
              settings: { recencyBoost: true },
              presetName: 'Mock Preset',
            })
          }
        >
          Apply Mock Preset
        </button>
      </div>
    );
  },
}));

// Mock ToastError to expose a dismiss button that calls provided onDismiss
vi.mock('../components/ToastError', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        {props.error && (
          <button onClick={() => props.onDismiss && props.onDismiss()}>
            Dismiss Error
          </button>
        )}
      </div>
    );
  },
}));

// Mock SuccessToast to expose a dismiss action
vi.mock('../components/SuccessToast', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        {props.mixedPlaylists && (
          <button onClick={() => props.onDismiss && props.onDismiss('id')}>
            Dismiss Success
          </button>
        )}
      </div>
    );
  },
}));

// Mock PlaylistMixer to call onMixedPlaylist when its mock button is clicked
vi.mock('../components/PlaylistMixer', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <button
          onClick={() =>
            props.onMixedPlaylist && props.onMixedPlaylist({ id: 'mixed-1' })
          }
        >
          Trigger Mixed
        </button>
      </div>
    );
  },
}));

vi.spyOn(store, 'useAuth') as any;
vi.spyOn(store, 'usePlaylistSelection') as any;
vi.spyOn(store, 'useRatioConfig') as any;
vi.spyOn(store, 'useMixOptions') as any;
vi.spyOn(store, 'useUI') as any;
vi.spyOn(store, 'setUIError') as any;

describe('App handlers (direct callback surface)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges ?code= from window.location.search and calls setTokens', async () => {
    const setTokens = vi.fn();
    const fakeTokens = {
      accessToken: 'devtoken123',
      refreshToken: 'devrefresh',
      expiresAt: Date.now() + 3600_000,
    };
    (
      spotifyAuth.completeAuthorization as import('vitest').Mock
    ).mockResolvedValue(fakeTokens);

    // simulate OAuth redirect query params
    window.history.replaceState({}, '', '/?code=devcode123&state=devstate');

    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAccessToken: vi.fn(),
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
      dismissSuccessToast: vi.fn(),
    });

    const prevClientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test-client-id';

    render(<App />);

    await waitFor(() => {
      expect(setTokens).toHaveBeenCalledWith(fakeTokens);
    });
    expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'devcode123', state: 'devstate' })
    );
    expect(window.location.search).toBe('');

    // restore
    window.history.replaceState({}, '', '/');
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = prevClientId;
  });

  it('calls togglePlaylistSelection when PlaylistSelector triggers selection', () => {
    const togglePlaylistSelection = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection,
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
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    const selectBtn = screen.getByRole('button', {
      name: /select mock playlist/i,
    });
    fireEvent.click(selectBtn);

    expect(togglePlaylistSelection).toHaveBeenCalledWith({
      id: 'p-mock',
      name: 'Mock',
    });
  });

  it('applies preset: calls setRatioConfigBulk and applyPresetOptions and clears UI error when present', () => {
    const setRatioConfigBulk = vi.fn();
    const applyPresetOptions = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p-mock', name: 'Mock', tracks: { total: 1 } }],
      togglePlaylistSelection: vi.fn(),
      clearAllPlaylists: vi.fn(),
    });

    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk,
    });

    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: vi.fn(),
      applyPresetOptions,
    });

    (store.useUI as any).mockReturnValue({
      error: { message: 'previous error' },
      mixedPlaylists: [],
      dismissError: vi.fn(),
      addMixedPlaylist: vi.fn(),
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    const applyBtn = screen.getByRole('button', { name: /apply mock preset/i });
    fireEvent.click(applyBtn);

    expect(setRatioConfigBulk).toHaveBeenCalledWith({
      'p-mock': { min: 1, max: 2, weight: 1, weightType: 'frequency' },
    });
    expect(applyPresetOptions).toHaveBeenCalledWith({
      strategy: 'mid-peak',
      settings: { recencyBoost: true },
      presetName: 'Mock Preset',
    });
    expect(store.setUIError).toHaveBeenCalledWith(null);
  });

  it('dismisses error when ToastError dismiss is triggered', () => {
    const dismissError = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
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
      error: { message: 'err' },
      mixedPlaylists: [],
      dismissError,
      addMixedPlaylist: vi.fn(),
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(btn);

    expect(dismissError).toHaveBeenCalled();
  });

  it('dismisses success toast when SuccessToast dismiss is triggered', () => {
    const dismissSuccessToast = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p1', name: 'P1', tracks: { total: 1 } }],
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
      mixedPlaylists: ['m1'],
      dismissError: vi.fn(),
      addMixedPlaylist: vi.fn(),
      dismissSuccessToast,
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /dismiss success/i });
    fireEvent.click(btn);

    expect(dismissSuccessToast).toHaveBeenCalledWith('');
  });

  it('forwards onMixedPlaylist from PlaylistMixer to addMixedPlaylist', () => {
    const addMixedPlaylist = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [
        { id: 'p1', name: 'P1', tracks: { total: 1 } },
        { id: 'p2', name: 'P2', tracks: { total: 1 } },
      ],
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
      addMixedPlaylist,
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /trigger mixed/i });
    fireEvent.click(btn);

    expect(addMixedPlaylist).toHaveBeenCalledWith({ id: 'mixed-1' });
  });

  it('does NOT call setUIError when applying a preset and there is no UI error', () => {
    const setRatioConfigBulk = vi.fn();
    const applyPresetOptions = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p-mock', name: 'Mock', tracks: { total: 1 } }],
      togglePlaylistSelection: vi.fn(),
      clearAllPlaylists: vi.fn(),
    });

    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk,
    });

    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: vi.fn(),
      applyPresetOptions,
    });

    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: vi.fn(),
      addMixedPlaylist: vi.fn(),
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    const applyBtn = screen.getByRole('button', { name: /apply mock preset/i });
    fireEvent.click(applyBtn);

    // setUIError should not be called when there is no error present
    expect(store.setUIError).not.toHaveBeenCalled();
  });

  it('surfaces an error via setUIError when Spotify redirects back with ?error=', () => {
    window.history.replaceState({}, '', '/?error=access_denied');

    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAccessToken: vi.fn(),
      setTokens: vi.fn(),
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
      dismissSuccessToast: vi.fn(),
    });

    render(<App />);

    expect(store.setUIError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Spotify authorization failed: access_denied',
      })
    );
    expect(spotifyAuth.completeAuthorization).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');

    // restore
    window.history.replaceState({}, '', '/');
  });
});
