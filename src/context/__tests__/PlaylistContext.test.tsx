import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PlaylistProvider, usePlaylist } from '../PlaylistContext';
import { ISpotifyService } from '../../types/services';
import { Playlist, Track, User, PlaylistRatioConfig } from '../../types';
import { createAPIError } from '../../types/errors';

// Mock SpotifyService
class MockSpotifyService implements ISpotifyService {
  private playlists: Playlist[] = [];
  private playlistTracks: { [playlistId: string]: Track[] } = {};
  private shouldFailFetch = false;
  private shouldFailTracks = false;

  // Test control methods
  setMockPlaylists(playlists: Playlist[]) {
    this.playlists = playlists;
  }

  setMockPlaylistTracks(playlistId: string, tracks: Track[]) {
    this.playlistTracks[playlistId] = tracks;
  }

  setShouldFailFetch(shouldFail: boolean) {
    this.shouldFailFetch = shouldFail;
  }

  setShouldFailTracks(shouldFail: boolean) {
    this.shouldFailTracks = shouldFail;
  }

  async authenticate() {
    return { token: 'token', user: { id: '1', displayName: 'Test' }, expiresIn: 3600 };
  }

  async getUserProfile(): Promise<User> {
    return { id: 'user1', displayName: 'Test User' };
  }

  async getUserPlaylists(limit?: number, offset?: number): Promise<Playlist[]> {
    if (this.shouldFailFetch) {
      throw createAPIError('Failed to fetch playlists', '/me/playlists', 'GET');
    }

    const start = offset || 0;
    const end = start + (limit || 50);
    return this.playlists.slice(start, end);
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    if (this.shouldFailTracks) {
      throw createAPIError('Failed to fetch tracks', `/playlists/${playlistId}/tracks`, 'GET');
    }

    return this.playlistTracks[playlistId] || [];
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      description,
      trackCount: 0,
      owner: { id: 'user1', displayName: 'Test User' },
      images: []
    };
    return newPlaylist;
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    // Mock implementation
  }

  async searchTracks(query: string, limit?: number): Promise<Track[]> {
    return [];
  }

  async getTrack(trackId: string): Promise<Track> {
    return {
      id: trackId,
      name: 'Test Track',
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      album: {
        id: 'album1',
        name: 'Test Album',
        artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
        images: [],
        release_date: '2023-01-01'
      },
      duration_ms: 180000,
      popularity: 50,
      uri: `spotify:track:${trackId}`
    };
  }

  async getMultipleTracks(trackIds: string[]): Promise<Track[]> {
    return trackIds.map(id => ({
      id,
      name: `Test Track ${id}`,
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      album: {
        id: 'album1',
        name: 'Test Album',
        artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
        images: [],
        release_date: '2023-01-01'
      },
      duration_ms: 180000,
      popularity: 50,
      uri: `spotify:track:${id}`
    }));
  }
}

