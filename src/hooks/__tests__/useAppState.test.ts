import { renderHook, act } from '@testing-library/react';
import { useAppState } from '../useAppState';
import { SpotifyPlaylist } from '../../types/spotify';

describe('useAppState', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useAppState());

    expect(result.current.accessToken).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.mixedPlaylists).toEqual([]);
  });

  it('sets access token', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setAccessToken('test-token');
    });

    expect(result.current.accessToken).toBe('test-token');
  });

  it('sets and dismisses error', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.error).toBe(null);
  });

  it('adds mixed playlist with generated ID and timestamp', () => {
    const { result } = renderHook(() => useAppState());

    const mockPlaylist: SpotifyPlaylist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      description: null,
      images: [],
      tracks: { total: 0, href: '' },
      owner: {
        id: 'user-1',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      public: true,
      collaborative: false,
      uri: 'spotify:playlist:playlist-1',
      external_urls: { spotify: '' },
    };

    act(() => {
      result.current.addMixedPlaylist(mockPlaylist);
    });

    expect(result.current.mixedPlaylists).toHaveLength(1);

    const addedPlaylist = result.current.mixedPlaylists[0];
    expect(addedPlaylist.id).toBe('playlist-1');
    expect(addedPlaylist.name).toBe('Test Playlist');
    expect(addedPlaylist.toastId).toBeDefined();
    expect(addedPlaylist.createdAt).toBeInstanceOf(Date);
  });

  it('adds multiple mixed playlists in correct order', () => {
    const { result } = renderHook(() => useAppState());

    const playlist1: SpotifyPlaylist = {
      id: '1',
      name: 'Playlist 1',
      description: null,
      images: [],
      tracks: { total: 0, href: '' },
      owner: {
        id: 'user-1',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      public: true,
      collaborative: false,
      uri: 'spotify:playlist:1',
      external_urls: { spotify: '' },
    };

    const playlist2: SpotifyPlaylist = {
      id: '2',
      name: 'Playlist 2',
      description: null,
      images: [],
      tracks: { total: 0, href: '' },
      owner: {
        id: 'user-1',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      public: true,
      collaborative: false,
      uri: 'spotify:playlist:2',
      external_urls: { spotify: '' },
    };

    act(() => {
      result.current.addMixedPlaylist(playlist1);
    });

    act(() => {
      result.current.addMixedPlaylist(playlist2);
    });

    expect(result.current.mixedPlaylists).toHaveLength(2);
    // Most recent should be first
    expect(result.current.mixedPlaylists[0].id).toBe('2');
    expect(result.current.mixedPlaylists[1].id).toBe('1');
  });

  it('dismisses success toast by ID', () => {
    const { result } = renderHook(() => useAppState());

    const playlist1: SpotifyPlaylist = {
      id: '1',
      name: 'Playlist 1',
      description: null,
      images: [],
      tracks: { total: 0, href: '' },
      owner: {
        id: 'user-1',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      public: true,
      collaborative: false,
      uri: 'spotify:playlist:1',
      external_urls: { spotify: '' },
    };

    const playlist2: SpotifyPlaylist = {
      id: '2',
      name: 'Playlist 2',
      description: null,
      images: [],
      tracks: { total: 0, href: '' },
      owner: {
        id: 'user-1',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      public: true,
      collaborative: false,
      uri: 'spotify:playlist:2',
      external_urls: { spotify: '' },
    };

    act(() => {
      result.current.addMixedPlaylist(playlist1);
      result.current.addMixedPlaylist(playlist2);
    });

    const toastIdToRemove = result.current.mixedPlaylists[0].toastId;

    act(() => {
      result.current.dismissSuccessToast(toastIdToRemove);
    });

    expect(result.current.mixedPlaylists).toHaveLength(1);
    expect(result.current.mixedPlaylists[0].id).toBe('1');
  });
});
