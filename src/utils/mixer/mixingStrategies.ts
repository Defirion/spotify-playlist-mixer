// Mixing strategies using the strategy pattern
// This module implements different mixing strategies for track selection

import { PopularityStrategy } from '../../types/mixer';
import {
  PopularityPools,
  TrackWithPopularity,
  MixingStrategy,
  StrategyManager,
} from './types';

/**
 * Mixed Strategy - Random mix of all quadrants
 * Uses all popularity tiers equally throughout the playlist
 */
export class MixedStrategy implements MixingStrategy {
  name: PopularityStrategy = 'mixed';

  getTracksForPosition(
    popularityPools: PopularityPools,
    playlistId: string,
    position: number,
    totalLength: number
  ): TrackWithPopularity[] {
    const pools = popularityPools[playlistId];
    if (!pools) return [];

    // Random mix of all quadrants
    const selectedPools = [
      ...pools.topHits,
      ...pools.popular,
      ...pools.moderate,
      ...pools.deepCuts,
    ];

    if (process.env.NODE_ENV === 'development') {
      const positionRatio = position / totalLength;
      console.log(
        `🎯 Position ${position}/${totalLength} (${Math.round(positionRatio * 100)}%) - Strategy: ${this.name}`
      );
      console.log(`   Using: All quadrants mixed`);
      console.log(`   Available tracks: ${selectedPools.length}`);
    }

    return selectedPools;
  }
}

/**
 * Front-Loaded Strategy - Popular songs first, fade to deep cuts
 * Starts with hits and gradually moves to deeper cuts
 */
export class FrontLoadedStrategy implements MixingStrategy {
  name: PopularityStrategy = 'front-loaded';

  getTracksForPosition(
    popularityPools: PopularityPools,
    playlistId: string,
    position: number,
    totalLength: number
  ): TrackWithPopularity[] {
    const pools = popularityPools[playlistId];
    if (!pools) return [];

    const positionRatio = position / totalLength; // 0.0 to 1.0
    let selectedPools: TrackWithPopularity[] = [];

    // Popular songs first, fade to deep cuts
    if (positionRatio < 0.3) {
      selectedPools = [...pools.topHits, ...pools.popular];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Top Hits + Popular (front-loaded start)`);
    } else if (positionRatio < 0.7) {
      selectedPools = [...pools.moderate, ...pools.popular];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Moderate + Popular (front-loaded middle)`);
    } else {
      selectedPools = [...pools.deepCuts, ...pools.moderate];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Deep Cuts + Moderate (front-loaded end)`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🎯 Position ${position}/${totalLength} (${Math.round(positionRatio * 100)}%) - Strategy: ${this.name}`
      );
      console.log(`   Available tracks: ${selectedPools.length}`);
    }

    return this.addFallbackIfNeeded(selectedPools, pools);
  }

  private addFallbackIfNeeded(
    selectedPools: TrackWithPopularity[],
    pools: any
  ): TrackWithPopularity[] {
    return addFallbackTracks(selectedPools, [
      ...pools.topHits,
      ...pools.popular,
      ...pools.moderate,
      ...pools.deepCuts,
    ]);
  }
}

/**
 * Mid-Peak Strategy - Build to peak in middle, then fade
 * Creates a mountain-like popularity curve with peak in the middle
 */
export class MidPeakStrategy implements MixingStrategy {
  name: PopularityStrategy = 'mid-peak';

  getTracksForPosition(
    popularityPools: PopularityPools,
    playlistId: string,
    position: number,
    totalLength: number
  ): TrackWithPopularity[] {
    const pools = popularityPools[playlistId];
    if (!pools) return [];

    const positionRatio = position / totalLength; // 0.0 to 1.0
    let selectedPools: TrackWithPopularity[] = [];

    // Build to peak in middle, then fade
    if (positionRatio < 0.2) {
      selectedPools = [...pools.moderate, ...pools.deepCuts];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Moderate + Deep Cuts (mid-peak start)`);
    } else if (positionRatio < 0.4) {
      selectedPools = [...pools.popular, ...pools.moderate];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Popular + Moderate (mid-peak build)`);
    } else if (positionRatio < 0.6) {
      selectedPools = [...pools.topHits, ...pools.popular];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Top Hits + Popular (mid-peak PEAK! 🔥)`);
    } else if (positionRatio < 0.8) {
      selectedPools = [...pools.popular, ...pools.moderate];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Popular + Moderate (mid-peak wind down)`);
    } else {
      selectedPools = [...pools.moderate, ...pools.deepCuts];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Moderate + Deep Cuts (mid-peak end)`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🎯 Position ${position}/${totalLength} (${Math.round(positionRatio * 100)}%) - Strategy: ${this.name}`
      );
      console.log(`   Available tracks: ${selectedPools.length}`);
    }

    return this.addFallbackIfNeeded(selectedPools, pools);
  }

  private addFallbackIfNeeded(
    selectedPools: TrackWithPopularity[],
    pools: any
  ): TrackWithPopularity[] {
    return addFallbackTracks(selectedPools, [
      ...pools.topHits,
      ...pools.popular,
      ...pools.moderate,
      ...pools.deepCuts,
    ]);
  }
}

