import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import App from '../App';
import * as store from '../store';

// Mock the heavy child components so we can trigger the callbacks provided by App
jest.mock('../components/PlaylistSelector', () => (props: any) => {
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
});

jest.mock('../components/PresetTemplates', () => (props: any) => {
  return (
    <div>
      <button
        aria-label="Apply Mock preset"
        onClick={() =>
          props.onApplyPreset &&
          props.onApplyPreset({
            ratioConfig: {
              'p-mock': { min: 1, max: 2, weight: 1, weightType: 'frequency' },
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
});

// Mock ToastError to expose a dismiss button that calls provided onDismiss
jest.mock('../components/ToastError', () => (props: any) => {
  return (
    <div>
      {props.error && (
        <button onClick={() => props.onDismiss && props.onDismiss()}>
          Dismiss Error
        </button>
      )}
    </div>
  );
});

// Mock SuccessToast to expose a dismiss action
jest.mock('../components/SuccessToast', () => (props: any) => {
  return (
    <div>
      {props.mixedPlaylists && (
        <button onClick={() => props.onDismiss && props.onDismiss('id')}>
          Dismiss Success
        </button>
      )}
    </div>
  );
});

// Mock PlaylistMixer to call onMixedPlaylist when its mock button is clicked
jest.mock('../components/PlaylistMixer', () => (props: any) => {
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
});

jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;
jest.spyOn(store, 'setUIError') as any;

describe('App handlers (direct callback surface)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses access_token from window.location.hash and calls setAccessToken (dev logging path)', () => {
    const setAccessToken = jest.fn();

    // simulate OAuth redirect hash
    const originalHash = window.location.hash;
    window.location.hash = '#access_token=devtoken123&other=1';

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
      mixOptions: {},
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

    // enable dev debug branch
    const prevNodeEnv = process.env.NODE_ENV;
    const prevDebug = process.env.DEBUG_AUTH;
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_AUTH = '1';

    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    render(<App />);

    expect(setAccessToken).toHaveBeenCalledWith('devtoken123');
    expect(window.location.hash).toBe('');
    expect(debugSpy).toHaveBeenCalled();

    // restore
    window.location.hash = originalHash;
    process.env.NODE_ENV = prevNodeEnv;
    process.env.DEBUG_AUTH = prevDebug;
    debugSpy.mockRestore();
  });

  it('calls togglePlaylistSelection when PlaylistSelector triggers selection', () => {
    const togglePlaylistSelection = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection,
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
      dismissSuccessToast: jest.fn(),
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
    const setRatioConfigBulk = jest.fn();
    const applyPresetOptions = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p-mock', name: 'Mock', tracks: { total: 1 } }],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    });

    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk,
    });

    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions,
    });

    (store.useUI as any).mockReturnValue({
      error: { message: 'previous error' },
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
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
    const dismissError = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
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
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    });

    (store.useUI as any).mockReturnValue({
      error: { message: 'err' },
      mixedPlaylists: [],
      dismissError,
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(btn);

    expect(dismissError).toHaveBeenCalled();
  });

  it('dismisses success toast when SuccessToast dismiss is triggered', () => {
    const dismissSuccessToast = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p1', name: 'P1', tracks: { total: 1 } }],
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
      mixedPlaylists: ['m1'],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast,
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /dismiss success/i });
    fireEvent.click(btn);

    expect(dismissSuccessToast).toHaveBeenCalledWith('');
  });

  it('forwards onMixedPlaylist from PlaylistMixer to addMixedPlaylist', () => {
    const addMixedPlaylist = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [
        { id: 'p1', name: 'P1', tracks: { total: 1 } },
        { id: 'p2', name: 'P2', tracks: { total: 1 } },
      ],
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
      addMixedPlaylist,
      dismissSuccessToast: jest.fn(),
    });

    render(<App />);

    const btn = screen.getByRole('button', { name: /trigger mixed/i });
    fireEvent.click(btn);

    expect(addMixedPlaylist).toHaveBeenCalledWith({ id: 'mixed-1' });
  });

  it('does NOT call setUIError when applying a preset and there is no UI error', () => {
    const setRatioConfigBulk = jest.fn();
    const applyPresetOptions = jest.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p-mock', name: 'Mock', tracks: { total: 1 } }],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    });

    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk,
    });

    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions,
    });

    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
    });

    render(<App />);

    const applyBtn = screen.getByRole('button', { name: /apply mock preset/i });
    fireEvent.click(applyBtn);

    // setUIError should not be called when there is no error present
    expect(store.setUIError).not.toHaveBeenCalled();
  });

  it('parses short access_token from window.location.hash (no masking) and calls setAccessToken', () => {
    const setAccessToken = jest.fn();

    // simulate OAuth redirect hash with short token
    const originalHash = window.location.hash;
    window.location.hash = '#access_token=short&other=1';

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
      mixOptions: {},
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

    // enable dev debug branch
    const prevNodeEnv = process.env.NODE_ENV;
    const prevDebug = process.env.DEBUG_AUTH;
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_AUTH = '1';

    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    render(<App />);

    expect(setAccessToken).toHaveBeenCalledWith('short');
    expect(window.location.hash).toBe('');
    expect(debugSpy).toHaveBeenCalled();

    // restore
    window.location.hash = originalHash;
    process.env.NODE_ENV = prevNodeEnv;
    process.env.DEBUG_AUTH = prevDebug;
    debugSpy.mockRestore();
  });
});
