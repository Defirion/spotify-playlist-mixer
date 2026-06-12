import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as store from '../store';

import { MainApp } from '../App';

vi.spyOn(store, 'useAuth') as any;
vi.spyOn(store, 'usePlaylistSelection') as any;
vi.spyOn(store, 'useRatioConfig') as any;
vi.spyOn(store, 'useMixOptions') as any;
vi.spyOn(store, 'useUI') as any;
vi.spyOn(store, 'setUIError') as any;

// Mock AppShell to capture props and render buttons that call them
vi.mock('../AppShell', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <button
          onClick={() =>
            props.onPlaylistSelect && props.onPlaylistSelect({ id: 'x' })
          }
        >
          Call onPlaylistSelect
        </button>
        <button onClick={() => props.onClearAll && props.onClearAll()}>
          Call onClearAll
        </button>
        <button
          onClick={() =>
            props.onApplyPreset &&
            props.onApplyPreset({
              ratioConfig: { x: { min: 1 } },
              strategy: 's',
              settings: {},
              presetName: 'p',
            })
          }
        >
          Call onApplyPreset
        </button>
        <button onClick={() => props.onDismissError && props.onDismissError()}>
          Call onDismissError
        </button>
        <button
          onClick={() => props.onDismissSuccess && props.onDismissSuccess()}
        >
          Call onDismissSuccess
        </button>
        <button
          onClick={() =>
            props.onMixedPlaylist && props.onMixedPlaylist({ id: 'm' })
          }
        >
          Call onMixedPlaylist
        </button>
      </div>
    );
  },
}));

describe('MainApp integration surface', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes all handlers and exercises handler branches', () => {
    const setAccessToken = vi.fn();
    const togglePlaylistSelection = vi.fn();
    const clearAllPlaylists = vi.fn();
    const setRatioConfigBulk = vi.fn();
    const applyPresetOptions = vi.fn();
    const dismissError = vi.fn();
    const dismissSuccessToast = vi.fn();
    const addMixedPlaylist = vi.fn();
    const updateMixOptions = vi.fn();

    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken,
      clearAuth: vi.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'p1', name: 'P1', tracks: { total: 1 } }],
      togglePlaylistSelection,
      clearAllPlaylists,
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk,
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions,
      applyPresetOptions,
    });
    (store.useUI as any).mockReturnValue({
      error: { message: 'err' },
      mixedPlaylists: [],
      dismissError,
      addMixedPlaylist,
      dismissSuccessToast,
    });

    render(<MainApp />);

    fireEvent.click(
      screen.getByRole('button', { name: /call onplaylistselect/i })
    );
    expect(togglePlaylistSelection).toHaveBeenCalledWith({ id: 'x' });

    fireEvent.click(screen.getByRole('button', { name: /call onclearall/i }));
    expect(clearAllPlaylists).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: /call onapplypreset/i })
    );
    expect(setRatioConfigBulk).toHaveBeenCalled();
    expect(applyPresetOptions).toHaveBeenCalled();
    expect(store.setUIError).toHaveBeenCalledWith(null);

    fireEvent.click(
      screen.getByRole('button', { name: /call ondismisserror/i })
    );
    expect(dismissError).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: /call ondismisssuccess/i })
    );
    expect(dismissSuccessToast).toHaveBeenCalledWith('');

    fireEvent.click(
      screen.getByRole('button', { name: /call onmixedplaylist/i })
    );
    expect(addMixedPlaylist).toHaveBeenCalledWith({ id: 'm' });
  });
});