/**
 * Crescendo Strategy - Build from deep cuts to biggest hits
 * Gradually builds energy from deep cuts to the most popular tracks
 */
export class CrescendoStrategy implements MixingStrategy {
  name: PopularityStrategy = 'crescendo';

  getTracksForPosition(
    popularityPools: PopularityPools,
    playlistId: string,
    position: number,
    totalLength: number
  ): TrackWithPopularity[] {
    const pools = popularityPools[playlistId];
    if (!pools) return [];

    const positionRatio = position / totalLength; // 0.0 to 1.0
    let selectedPools: TrackWithPopularity[] = [];

    // Build from deep cuts to biggest hits
    if (positionRatio < 0.3) {
      selectedPools = [...pools.deepCuts, ...pools.moderate];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Deep Cuts + Moderate (crescendo start)`);
    } else if (positionRatio < 0.6) {
      selectedPools = [...pools.moderate, ...pools.popular];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Moderate + Popular (crescendo build)`);
    } else {
      selectedPools = [...pools.popular, ...pools.topHits];
      if (process.env.NODE_ENV === 'development')
        console.log(`   Using: Popular + Top Hits (crescendo finale)`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🎯 Position ${position}/${totalLength} (${Math.round(positionRatio * 100)}%) - Strategy: ${this.name}`
      );
      console.log(`   Available tracks: ${selectedPools.length}`);
    }

    return this.addFallbackIfNeeded(selectedPools, pools);
  }

  private addFallbackIfNeeded(
    selectedPools: TrackWithPopularity[],
    pools: any
  ): TrackWithPopularity[] {
    return addFallbackTracks(selectedPools, [
      ...pools.topHits,
      ...pools.popular,
      ...pools.moderate,
      ...pools.deepCuts,
    ]);
  }
}

/**
 * Strategy Manager - Factory pattern implementation for managing strategies
 * Provides centralized access to all mixing strategies
 */
export class DefaultStrategyManager implements StrategyManager {
  private strategies: Map<PopularityStrategy, MixingStrategy>;

  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set('mixed', new MixedStrategy());
    this.strategies.set('front-loaded', new FrontLoadedStrategy());
    this.strategies.set('mid-peak', new MidPeakStrategy());
    this.strategies.set('crescendo', new CrescendoStrategy());
  }

  getStrategy(strategyName: PopularityStrategy): MixingStrategy {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.warn(
        `⚠️ Unknown strategy '${strategyName}', falling back to 'mixed'`
      );
      return this.strategies.get('mixed') || new MixedStrategy();
    }
    return strategy;
  }

  getAllStrategies(): MixingStrategy[] {
    return Array.from(this.strategies.values());
  }
}

/**
 * Factory function to create a strategy manager instance
 */
export const createStrategyManager = (): StrategyManager => {
  return new DefaultStrategyManager();
};

/**
 * Add fallback tracks when strategy pools are exhausted
 * This ensures we always have tracks available even when specific strategy pools are empty
 */
export const addFallbackTracks = (
  strategyTracks: TrackWithPopularity[],
  allTracks: TrackWithPopularity[]
): TrackWithPopularity[] => {
  // If strategy pools are empty, use all tracks as fallback
  if (strategyTracks.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ⚠️ Fallback: Using all quadrants (strategy pools empty)`);
    }
    return allTracks;
  }

  // Add fallback pools to the end so strategy pools are preferred but fallback is available
  const fallbackTracks = allTracks.filter(
    track =>
      !strategyTracks.some(strategyTrack => strategyTrack.id === track.id)
  );

  if (fallbackTracks.length > 0) {
    const result = [...strategyTracks, ...fallbackTracks];
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `   📋 Strategy pools: ${strategyTracks.length}, Fallback pools: ${fallbackTracks.length}`
      );
    }
    return result;
  }

  return strategyTracks;
};