// Test component that uses the playlist context
function TestComponent() {
  const {
    state,
    fetchUserPlaylists,
    selectPlaylist,
    deselectPlaylist,
    updatePlaylistConfig,
    clearSelectedPlaylists,
    clearError,
    resetState,
    isPlaylistSelected,
    getSelectedPlaylist
  } = usePlaylist();

  const handleSelectPlaylist = async () => {
    if (state.userPlaylists.length > 0) {
      try {
        await selectPlaylist(state.userPlaylists[0]);
      } catch (error) {
        // Error is handled by the context
      }
    }
  };

  const handleFetchPlaylists = async () => {
    try {
      await fetchUserPlaylists();
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleDeselectPlaylist = () => {
    if (state.selectedPlaylists.length > 0) {
      deselectPlaylist(state.selectedPlaylists[0].playlist.id);
    }
  };

  const handleUpdateConfig = () => {
    if (state.selectedPlaylists.length > 0) {
      updatePlaylistConfig(state.selectedPlaylists[0].playlist.id, { ratio: 2, isEnabled: true });
    }
  };

  return (
    <div>
      <div data-testid="playlist-state">
        {JSON.stringify({
          userPlaylistsCount: state.userPlaylists.length,
          selectedPlaylistsCount: state.selectedPlaylists.length,
          isLoading: state.isLoading,
          error: state.error,
          firstPlaylistSelected: state.userPlaylists.length > 0 ? isPlaylistSelected(state.userPlaylists[0].id) : false,
          selectedPlaylistConfig: state.selectedPlaylists.length > 0 ? state.selectedPlaylists[0].config : null
        })}
      </div>
      <button onClick={handleFetchPlaylists} data-testid="fetch-playlists-btn">Fetch Playlists</button>
      <button onClick={handleSelectPlaylist} data-testid="select-playlist-btn">Select Playlist</button>
      <button onClick={handleDeselectPlaylist} data-testid="deselect-playlist-btn">Deselect Playlist</button>
      <button onClick={handleUpdateConfig} data-testid="update-config-btn">Update Config</button>
      <button onClick={clearSelectedPlaylists} data-testid="clear-selected-btn">Clear Selected</button>
      <button onClick={clearError} data-testid="clear-error-btn">Clear Error</button>
      <button onClick={resetState} data-testid="reset-state-btn">Reset State</button>
    </div>
  );
}

describe('PlaylistContext', () => {
  let mockSpotifyService: MockSpotifyService;

  beforeEach(() => {
    mockSpotifyService = new MockSpotifyService();
  });

  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <PlaylistProvider spotifyService={mockSpotifyService}>
        {children}
      </PlaylistProvider>
    );
  };

  const createMockPlaylist = (id: string, name: string): Playlist => ({
    id,
    name,
    trackCount: 10,
    owner: { id: 'user1', displayName: 'Test User' },
    images: []
  });

  const createMockTrack = (id: string, name: string): Track => ({
    id,
    name,
    artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
    album: {
      id: 'album1',
      name: 'Test Album',
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      images: [],
      release_date: '2023-01-01'
    },
    duration_ms: 180000,
    popularity: 50,
    uri: `spotify:track:${id}`
  });

  it('should provide initial empty state', () => {
    renderWithProvider(<TestComponent />);
    
    const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
    expect(playlistState).toEqual({
      userPlaylistsCount: 0,
      selectedPlaylistsCount: 0,
      isLoading: false,
      error: null,
      firstPlaylistSelected: false,
      selectedPlaylistConfig: null
    });
  });

  it('should fetch user playlists successfully', async () => {
    const mockPlaylists = [
      createMockPlaylist('1', 'Playlist 1'),
      createMockPlaylist('2', 'Playlist 2')
    ];
    mockSpotifyService.setMockPlaylists(mockPlaylists);

    renderWithProvider(<TestComponent />);
    
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    
    await act(async () => {
      fetchBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.userPlaylistsCount).toBe(2);
      expect(playlistState.isLoading).toBe(false);
      expect(playlistState.error).toBeNull();
    });
  });

  it('should handle fetch playlists failure', async () => {
    mockSpotifyService.setShouldFailFetch(true);

    renderWithProvider(<TestComponent />);
    
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    
    await act(async () => {
      fetchBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.userPlaylistsCount).toBe(0);
      expect(playlistState.isLoading).toBe(false);
      expect(playlistState.error).toBeDefined();
    });
  });

  it('should select playlist with tracks', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    const mockTracks = [
      createMockTrack('track1', 'Track 1'),
      createMockTrack('track2', 'Track 2')
    ];
    
    mockSpotifyService.setMockPlaylists([mockPlaylist]);
    mockSpotifyService.setMockPlaylistTracks('1', mockTracks);

    renderWithProvider(<TestComponent />);
    
    // First fetch playlists
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.userPlaylistsCount).toBe(1);
    });
    
    // Then select playlist
    const selectBtn = screen.getByTestId('select-playlist-btn');
    await act(async () => {
      selectBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistsCount).toBe(1);
      expect(playlistState.firstPlaylistSelected).toBe(true);
      expect(playlistState.selectedPlaylistConfig).toEqual({ ratio: 1, isEnabled: true });
    });
  });

  it('should deselect playlist', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    const mockTracks = [createMockTrack('track1', 'Track 1')];
    
    mockSpotifyService.setMockPlaylists([mockPlaylist]);
    mockSpotifyService.setMockPlaylistTracks('1', mockTracks);

    renderWithProvider(<TestComponent />);
    
    // Fetch and select playlist
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    const selectBtn = screen.getByTestId('select-playlist-btn');
    await act(async () => {
      selectBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistsCount).toBe(1);
    });
    
    // Deselect playlist
    const deselectBtn = screen.getByTestId('deselect-playlist-btn');
    act(() => {
      deselectBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistsCount).toBe(0);
      expect(playlistState.firstPlaylistSelected).toBe(false);
    });
  });

  it('should update playlist configuration', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    const mockTracks = [createMockTrack('track1', 'Track 1')];
    
    mockSpotifyService.setMockPlaylists([mockPlaylist]);
    mockSpotifyService.setMockPlaylistTracks('1', mockTracks);

    renderWithProvider(<TestComponent />);
    
    // Fetch and select playlist
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    const selectBtn = screen.getByTestId('select-playlist-btn');
    await act(async () => {
      selectBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistConfig).toEqual({ ratio: 1, isEnabled: true });
    });
    
    // Update config
    const updateConfigBtn = screen.getByTestId('update-config-btn');
    act(() => {
      updateConfigBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistConfig).toEqual({ ratio: 2, isEnabled: true });
    });
  });

  it('should clear selected playlists', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    const mockTracks = [createMockTrack('track1', 'Track 1')];
    
    mockSpotifyService.setMockPlaylists([mockPlaylist]);
    mockSpotifyService.setMockPlaylistTracks('1', mockTracks);

    renderWithProvider(<TestComponent />);
    
    // Fetch and select playlist
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    const selectBtn = screen.getByTestId('select-playlist-btn');
    await act(async () => {
      selectBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistsCount).toBe(1);
    });
    
    // Clear selected playlists
    const clearBtn = screen.getByTestId('clear-selected-btn');
    act(() => {
      clearBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.selectedPlaylistsCount).toBe(0);
    });
  });

  it('should clear error state', async () => {
    mockSpotifyService.setShouldFailFetch(true);

    renderWithProvider(<TestComponent />);
    
    // Trigger error
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.error).toBeDefined();
    });
    
    // Clear error
    const clearErrorBtn = screen.getByTestId('clear-error-btn');
    act(() => {
      clearErrorBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.error).toBeNull();
    });
  });

  it('should reset state', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    mockSpotifyService.setMockPlaylists([mockPlaylist]);

    renderWithProvider(<TestComponent />);
    
    // Fetch playlists
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    await act(async () => {
      fetchBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.userPlaylistsCount).toBe(1);
    });
    
    // Reset state
    const resetBtn = screen.getByTestId('reset-state-btn');
    act(() => {
      resetBtn.click();
    });
    
    await waitFor(() => {
      const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(playlistState.userPlaylistsCount).toBe(0);
      expect(playlistState.selectedPlaylistsCount).toBe(0);
      expect(playlistState.isLoading).toBe(false);
      expect(playlistState.error).toBeNull();
    });
  });

  it('should throw error when usePlaylist is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePlaylist must be used within a PlaylistProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle loading states correctly', async () => {
    const mockPlaylist = createMockPlaylist('1', 'Test Playlist');
    mockSpotifyService.setMockPlaylists([mockPlaylist]);

    renderWithProvider(<TestComponent />);
    
    const fetchBtn = screen.getByTestId('fetch-playlists-btn');
    
    // Start fetch
    act(() => {
      fetchBtn.click();
    });
    
    // Should show loading state briefly
    const playlistState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
    expect(playlistState.isLoading).toBe(true);
    
    // Wait for completion
    await waitFor(() => {
      const finalState = JSON.parse(screen.getByTestId('playlist-state').textContent || '{}');
      expect(finalState.isLoading).toBe(false);
    });
  });
});