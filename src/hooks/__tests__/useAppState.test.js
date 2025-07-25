import { renderHook, act } from '@testing-library/react';
import { useAppState } from '../useAppState';

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

    const mockPlaylist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      tracks: [],
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

    const playlist1 = { id: '1', name: 'Playlist 1' };
    const playlist2 = { id: '2', name: 'Playlist 2' };

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

    const playlist1 = { id: '1', name: 'Playlist 1' };
    const playlist2 = { id: '2', name: 'Playlist 2' };

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
