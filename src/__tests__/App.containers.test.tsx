import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as store from '../store';

import { RatioConfigContainer, PlaylistMixerContainer } from '../App';

jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'useUI') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'setUIError') as any;

// Mock RatioConfig to expose a remove callback
jest.mock('../components/RatioConfig', () => (props: any) => {
  return (
    <div>
      {props.selectedPlaylists &&
        props.selectedPlaylists.map((p: any) => (
          <div key={p.id}>
            <span>{p.name}</span>
            <button
              onClick={() =>
                props.onPlaylistRemove && props.onPlaylistRemove(p.id)
              }
            >
              Remove
            </button>
          </div>
        ))}
    </div>
  );
});

// Mock PlaylistMixer to expose its onError prop
jest.mock('../components/PlaylistMixer', () => (props: any) => {
  return (
    <div>
      <button onClick={() => props.onError && props.onError('err')}>
        Trigger Error
      </button>
    </div>
  );
});

describe('Exported containers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('RatioConfigContainer calls togglePlaylistSelection when removing a playlist', () => {
    const togglePlaylistSelection = jest.fn();

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [{ id: 'r1', name: 'R1' }],
      togglePlaylistSelection,
      clearAllPlaylists: jest.fn(),
    });

    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      updateRatioConfig: jest.fn(),
    });

    render(<RatioConfigContainer />);

    const btn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(btn);

    expect(togglePlaylistSelection).toHaveBeenCalledWith({
      id: 'r1',
      name: 'R1',
    });
  });

  it('PlaylistMixerContainer calls setUIError when onError is triggered', () => {
    const addMixedPlaylist = jest.fn();
    const setUIError = jest.spyOn(store, 'setUIError');

    (store.useAuth as any).mockReturnValue({ accessToken: 't' });

    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ],
    });

    (store.useRatioConfig as any).mockReturnValue({ ratioConfig: {} });

    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: jest.fn(),
    });

    (store.useUI as any).mockReturnValue({ addMixedPlaylist });

    render(<PlaylistMixerContainer />);

    const btn = screen.getByRole('button', { name: /trigger error/i });
    fireEvent.click(btn);

    expect(setUIError).toHaveBeenCalled();
  });
});
