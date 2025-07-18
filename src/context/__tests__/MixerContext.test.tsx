import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MixerProvider, useMixer } from '../MixerContext';
import { IPlaylistMixerService, ISpotifyService } from '../../types/services';
import { MixConfig, MixResult, MixPreview, Track, Playlist, User, MixStrategy } from '../../types';
import { createValidationError, createAPIError } from '../../types/errors';

// Mock PlaylistMixerService
class MockPlaylistMixerService implements IPlaylistMixerService {
  private shouldFailValidation = false;
  private shouldFailMix = false;
  private shouldFailPreview = false;
  private validationErrors: string[] = [];

  // Test control methods
  setShouldFailValidation(shouldFail: boolean, errors: string[] = ['Test validation error']) {
    this.shouldFailValidation = shouldFail;
    this.validationErrors = errors;
  }

  setShouldFailMix(shouldFail: boolean) {
    this.shouldFailMix = shouldFail;
  }

  setShouldFailPreview(shouldFail: boolean) {
    this.shouldFailPreview = shouldFail;
  }

  async mixPlaylists(config: MixConfig): Promise<MixResult> {
    if (this.shouldFailMix) {
      throw new Error('Failed to mix playlists');
    }

    return {
      tracks: this.createMockTracks(5),
      metadata: {
        generatedAt: new Date(),
        strategy: config.mixOptions.strategy || 'balanced',
        sourcePlaylistCount: config.playlists.length,
        configHash: 'test-hash'
      },
      statistics: {
        totalTracks: 5,
        playlistDistribution: { 'playlist1': 3, 'playlist2': 2 },
        ratioCompliance: 0.9,
        averagePopularity: 75,
        totalDuration: 15
      }
    };
  }

  async previewMix(config: MixConfig): Promise<MixPreview> {
    if (this.shouldFailPreview) {
      throw new Error('Failed to generate preview');
    }

    return {
      tracks: this.createMockTracks(3),
      statistics: {
        totalTracks: 3,
        playlistDistribution: { 'playlist1': 2, 'playlist2': 1 },
        ratioCompliance: 0.8,
        averagePopularity: 70,
        totalDuration: 9
      },
      isPreview: true
    };
  }

  applyStrategy(tracks: Track[], strategy: MixStrategy): Track[] {
    return [...tracks];
  }

  async validateMixConfig(config: MixConfig): Promise<{ isValid: boolean; errors: string[] }> {
    if (this.shouldFailValidation) {
      return { isValid: false, errors: this.validationErrors };
    }
    return { isValid: true, errors: [] };
  }

  async calculateMixStatistics(tracks: Track[], config: MixConfig): Promise<any> {
    return {
      totalTracks: tracks.length,
      playlistDistribution: {},
      ratioCompliance: 1,
      averagePopularity: 75,
      totalDuration: tracks.length * 3
    };
  }

  private createMockTracks(count: number): Track[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `track${i + 1}`,
      name: `Test Track ${i + 1}`,
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      album: {
        id: 'album1',
        name: 'Test Album',
        artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
        images: [],
        release_date: '2023-01-01'
      },
      duration_ms: 180000,
      popularity: 75,
      uri: `spotify:track:track${i + 1}`
    }));
  }
}

// Mock SpotifyService
class MockSpotifyService implements ISpotifyService {
  private shouldFailCreate = false;
  private shouldFailAddTracks = false;

  // Test control methods
  setShouldFailCreate(shouldFail: boolean) {
    this.shouldFailCreate = shouldFail;
  }

  setShouldFailAddTracks(shouldFail: boolean) {
    this.shouldFailAddTracks = shouldFail;
  }

  async authenticate() {
    return { token: 'token', user: { id: '1', displayName: 'Test' }, expiresIn: 3600 };
  }

  async getUserProfile(): Promise<User> {
    return { id: 'user1', displayName: 'Test User' };
  }

  async getUserPlaylists() {
    return [];
  }

  async getPlaylistTracks() {
    return [];
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    if (this.shouldFailCreate) {
      throw createAPIError('Failed to create playlist', '/users/{userId}/playlists', 'POST');
    }

    return {
      id: 'new-playlist-id',
      name,
      description,
      trackCount: 0,
      owner: { id: 'user1', displayName: 'Test User' },
      images: []
    };
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    if (this.shouldFailAddTracks) {
      throw createAPIError('Failed to add tracks', `/playlists/${playlistId}/tracks`, 'POST');
    }
  }

