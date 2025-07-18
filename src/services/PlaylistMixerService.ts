import { IPlaylistMixerService } from '../types/services';
import { Track, MixConfig, MixResult, MixPreview, MixStrategy, SelectedPlaylist, MixStatistics, MixMetadata } from '../types';
import { createValidationError, ValidationError } from '../types/errors';

export class PlaylistMixerService implements IPlaylistMixerService {
  private static readonly MAX_ATTEMPTS_MULTIPLIER = 10;
  private static readonly DEFAULT_SONG_DURATION_MINUTES = 3.5;
  private static readonly MAX_TIME_BASED_SONGS = 200;

  async mixPlaylists(config: MixConfig): Promise<MixResult> {
    const validation = await this.validateMixConfig(config);
    if (!validation.isValid) {
      throw createValidationError(
        `Invalid mix configuration: ${validation.errors.join(', ')}`,
        'mixConfig',
        validation.errors
      );
    }

    const tracks = this.performMix(config);
    const statistics = await this.calculateMixStatistics(tracks, config);
    const metadata = this.createMixMetadata(config);

    return {
      tracks,
      statistics,
      metadata
    };
  }

  async previewMix(config: MixConfig): Promise<MixPreview> {
    const validation = await this.validateMixConfig(config);
    if (!validation.isValid) {
      throw createValidationError(
        `Invalid mix configuration: ${validation.errors.join(', ')}`,
        'mixConfig',
        validation.errors
      );
    }

    // For preview, limit to first 20 tracks
    const previewConfig = {
      ...config,
      mixOptions: {
        ...config.mixOptions,
        totalSongs: Math.min(20, config.mixOptions.totalSongs || 20)
      }
    };

    const tracks = this.performMix(previewConfig);
    const statistics = await this.calculateMixStatistics(tracks, config);

    return {
      tracks,
      statistics,
      isPreview: true
    };
  }

  applyStrategy(tracks: Track[], strategy: MixStrategy): Track[] {
    // This method applies post-processing strategies to already mixed tracks
    switch (strategy) {
      case 'balanced':
        return this.shuffleArray([...tracks]);
      case 'front-loaded':
        return this.sortByPopularity(tracks, 'desc');
      case 'crescendo':
        return this.sortByPopularity(tracks, 'asc');
      case 'random':
        return this.shuffleArray([...tracks]);
      default:
        return [...tracks];
    }
  }

  async validateMixConfig(config: MixConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config) {
      errors.push('Configuration is required');
      return { isValid: false, errors };
    }

    if (!config.playlists || config.playlists.length === 0) {
      errors.push('At least one playlist is required');
    }

    if (!config.ratioConfig || Object.keys(config.ratioConfig).length === 0) {
      errors.push('Ratio configuration is required');
    }

    if (!config.mixOptions) {
      errors.push('Mix options are required');
    } else {
      if (config.mixOptions.totalSongs !== undefined && config.mixOptions.totalSongs <= 0) {
        errors.push('Total songs must be greater than 0');
      }
    }

    // Validate playlists have tracks
    const playlistsWithTracks = config.playlists.filter(p => p.tracks && p.tracks.length > 0);
    if (playlistsWithTracks.length === 0) {
      errors.push('At least one playlist must have tracks');
    }

