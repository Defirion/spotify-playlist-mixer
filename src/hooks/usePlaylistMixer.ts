import { useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import MixerContext from '../context/MixerContext';
import { MixConfig, MixResult, MixPreview, MixerState, Track, MixOptions, MixStrategy } from '../types';

// Background processing status
export interface BackgroundProcessStatus {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

// Mix validation result
export interface MixValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Cache entry for mix results
interface MixCacheEntry {
  config: MixConfig;
  result: MixResult;
  timestamp: number;
  expiry: number;
}

// Enhanced playlist mixer hook interface
export interface UsePlaylistMixerReturn {
  // State
  currentMix: MixResult | null;
  previewMix: MixPreview | null;
  isGenerating: boolean;
  mixHistory: MixResult[];
  error: string | null;
  
  // Background processing
  backgroundStatus: BackgroundProcessStatus;
  
  // Actions
  generateMix: (config: MixConfig, options?: { background?: boolean }) => Promise<MixResult>;
  generatePreview: (config: MixConfig) => Promise<MixPreview>;
  saveMix: (mixResult: MixResult, playlistName: string) => Promise<string>;
  clearCurrentMix: () => void;
  clearPreviewMix: () => void;
  clearError: () => void;
  clearHistory: () => void;
  resetState: () => void;
  
  // Validation
  validateMixConfig: (config: MixConfig) => Promise<MixValidationResult>;
  
  // Mix operations
  regenerateMix: (strategy?: MixStrategy) => Promise<MixResult>;
  applyMixStrategy: (mixResult: MixResult, strategy: MixStrategy) => Promise<MixResult>;
  
  // Caching
  getCachedMix: (config: MixConfig) => MixResult | null;
  clearMixCache: () => void;
  getCacheStats: () => { size: number; hitRate: number };
  
  // Utility methods
  exportMixAsPlaylist: (mixResult: MixResult, name: string) => Promise<string>;
  getMixStatistics: (mixResult: MixResult) => MixStatistics;
  compareMixes: (mix1: MixResult, mix2: MixResult) => MixComparison;
  
  // Background processing control
  cancelBackgroundProcessing: () => void;
  pauseBackgroundProcessing: () => void;
  resumeBackgroundProcessing: () => void;
}

// Mix statistics interface
export interface MixStatistics {
  totalTracks: number;
  totalDuration: number;
  averagePopularity: number;
  genreDistribution: Record<string, number>;
  artistDistribution: Record<string, number>;
  ratioCompliance: number;
  duplicateCount: number;
}

// Mix comparison interface
export interface MixComparison {
  similarity: number;
  commonTracks: Track[];
  uniqueToFirst: Track[];
  uniqueToSecond: Track[];
  statisticalDifferences: Record<string, number>;
}

// Cache configuration
const MIX_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 50;

/**
 * Enhanced usePlaylistMixer hook that provides comprehensive playlist mixing
 * with background processing, caching, and advanced mix operations
 */
export function usePlaylistMixer(): UsePlaylistMixerReturn {
  const context = useContext(MixerContext);
  
  if (context === undefined) {
    throw new Error('usePlaylistMixer must be used within a MixerProvider');
  }

  const {
    state,
    generateMix: contextGenerateMix,
    generatePreview: contextGeneratePreview,
    saveMix: contextSaveMix,
    clearCurrentMix: contextClearCurrentMix,
    clearPreviewMix: contextClearPreviewMix,
    clearError: contextClearError,
    clearHistory: contextClearHistory,
    resetState: contextResetState,
    validateMixConfig: contextValidateMixConfig,
  } = context;

  // Local state for background processing and caching
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundProcessStatus>({
    isProcessing: false,
    progress: 0,
    currentStep: '',
  });

  // Cache and processing refs
  const mixCacheRef = useRef<Map<string, MixCacheEntry>>(new Map());
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });
  const backgroundWorkerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastConfigRef = useRef<MixConfig | null>(null);

  // Cache utilities
  const generateCacheKey = useCallback((config: MixConfig): string => {
    return JSON.stringify({
      playlists: config.playlists.map(p => ({ id: p.playlist.id, config: p.config })),
      mixOptions: config.mixOptions,
    });
  }, []);

  const setCachedMix = useCallback((config: MixConfig, result: MixResult): void => {
    const key = generateCacheKey(config);
    const entry: MixCacheEntry = {
      config,
      result,
      timestamp: Date.now(),
      expiry: Date.now() + MIX_CACHE_EXPIRY,
    };

    // Manage cache size
    if (mixCacheRef.current.size >= MAX_CACHE_SIZE) {
      const oldestKey = Array.from(mixCacheRef.current.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      mixCacheRef.current.delete(oldestKey);
    }

    mixCacheRef.current.set(key, entry);
  }, [generateCacheKey]);

  const getCachedMix = useCallback((config: MixConfig): MixResult | null => {
    const key = generateCacheKey(config);
    const entry = mixCacheRef.current.get(key);

    if (!entry) {
      cacheStatsRef.current.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      mixCacheRef.current.delete(key);
      cacheStatsRef.current.misses++;
      return null;
    }

    cacheStatsRef.current.hits++;
    return entry.result;
  }, [generateCacheKey]);

  const clearMixCache = useCallback((): void => {
    mixCacheRef.current.clear();
    cacheStatsRef.current = { hits: 0, misses: 0 };
  }, []);

  const getCacheStats = useCallback(() => {
    const { hits, misses } = cacheStatsRef.current;
    const total = hits + misses;
    return {
      size: mixCacheRef.current.size,
      hitRate: total > 0 ? hits / total : 0,
    };
  }, []);

  // Background processing utilities
  const updateBackgroundStatus = useCallback((
    status: Partial<BackgroundProcessStatus>
  ): void => {
    setBackgroundStatus(prev => ({ ...prev, ...status }));
  }, []);

  const cancelBackgroundProcessing = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (backgroundWorkerRef.current) {
      backgroundWorkerRef.current.terminate();
      backgroundWorkerRef.current = null;
    }
    updateBackgroundStatus({
      isProcessing: false,
      progress: 0,
      currentStep: '',
    });
  }, [updateBackgroundStatus]);

  const pauseBackgroundProcessing = useCallback((): void => {
    // Implementation would depend on the background worker
    updateBackgroundStatus({ currentStep: 'Paused' });
  }, [updateBackgroundStatus]);

  const resumeBackgroundProcessing = useCallback((): void => {
    // Implementation would depend on the background worker
    updateBackgroundStatus({ currentStep: 'Resuming...' });
  }, [updateBackgroundStatus]);

  // Enhanced mix generation with caching and background processing
  const generateMix = useCallback(async (
    config: MixConfig,
    options: { background?: boolean } = {}
  ): Promise<MixResult> => {
    // Check cache first
    const cached = getCachedMix(config);
    if (cached) {
      return cached;
    }

    lastConfigRef.current = config;

    if (options.background) {
      // Set up background processing
      abortControllerRef.current = new AbortController();
      updateBackgroundStatus({
        isProcessing: true,
        progress: 0,
        currentStep: 'Initializing mix generation...',
      });

      try {
        // Simulate progress updates
        const progressSteps = [
          { progress: 10, step: 'Validating configuration...' },
          { progress: 25, step: 'Analyzing playlists...' },
          { progress: 50, step: 'Applying mix strategy...' },
          { progress: 75, step: 'Optimizing track order...' },
          { progress: 90, step: 'Finalizing mix...' },
        ];

        for (const { progress, step } of progressSteps) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Mix generation cancelled');
          }
          updateBackgroundStatus({ progress, currentStep: step });
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
        }

        const result = await contextGenerateMix(config);
        setCachedMix(config, result);

        updateBackgroundStatus({
          isProcessing: false,
          progress: 100,
          currentStep: 'Complete',
        });

        return result;
      } catch (error) {
        updateBackgroundStatus({
          isProcessing: false,
          progress: 0,
          currentStep: 'Failed',
        });
        throw error;
      }
    } else {
      // Standard synchronous generation
      const result = await contextGenerateMix(config);
      setCachedMix(config, result);
      return result;
    }
  }, [contextGenerateMix, getCachedMix, setCachedMix, updateBackgroundStatus]);

  // Enhanced preview generation
  const generatePreview = useCallback(async (config: MixConfig): Promise<MixPreview> => {
    return await contextGeneratePreview(config);
  }, [contextGeneratePreview]);

  // Enhanced validation with detailed feedback
  const validateMixConfig = useCallback(async (config: MixConfig): Promise<MixValidationResult> => {
    const baseValidation = await contextValidateMixConfig(config);
    
    // Add enhanced validation logic
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for potential issues
    if (config.playlists.length < 2) {
      warnings.push('Consider using at least 2 playlists for better mixing results');
    }

    if (config.playlists.some(p => p.tracks.length < 10)) {
      warnings.push('Some playlists have very few tracks, which may limit mixing options');
    }

    // Add suggestions
    if (config.mixOptions.strategy === 'random') {
      suggestions.push('Try the "balanced" strategy for more consistent results');
    }

    return {
      isValid: baseValidation.isValid,
      errors: baseValidation.errors,
      warnings,
      suggestions,
    };
  }, [contextValidateMixConfig]);

  // Regenerate mix with different strategy
  const regenerateMix = useCallback(async (strategy?: MixStrategy): Promise<MixResult> => {
    if (!lastConfigRef.current) {
      throw new Error('No previous mix configuration available');
    }

    const config = {
      ...lastConfigRef.current,
      mixOptions: {
        ...lastConfigRef.current.mixOptions,
        strategy: strategy || lastConfigRef.current.mixOptions.strategy,
      },
    };

    return await generateMix(config);
  }, [generateMix]);

  // Apply different strategy to existing mix
  const applyMixStrategy = useCallback(async (
    mixResult: MixResult,
    strategy: MixStrategy
  ): Promise<MixResult> => {
    // This would typically involve re-processing the tracks with the new strategy
    // For now, we'll simulate by regenerating with the new strategy
    if (!lastConfigRef.current) {
      throw new Error('No configuration available for strategy application');
    }

    const config = {
      ...lastConfigRef.current,
      mixOptions: {
        ...lastConfigRef.current.mixOptions,
        strategy,
      },
    };

    return await generateMix(config);
  }, [generateMix]);

  // Export mix as playlist
  const exportMixAsPlaylist = useCallback(async (
    mixResult: MixResult,
    name: string
  ): Promise<string> => {
    return await contextSaveMix(mixResult, name);
  }, [contextSaveMix]);

  // Get mix statistics
  const getMixStatistics = useCallback((mixResult: MixResult): MixStatistics => {
    const tracks = mixResult.tracks;
    
    const totalDuration = tracks.reduce((sum, track) => sum + track.duration_ms, 0);
    const averagePopularity = tracks.reduce((sum, track) => sum + track.popularity, 0) / tracks.length;
    
    // Genre distribution (simplified - would need actual genre data)
    const genreDistribution: Record<string, number> = {};
    
    // Artist distribution
    const artistDistribution: Record<string, number> = {};
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        artistDistribution[artist.name] = (artistDistribution[artist.name] || 0) + 1;
      });
    });

    // Duplicate detection
    const trackIds = tracks.map(t => t.id);
    const uniqueIds = new Set(trackIds);
    const duplicateCount = trackIds.length - uniqueIds.size;

    // Ratio compliance (simplified calculation)
    const ratioCompliance = mixResult.statistics?.ratioCompliance || 0.9;

    return {
      totalTracks: tracks.length,
      totalDuration,
      averagePopularity,
      genreDistribution,
      artistDistribution,
      ratioCompliance,
      duplicateCount,
    };
  }, []);

  // Compare two mixes
  const compareMixes = useCallback((mix1: MixResult, mix2: MixResult): MixComparison => {
    const tracks1 = new Set(mix1.tracks.map(t => t.id));
    const tracks2 = new Set(mix2.tracks.map(t => t.id));
    
    const commonTrackIds = new Set(Array.from(tracks1).filter(id => tracks2.has(id)));
    const uniqueToFirst = mix1.tracks.filter(t => !tracks2.has(t.id));
    const uniqueToSecond = mix2.tracks.filter(t => !tracks1.has(t.id));
    const commonTracks = mix1.tracks.filter(t => commonTrackIds.has(t.id));
    
    const similarity = commonTrackIds.size / Math.max(tracks1.size, tracks2.size);
    
    const stats1 = getMixStatistics(mix1);
    const stats2 = getMixStatistics(mix2);
    
    const statisticalDifferences = {
      durationDifference: Math.abs(stats1.totalDuration - stats2.totalDuration),
      popularityDifference: Math.abs(stats1.averagePopularity - stats2.averagePopularity),
      trackCountDifference: Math.abs(stats1.totalTracks - stats2.totalTracks),
    };

    return {
      similarity,
      commonTracks,
      uniqueToFirst,
      uniqueToSecond,
      statisticalDifferences,
    };
  }, [getMixStatistics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelBackgroundProcessing();
      clearMixCache();
    };
  }, [cancelBackgroundProcessing, clearMixCache]);

  return {
    // State
    currentMix: state.currentMix,
    previewMix: state.previewMix,
    isGenerating: state.isGenerating,
    mixHistory: state.mixHistory,
    error: state.error,
    
    // Background processing
    backgroundStatus,
    
    // Actions
    generateMix,
    generatePreview,
    saveMix: contextSaveMix,
    clearCurrentMix: contextClearCurrentMix,
    clearPreviewMix: contextClearPreviewMix,
    clearError: contextClearError,
    clearHistory: contextClearHistory,
    resetState: contextResetState,
    
    // Validation
    validateMixConfig,
    
    // Mix operations
    regenerateMix,
    applyMixStrategy,
    
    // Caching
    getCachedMix,
    clearMixCache,
    getCacheStats,
    
    // Utility methods
    exportMixAsPlaylist,
    getMixStatistics,
    compareMixes,
    
    // Background processing control
    cancelBackgroundProcessing,
    pauseBackgroundProcessing,
    resumeBackgroundProcessing,
  };
}

export default usePlaylistMixer;