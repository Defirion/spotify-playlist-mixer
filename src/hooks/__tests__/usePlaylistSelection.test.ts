import { renderHook, act } from '@testing-library/react';
import { usePlaylistSelection } from '../usePlaylistSelection';
import { SpotifyPlaylist } from '../../types/spotify';

const mockPlaylist1: SpotifyPlaylist = {
  id: '1',
  name: 'Playlist 1',
  description: null,
  images: [],
  tracks: { total: 0, href: '' },
  owner: {
    id: 'user1',
    display_name: 'User 1',
    external_urls: { spotify: '' },
  },
  public: true,
  collaborative: false,
  uri: 'spotify:playlist:1',
  external_urls: { spotify: '' },
};

const mockPlaylist2: SpotifyPlaylist = {
  id: '2',
  name: 'Playlist 2',
  description: null,
  images: [],
  tracks: { total: 0, href: '' },
  owner: {
    id: 'user1',
    display_name: 'User 1',
    external_urls: { spotify: '' },
  },
  public: true,
  collaborative: false,
  uri: 'spotify:playlist:2',
  external_urls: { spotify: '' },
};

describe('usePlaylistSelection', () => {
  it('initializes with empty selection', () => {
    const { result } = renderHook(() => usePlaylistSelection());

    expect(result.current.selectedPlaylists).toEqual([]);
  });

  it('accepts initial playlists', () => {
    const { result } = renderHook(() => usePlaylistSelection([mockPlaylist1]));

    expect(result.current.selectedPlaylists).toEqual([mockPlaylist1]);
  });

  it('selects a playlist', () => {
    const { result } = renderHook(() => usePlaylistSelection());

    act(() => {
      result.current.selectPlaylist(mockPlaylist1);
    });

    expect(result.current.selectedPlaylists).toEqual([mockPlaylist1]);
  });

  it('does not duplicate playlist selection', () => {
    const { result } = renderHook(() => usePlaylistSelection());

    act(() => {
      result.current.selectPlaylist(mockPlaylist1);
      result.current.selectPlaylist(mockPlaylist1);
    });

    expect(result.current.selectedPlaylists).toEqual([mockPlaylist1]);
  });

  it('deselects a playlist', () => {
    const { result } = renderHook(() =>
      usePlaylistSelection([mockPlaylist1, mockPlaylist2])
    );

    act(() => {
      result.current.deselectPlaylist('1');
    });

    expect(result.current.selectedPlaylists).toEqual([mockPlaylist2]);
  });

  it('toggles playlist selection', () => {
    const { result } = renderHook(() => usePlaylistSelection());

    // Toggle on
    act(() => {
      result.current.togglePlaylistSelection(mockPlaylist1);
    });

    expect(result.current.selectedPlaylists).toEqual([mockPlaylist1]);

    // Toggle off
    act(() => {
      result.current.togglePlaylistSelection(mockPlaylist1);
    });

    expect(result.current.selectedPlaylists).toEqual([]);
  });

  it('clears all playlists', () => {
    const { result } = renderHook(() =>
      usePlaylistSelection([mockPlaylist1, mockPlaylist2])
    );

    act(() => {
      result.current.clearAllPlaylists();
    });

    expect(result.current.selectedPlaylists).toEqual([]);
  });

  it('checks if playlist is selected', () => {
    const { result } = renderHook(() => usePlaylistSelection([mockPlaylist1]));

    expect(result.current.isPlaylistSelected('1')).toBe(true);
    expect(result.current.isPlaylistSelected('2')).toBe(false);
  });
});