  async searchTracks() {
    return [];
  }

  async getTrack() {
    return {
      id: 'track1',
      name: 'Test Track',
      artists: [],
      album: { id: 'album1', name: 'Test Album', artists: [], images: [], release_date: '2023-01-01' },
      duration_ms: 180000,
      popularity: 50,
      uri: 'spotify:track:track1'
    };
  }

  async getMultipleTracks() {
    return [];
  }
}

// Test component that uses the mixer context
function TestComponent() {
  const {
    state,
    generateMix,
    generatePreview,
    saveMix,
    clearCurrentMix,
    clearPreviewMix,
    clearError,
    clearHistory,
    resetState,
    validateMixConfig
  } = useMixer();

  const mockConfig: MixConfig = {
    playlists: [
      {
        playlist: { id: 'playlist1', name: 'Test Playlist 1', trackCount: 10, owner: { id: 'user1', displayName: 'Test' }, images: [] },
        tracks: [
          {
            id: 'track1',
            name: 'Track 1',
            artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
            album: { id: 'album1', name: 'Album 1', artists: [], images: [], release_date: '2023-01-01' },
            duration_ms: 180000,
            popularity: 75,
            uri: 'spotify:track:track1'
          }
        ],
        config: { ratio: 1, isEnabled: true }
      }
    ],
    ratioConfig: {
      playlist1: { ratio: 1, isEnabled: true }
    },
    mixOptions: {
      shuffleWithinRatio: false,
      avoidConsecutiveSamePlaylist: false,
      strategy: 'balanced',
      totalSongs: 10
    }
  };

  const handleGenerateMix = async () => {
    try {
      await generateMix(mockConfig);
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleGeneratePreview = async () => {
    try {
      await generatePreview(mockConfig);
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleSaveMix = async () => {
    if (state.currentMix) {
      try {
        await saveMix(state.currentMix, 'Test Saved Playlist');
      } catch (error) {
        // Error is handled by the context
      }
    }
  };

  const handleValidateConfig = async () => {
    try {
      await validateMixConfig(mockConfig);
    } catch (error) {
      // Error is handled by the context
    }
  };

  return (
    <div>
      <div data-testid="mixer-state">
        {JSON.stringify({
          hasCurrentMix: !!state.currentMix,
          hasPreviewMix: !!state.previewMix,
          isGenerating: state.isGenerating,
          historyCount: state.mixHistory.length,
          error: state.error
        })}
      </div>
      <button onClick={handleGenerateMix} data-testid="generate-mix-btn">Generate Mix</button>
      <button onClick={handleGeneratePreview} data-testid="generate-preview-btn">Generate Preview</button>
      <button onClick={handleSaveMix} data-testid="save-mix-btn">Save Mix</button>
      <button onClick={clearCurrentMix} data-testid="clear-mix-btn">Clear Mix</button>
      <button onClick={clearPreviewMix} data-testid="clear-preview-btn">Clear Preview</button>
      <button onClick={clearError} data-testid="clear-error-btn">Clear Error</button>
      <button onClick={clearHistory} data-testid="clear-history-btn">Clear History</button>
      <button onClick={resetState} data-testid="reset-state-btn">Reset State</button>
      <button onClick={handleValidateConfig} data-testid="validate-config-btn">Validate Config</button>
    </div>
  );
}

describe('MixerContext', () => {
  let mockMixerService: MockPlaylistMixerService;
  let mockSpotifyService: MockSpotifyService;

  beforeEach(() => {
    mockMixerService = new MockPlaylistMixerService();
    mockSpotifyService = new MockSpotifyService();
  });

  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <MixerProvider 
        playlistMixerService={mockMixerService} 
        spotifyService={mockSpotifyService}
      >
        {children}
      </MixerProvider>
    );
  };

  it('should provide initial empty state', () => {
    renderWithProvider(<TestComponent />);
    
    const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
    expect(mixerState).toEqual({
      hasCurrentMix: false,
      hasPreviewMix: false,
      isGenerating: false,
      historyCount: 0,
      error: null
    });
  });

  it('should generate mix successfully', async () => {
    renderWithProvider(<TestComponent />);
    
    const generateBtn = screen.getByTestId('generate-mix-btn');
    
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(true);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.historyCount).toBe(1);
      expect(mixerState.error).toBeNull();
    });
  });

  it('should handle mix generation failure', async () => {
    mockMixerService.setShouldFailMix(true);
    
    renderWithProvider(<TestComponent />);
    
    const generateBtn = screen.getByTestId('generate-mix-btn');
    
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(false);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeDefined();
    });
  });

  it('should generate preview successfully', async () => {
    renderWithProvider(<TestComponent />);
    
    const previewBtn = screen.getByTestId('generate-preview-btn');
    
    await act(async () => {
      previewBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasPreviewMix).toBe(true);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeNull();
    });
  });

  it('should handle preview generation failure', async () => {
    mockMixerService.setShouldFailPreview(true);
    
    renderWithProvider(<TestComponent />);
    
    const previewBtn = screen.getByTestId('generate-preview-btn');
    
    await act(async () => {
      previewBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasPreviewMix).toBe(false);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeDefined();
    });
  });

  it('should save mix successfully', async () => {
    renderWithProvider(<TestComponent />);
    
    // First generate a mix
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(true);
    });
    
    // Then save it
    const saveBtn = screen.getByTestId('save-mix-btn');
    await act(async () => {
      saveBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeNull();
    });
  });

  it('should handle save mix failure', async () => {
    mockSpotifyService.setShouldFailCreate(true);
    
    renderWithProvider(<TestComponent />);
    
    // First generate a mix
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(true);
    });
    
    // Then try to save it
    const saveBtn = screen.getByTestId('save-mix-btn');
    await act(async () => {
      saveBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeDefined();
    });
  });

  it('should clear current mix', async () => {
    renderWithProvider(<TestComponent />);
    
    // First generate a mix
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(true);
    });
    
    // Then clear it
    const clearBtn = screen.getByTestId('clear-mix-btn');
    act(() => {
      clearBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(false);
    });
  });

  it('should clear preview mix', async () => {
    renderWithProvider(<TestComponent />);
    
    // First generate a preview
    const previewBtn = screen.getByTestId('generate-preview-btn');
    await act(async () => {
      previewBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasPreviewMix).toBe(true);
    });
    
    // Then clear it
    const clearPreviewBtn = screen.getByTestId('clear-preview-btn');
    act(() => {
      clearPreviewBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasPreviewMix).toBe(false);
    });
  });

  it('should clear error state', async () => {
    mockMixerService.setShouldFailMix(true);
    
    renderWithProvider(<TestComponent />);
    
    // Trigger error
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.error).toBeDefined();
    });
    
    // Clear error
    const clearErrorBtn = screen.getByTestId('clear-error-btn');
    act(() => {
      clearErrorBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.error).toBeNull();
    });
  });

  it('should clear history', async () => {
    renderWithProvider(<TestComponent />);
    
    // Generate a mix to add to history
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.historyCount).toBe(1);
    });
    
    // Clear history
    const clearHistoryBtn = screen.getByTestId('clear-history-btn');
    act(() => {
      clearHistoryBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.historyCount).toBe(0);
    });
  });

  it('should reset state', async () => {
    renderWithProvider(<TestComponent />);
    
    // Generate a mix
    const generateBtn = screen.getByTestId('generate-mix-btn');
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(true);
      expect(mixerState.historyCount).toBe(1);
    });
    
    // Reset state
    const resetBtn = screen.getByTestId('reset-state-btn');
    act(() => {
      resetBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(false);
      expect(mixerState.hasPreviewMix).toBe(false);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.historyCount).toBe(0);
      expect(mixerState.error).toBeNull();
    });
  });

  it('should handle validation failure', async () => {
    mockMixerService.setShouldFailValidation(true, ['Invalid configuration']);
    
    renderWithProvider(<TestComponent />);
    
    const generateBtn = screen.getByTestId('generate-mix-btn');
    
    await act(async () => {
      generateBtn.click();
    });
    
    await waitFor(() => {
      const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(mixerState.hasCurrentMix).toBe(false);
      expect(mixerState.isGenerating).toBe(false);
      expect(mixerState.error).toBeDefined();
    });
  });

  it('should throw error when useMixer is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useMixer must be used within a MixerProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle loading states correctly', async () => {
    renderWithProvider(<TestComponent />);
    
    const generateBtn = screen.getByTestId('generate-mix-btn');
    
    // Start generation
    act(() => {
      generateBtn.click();
    });
    
    // Should show loading state briefly
    const mixerState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
    expect(mixerState.isGenerating).toBe(true);
    
    // Wait for completion
    await waitFor(() => {
      const finalState = JSON.parse(screen.getByTestId('mixer-state').textContent || '{}');
      expect(finalState.isGenerating).toBe(false);
    });
  });
});