    // Validate ratio config matches playlists
    const playlistIds = config.playlists.map(p => p.playlist.id);
    const ratioConfigIds = Object.keys(config.ratioConfig);
    const missingRatios = playlistIds.filter(id => !ratioConfigIds.includes(id));
    if (missingRatios.length > 0) {
      errors.push(`Missing ratio configuration for playlists: ${missingRatios.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  async calculateMixStatistics(tracks: Track[], config: MixConfig): Promise<MixStatistics> {
    const totalTracks = tracks.length;
    const totalDuration = this.calculateTotalDuration(tracks);
    
    // Calculate playlist distribution
    const playlistDistribution: { [playlistId: string]: number } = {};
    config.playlists.forEach(p => {
      playlistDistribution[p.playlist.id] = 0;
    });

    tracks.forEach(track => {
      const sourcePlaylist = (track as any).sourcePlaylist;
      if (sourcePlaylist && playlistDistribution.hasOwnProperty(sourcePlaylist)) {
        playlistDistribution[sourcePlaylist]++;
      }
    });

    // Calculate ratio compliance
    const ratioCompliance = this.calculateRatioCompliance(playlistDistribution, config.ratioConfig);

    // Calculate average popularity
    const averagePopularity = tracks.length > 0 
      ? tracks.reduce((sum, track) => sum + (track.popularity || 0), 0) / tracks.length 
      : 0;

    return {
      totalTracks,
      playlistDistribution,
      ratioCompliance,
      averagePopularity: Math.round(averagePopularity * 10) / 10,
      totalDuration: Math.round(totalDuration / 60000) // Convert to minutes
    };
  }

  private performMix(config: MixConfig): Track[] {
    const { playlists, ratioConfig, mixOptions } = config;
    
    // Convert playlists to the format expected by the mixing algorithm
    const playlistTracks: { [playlistId: string]: Track[] } = {};
    playlists.forEach(selectedPlaylist => {
      playlistTracks[selectedPlaylist.playlist.id] = selectedPlaylist.tracks.filter(
        track => track && track.id && track.uri
      );
    });

    // Create popularity pools for each playlist
    const popularityPools = this.createPopularityPools(playlistTracks, mixOptions);

    // Get valid playlist IDs
    const playlistIds = Object.keys(ratioConfig).filter(id => 
      playlistTracks[id] && playlistTracks[id].length > 0
    );
    
    if (playlistIds.length === 0) {
      return [];
    }

    // Calculate total weight for proper ratio distribution
    const totalWeight = playlistIds.reduce((sum, id) => {
      const config = ratioConfig[id];
      return sum + (config.isEnabled ? config.ratio : 0);
    }, 0);

    if (totalWeight === 0) {
      return [];
    }

    const mixedTracks: Track[] = [];
    const playlistCounts: { [playlistId: string]: number } = {};
    const playlistDurations: { [playlistId: string]: number } = {};
    
    // Initialize tracking
    playlistIds.forEach(playlistId => {
      playlistCounts[playlistId] = 0;
      playlistDurations[playlistId] = 0;
    });

    let attempts = 0;
    const maxAttempts = (mixOptions.totalSongs || 100) * PlaylistMixerService.MAX_ATTEMPTS_MULTIPLIER;

    const shouldContinue = (): boolean => {
      return mixedTracks.length < (mixOptions.totalSongs || 100);
    };

    // Helper function to find which playlist needs more songs based on target ratios
    const getNextPlaylistId = (): string | null => {
      let bestPlaylistId: string | null = null;
      let maxDeficit = -1;
      const usedTrackIds = new Set(mixedTracks.map(t => t.id));
      
      for (const playlistId of playlistIds) {
        const config = ratioConfig[playlistId];
        if (!config.isEnabled) continue;

        const targetRatio = config.ratio / totalWeight;
        const currentRatio = mixedTracks.length > 0 ? playlistCounts[playlistId] / mixedTracks.length : 0;
        
        // Calculate how far behind this playlist is from its target ratio
        const deficit = targetRatio - currentRatio;
        
        // Check if this playlist has any unused tracks
        const hasUnusedTracks = playlistTracks[playlistId].some(track => !usedTrackIds.has(track.id));
        
        if (deficit > maxDeficit && hasUnusedTracks) {
          maxDeficit = deficit;
          bestPlaylistId = playlistId;
        }
      }
      
      return bestPlaylistId;
    };

    while (shouldContinue() && attempts < maxAttempts) {
      attempts++;

      // Choose playlist based on weight ratios
      const selectedPlaylistId = getNextPlaylistId();
      if (!selectedPlaylistId) {
        // No more playlists available
        break;
      }

      // Get appropriate tracks based on position and strategy
      const currentPosition = mixedTracks.length;
      const estimatedTotalLength = mixOptions.totalSongs || 100;
      
      const availableTracks = this.getTracksForPosition(
        popularityPools, 
        selectedPlaylistId, 
        currentPosition, 
        estimatedTotalLength, 
        mixOptions.strategy || 'balanced'
      );

      // Skip if no more tracks available
      if (availableTracks.length === 0) {
        continue;
      }

      // Add one song from this playlist
      const usedTrackIds = new Set(mixedTracks.map(t => t.id));
      
      // Find next available track from the appropriate popularity pool
      let selectedTrack: Track | null = null;
      
      for (const track of availableTracks) {
        if (!usedTrackIds.has(track.id)) {
          selectedTrack = track;
          break;
        }
      }
      
      if (selectedTrack) {
        mixedTracks.push({
          ...selectedTrack,
          sourcePlaylist: selectedPlaylistId
        } as any);
        
        // Track duration and count for balancing
        playlistDurations[selectedPlaylistId] += selectedTrack.duration_ms || 0;
        playlistCounts[selectedPlaylistId]++;
        
        // Remove used track from available tracks
        const trackIndex = availableTracks.indexOf(selectedTrack);
        if (trackIndex > -1) {
          availableTracks.splice(trackIndex, 1);
        }
      }
    }

    return mixedTracks.slice(0, mixOptions.totalSongs || 100);
  }

  private createPopularityPools(
    playlistTracks: { [playlistId: string]: Track[] }, 
    options: any
  ): { [playlistId: string]: PopularityQuadrants } {
    const popularityPools: { [playlistId: string]: PopularityQuadrants } = {};
    
    Object.keys(playlistTracks).forEach(playlistId => {
      const tracks = playlistTracks[playlistId];
      if (tracks.length === 0) {
        popularityPools[playlistId] = { topHits: [], popular: [], moderate: [], deepCuts: [] };
        return;
      }
      
      // Create quadrants based on popularity
      const quadrants = this.createPopularityQuadrants(tracks);
      
      // Shuffle within quadrants if requested
      if (options.shuffleWithinRatio) {
        quadrants.topHits = this.shuffleArray(quadrants.topHits);
        quadrants.popular = this.shuffleArray(quadrants.popular);
        quadrants.moderate = this.shuffleArray(quadrants.moderate);
        quadrants.deepCuts = this.shuffleArray(quadrants.deepCuts);
      }
      
      popularityPools[playlistId] = quadrants;
    });
    
    return popularityPools;
  }

  private createPopularityQuadrants(tracks: Track[]): PopularityQuadrants {
    // Sort by popularity (highest first)
    const sortedTracks = [...tracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    
    const totalTracks = sortedTracks.length;
    const quarterSize = Math.ceil(totalTracks / 4);
    
    return {
      topHits: sortedTracks.slice(0, quarterSize), // 0-25% (most popular)
      popular: sortedTracks.slice(quarterSize, quarterSize * 2), // 25-50%
      moderate: sortedTracks.slice(quarterSize * 2, quarterSize * 3), // 50-75%
      deepCuts: sortedTracks.slice(quarterSize * 3) // 75-100% (least popular)
    };
  }

  private getTracksForPosition(
    popularityPools: { [playlistId: string]: PopularityQuadrants },
    playlistId: string,
    position: number,
    totalLength: number,
    strategy: MixStrategy
  ): Track[] {
    const pools = popularityPools[playlistId];
    if (!pools) return [];
    
    const positionRatio = position / totalLength; // 0.0 to 1.0
    
    let selectedPools: Track[] = [];
    
    switch (strategy) {
      case 'front-loaded':
        // Popular songs first, fade to deep cuts
        if (positionRatio < 0.3) {
          selectedPools = [...pools.topHits, ...pools.popular];
        } else if (positionRatio < 0.7) {
          selectedPools = [...pools.moderate, ...pools.popular];
        } else {
          selectedPools = [...pools.deepCuts, ...pools.moderate];
        }
        break;
        
      case 'crescendo':
        // Build from deep cuts to biggest hits
        if (positionRatio < 0.3) {
          selectedPools = [...pools.deepCuts, ...pools.moderate];
        } else if (positionRatio < 0.6) {
          selectedPools = [...pools.moderate, ...pools.popular];
        } else {
          selectedPools = [...pools.popular, ...pools.topHits];
        }
        break;
        
      case 'balanced':
      case 'random':
      default:
        // Random mix of all quadrants
        selectedPools = [...pools.topHits, ...pools.popular, ...pools.moderate, ...pools.deepCuts];
        break;
    }
    
    return selectedPools;
  }

  private calculateTotalDuration(tracks: Track[]): number {
    return tracks.reduce((total, track) => total + (track.duration_ms || 0), 0);
  }

  private calculateRatioCompliance(
    distribution: { [playlistId: string]: number },
    ratioConfig: any
  ): number {
    const totalTracks = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    if (totalTracks === 0) return 1;

    const totalWeight = Object.keys(ratioConfig).reduce((sum, id) => {
      const config = ratioConfig[id];
      return sum + (config.isEnabled ? config.ratio : 0);
    }, 0);

    if (totalWeight === 0) return 1;

    let compliance = 0;
    let validPlaylists = 0;

    Object.keys(ratioConfig).forEach(playlistId => {
      const config = ratioConfig[playlistId];
      if (!config.isEnabled) return;

      const expectedRatio = config.ratio / totalWeight;
      const actualRatio = distribution[playlistId] / totalTracks;
      const difference = Math.abs(expectedRatio - actualRatio);
      
      compliance += Math.max(0, 1 - difference);
      validPlaylists++;
    });

    return validPlaylists > 0 ? compliance / validPlaylists : 1;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private sortByPopularity(tracks: Track[], order: 'asc' | 'desc'): Track[] {
    return [...tracks].sort((a, b) => {
      const aPopularity = a.popularity || 0;
      const bPopularity = b.popularity || 0;
      return order === 'desc' ? bPopularity - aPopularity : aPopularity - bPopularity;
    });
  }

  private createMixMetadata(config: MixConfig): MixMetadata {
    return {
      generatedAt: new Date(),
      strategy: config.mixOptions.strategy || 'balanced',
      sourcePlaylistCount: config.playlists.length,
      configHash: this.generateConfigHash(config)
    };
  }

  private generateConfigHash(config: MixConfig): string {
    // Simple hash generation for config identification
    const configString = JSON.stringify({
      playlists: config.playlists.map(p => p.playlist.id),
      ratios: config.ratioConfig,
      options: config.mixOptions
    });
    
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}

interface PopularityQuadrants {
  topHits: Track[];
  popular: Track[];
  moderate: Track[];
  deepCuts: Track[];
}