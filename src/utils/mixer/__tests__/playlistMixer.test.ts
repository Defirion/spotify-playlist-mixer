// Unit tests for the playlist mixer orchestrator

import {
  mixPlaylists,
  validateInputs,
  createMixingContext,
} from '../playlistMixer';
import { PlaylistTracks } from '../types';
import { MixOptions, RatioConfig } from '../../../types/mixer';

import { makeTrack } from './fixtures';

const mockPlaylistTracks: PlaylistTracks = {
  playlist1: [
    makeTrack('1', { id: '1', durationMs: 180000 }),
    makeTrack('2', { id: '2', durationMs: 200000 }),
  ],
  playlist2: [makeTrack('3', { id: '3', durationMs: 190000 })],
};

const mockRatioConfig: RatioConfig = {
  playlist1: { min: 1, max: 2, weight: 2, weightType: 'frequency' },
  playlist2: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
};

const mockOptions: MixOptions = {
  totalSongs: 3,
  targetDurationSeconds: 10,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'Test Mix',
  shuffleTracks: true,
  continueWhenPlaylistEmpty: true,
};

describe('Playlist Mixer Orchestrator', () => {
  describe('validateInputs', () => {
    it('should validate correct inputs', () => {
      const result = validateInputs(
        mockPlaylistTracks,
        mockRatioConfig,
        mockOptions
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cleanedPlaylistTracks).toEqual(mockPlaylistTracks);
    });

    it('should reject empty playlist tracks', () => {
      const result = validateInputs({}, mockRatioConfig, mockOptions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'No valid playlists found after cleaning'
      );
    });

    it('should reject empty ratio config', () => {
      const result = validateInputs(mockPlaylistTracks, {}, mockOptions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ratioConfig is empty or invalid');
    });

    it('should reject invalid options', () => {
      const invalidOptions = { ...mockOptions, totalSongs: 0 };
      const result = validateInputs(
        mockPlaylistTracks,
        mockRatioConfig,
        invalidOptions
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'totalSongs must be positive when not using time limit or all songs'
      );
    });
  });

  describe('createMixingContext', () => {
    it('should create a valid mixing context', () => {
      const context = createMixingContext(
        mockPlaylistTracks,
        mockRatioConfig,
        mockOptions
      );

      expect(context.playlistTracks).toEqual(mockPlaylistTracks);
      expect(context.ratioConfig).toEqual(mockRatioConfig);
      expect(context.options).toEqual(mockOptions);
      expect(context.playlistQueues).toBeDefined();
      expect(context.totalWeight).toBe(3); // 2 + 1
    });
  });

  describe('mixPlaylists', () => {
    it('should create a mixed playlist with correct number of tracks', () => {
      const result = mixPlaylists(
        mockPlaylistTracks,
        mockRatioConfig,
        mockOptions
      );

      expect(result).toHaveLength(3);
      expect(result.every(track => track.sourcePlaylist)).toBe(true);
      expect(result.every(track => track.id && track.title)).toBe(true);
    });

    it('should respect playlist ratios', () => {
      const result = mixPlaylists(
        mockPlaylistTracks,
        mockRatioConfig,
        mockOptions
      );

      const playlist1Count = result.filter(
        track => track.sourcePlaylist === 'playlist1'
      ).length;
      const playlist2Count = result.filter(
        track => track.sourcePlaylist === 'playlist2'
      ).length;

      // Should have approximately 2:1 ratio (playlist1:playlist2)
      expect(playlist1Count).toBeGreaterThanOrEqual(1);
      expect(playlist2Count).toBeGreaterThanOrEqual(1);
      expect(playlist1Count + playlist2Count).toBe(3);
    });

    it('should return empty array for invalid inputs', () => {
      const result = mixPlaylists({}, mockRatioConfig, mockOptions);
      expect(result).toHaveLength(0);
    });

    it('preserves playlist order when shuffling is disabled', () => {
      const options = { ...mockOptions, shuffleTracks: false };
      const result = mixPlaylists(mockPlaylistTracks, mockRatioConfig, options);

      expect(result.map(track => track.id)).toEqual(['1', '3', '2']);
    });

    it('should handle useAllSongs option', () => {
      const options = { ...mockOptions, useAllSongs: true };
      const result = mixPlaylists(mockPlaylistTracks, mockRatioConfig, options);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3); // Total available tracks
    });

    it('should handle time-based weighting', () => {
      const timeBasedRatioConfig: RatioConfig = {
        playlist1: { min: 1, max: 2, weight: 2, weightType: 'time' },
        playlist2: { min: 1, max: 1, weight: 1, weightType: 'time' },
      };

      const result = mixPlaylists(
        mockPlaylistTracks,
        timeBasedRatioConfig,
        mockOptions
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(track => track.sourcePlaylist)).toBe(true);
    });
  });
});
