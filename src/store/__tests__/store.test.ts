import { act, renderHook } from '@testing-library/react';
import {
  useAppStore,
  useAuth,
  usePlaylistSelection,
  useRatioConfig,
  useMixOptions,
  useUI,
  usePlaylistOperations,
  useMixingState,
} from '../index';
import { SpotifyPlaylist } from '../../types/spotify';

// Mock playlist data
const mockPlaylist1: SpotifyPlaylist = {
  id: 'playlist1',
  name: 'Test Playlist 1',
  description: 'Test description',
  images: [],
  tracks: { total: 10 },
  owner: { id: 'user1', display_name: 'Test User' },
  public: true,
  uri: 'spotify:playlist:playlist1',
};

const mockPlaylist2: SpotifyPlaylist = {
  id: 'playlist2',
  name: 'Test Playlist 2',
  description: 'Test description 2',
  images: [],
  tracks: { total: 20 },
  owner: { id: 'user1', display_name: 'Test User' },
  public: true,
  uri: 'spotify:playlist:playlist2',
};

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      accessToken: null,
      isAuthenticated: false,
      selectedPlaylists: [],
      ratioConfig: {},
      mixOptions: {
        totalSongs: 100,
        targetDuration: 240,
        useTimeLimit: false,
        useAllSongs: true,
        playlistName: 'My Mixed Playlist',
        shuffleWithinGroups: true,
        popularityStrategy: 'mixed',
        recencyBoost: true,
        continueWhenPlaylistEmpty: false,
      },
      error: null,
      mixedPlaylists: [],
    });
  });

  describe('Auth Slice', () => {
    it('should handle authentication', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      act(() => {
        result.current.setAccessToken('test-token');
      });

      expect(result.current.accessToken).toBe('test-token');
      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Playlist Selection Slice', () => {
    it('should handle playlist selection', () => {
      const { result } = renderHook(() => usePlaylistSelection());

      expect(result.current.selectedPlaylists).toHaveLength(0);

      act(() => {
        result.current.selectPlaylist(mockPlaylist1);
      });

      expect(result.current.selectedPlaylists).toHaveLength(1);
      expect(result.current.selectedPlaylists[0]).toEqual(mockPlaylist1);
      expect(result.current.isPlaylistSelected('playlist1')).toBe(true);

      act(() => {
        result.current.togglePlaylistSelection(mockPlaylist1);
      });

      expect(result.current.selectedPlaylists).toHaveLength(0);
      expect(result.current.isPlaylistSelected('playlist1')).toBe(false);
    });

    it('should handle multiple playlist selection', () => {
      const { result } = renderHook(() => usePlaylistSelection());

      act(() => {
        result.current.selectPlaylist(mockPlaylist1);
        result.current.selectPlaylist(mockPlaylist2);
      });

      expect(result.current.selectedPlaylists).toHaveLength(2);

      act(() => {
        result.current.deselectPlaylist('playlist1');
      });

      expect(result.current.selectedPlaylists).toHaveLength(1);
      expect(result.current.selectedPlaylists[0].id).toBe('playlist2');

      act(() => {
        result.current.clearAllPlaylists();
      });

      expect(result.current.selectedPlaylists).toHaveLength(0);
    });
  });

  describe('Ratio Config Slice', () => {
    it('should handle ratio configuration', () => {
      const { result } = renderHook(() => useRatioConfig());

      expect(Object.keys(result.current.ratioConfig)).toHaveLength(0);

      act(() => {
        result.current.addPlaylistToRatioConfig('playlist1');
      });

      expect(result.current.ratioConfig['playlist1']).toBeDefined();
      expect(result.current.getRatioConfig('playlist1')).toEqual({
        min: 1,
        max: 2,
        weight: 2,
        weightType: 'frequency',
      });

      act(() => {
        result.current.updateRatioConfig('playlist1', { weight: 5 });
      });

      expect(result.current.getRatioConfig('playlist1').weight).toBe(5);

      act(() => {
        result.current.removeRatioConfig('playlist1');
      });

      expect(result.current.ratioConfig['playlist1']).toBeUndefined();
    });

    it('should handle bulk ratio config updates', () => {
      const { result } = renderHook(() => useRatioConfig());

      const bulkConfig = {
        playlist1: {
          min: 1,
          max: 3,
          weight: 4,
          weightType: 'frequency' as const,
        },
        playlist2: { min: 2, max: 4, weight: 6, weightType: 'time' as const },
      };

      act(() => {
        result.current.setRatioConfigBulk(bulkConfig);
      });

      expect(result.current.ratioConfig).toEqual(bulkConfig);

      act(() => {
        result.current.clearRatioConfig();
      });

      expect(Object.keys(result.current.ratioConfig)).toHaveLength(0);
    });
  });

  describe('Mix Options Slice', () => {
    it('should handle mix options updates', () => {
      const { result } = renderHook(() => useMixOptions());

      expect(result.current.mixOptions.totalSongs).toBe(100);

      act(() => {
        result.current.updateMixOptions({ totalSongs: 50 });
      });

      expect(result.current.mixOptions.totalSongs).toBe(50);

      act(() => {
        result.current.resetMixOptions();
      });

      expect(result.current.mixOptions.totalSongs).toBe(100);
    });

    it('should handle preset application', () => {
      const { result } = renderHook(() => useMixOptions());

      act(() => {
        result.current.applyPresetOptions({
          strategy: 'popular',
          settings: { totalSongs: 75, recencyBoost: false },
          presetName: 'Popular Mix',
        });
      });

      expect(result.current.mixOptions.popularityStrategy).toBe('popular');
      expect(result.current.mixOptions.totalSongs).toBe(75);
      expect(result.current.mixOptions.recencyBoost).toBe(false);
      expect(result.current.mixOptions.playlistName).toBe('Popular Mix Mix');
    });
  });

  describe('UI Slice', () => {
    it('should handle error state', () => {
      const { result } = renderHook(() => useUI());

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.dismissError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle mixed playlists toasts', () => {
      const { result } = renderHook(() => useUI());

      expect(result.current.mixedPlaylists).toHaveLength(0);

      act(() => {
        result.current.addMixedPlaylist(mockPlaylist1);
      });

      expect(result.current.mixedPlaylists).toHaveLength(1);
      expect(result.current.mixedPlaylists[0].id).toBe('playlist1');
      expect(result.current.mixedPlaylists[0].toastId).toBeDefined();

      const toastId = result.current.mixedPlaylists[0].toastId;

      act(() => {
        result.current.dismissSuccessToast(toastId);
      });

      expect(result.current.mixedPlaylists).toHaveLength(0);
    });
  });

  describe('Combined Selectors', () => {
    it('should provide playlist operations', () => {
      const { result } = renderHook(() => usePlaylistOperations());

      act(() => {
        result.current.togglePlaylistSelection(mockPlaylist1);
        result.current.addPlaylistToRatioConfig('playlist1');
      });

      expect(result.current.selectedPlaylists).toHaveLength(1);
      expect(result.current.ratioConfig['playlist1']).toBeDefined();

      act(() => {
        result.current.clearAllPlaylists();
        result.current.setRatioConfigBulk({});
      });

      expect(result.current.selectedPlaylists).toHaveLength(0);
      expect(Object.keys(result.current.ratioConfig)).toHaveLength(0);
    });

    it('should provide mixing state', () => {
      const { result } = renderHook(() => useMixingState());

      // Set up initial state
      act(() => {
        useAppStore.getState().setAccessToken('test-token');
        useAppStore.getState().selectPlaylist(mockPlaylist1);
        useAppStore.getState().addPlaylistToRatioConfig('playlist1');
      });

      expect(result.current.accessToken).toBe('test-token');
      expect(result.current.selectedPlaylists).toHaveLength(1);
      expect(result.current.ratioConfig['playlist1']).toBeDefined();
      expect(result.current.mixOptions).toBeDefined();
      expect(typeof result.current.addMixedPlaylist).toBe('function');
      expect(typeof result.current.setError).toBe('function');
    });
  });

  describe('Store Integration', () => {
    it('should maintain state consistency across different hooks', () => {
      const { result: authResult } = renderHook(() => useAuth());
      const { result: playlistResult } = renderHook(() =>
        usePlaylistSelection()
      );
      const { result: ratioResult } = renderHook(() => useRatioConfig());

      // Update auth
      act(() => {
        authResult.current.setAccessToken('test-token');
      });

      // Add playlist
      act(() => {
        playlistResult.current.selectPlaylist(mockPlaylist1);
      });

      // Add ratio config
      act(() => {
        ratioResult.current.addPlaylistToRatioConfig('playlist1');
      });

      // Verify all hooks see the same state
      expect(authResult.current.accessToken).toBe('test-token');
      expect(playlistResult.current.selectedPlaylists).toHaveLength(1);
      expect(ratioResult.current.ratioConfig['playlist1']).toBeDefined();

      // Verify state is shared
      const directState = useAppStore.getState();
      expect(directState.accessToken).toBe('test-token');
      expect(directState.selectedPlaylists).toHaveLength(1);
      expect(directState.ratioConfig['playlist1']).toBeDefined();
    });
  });
});
