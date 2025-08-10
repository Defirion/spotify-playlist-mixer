// Unit tests for the playlist mixer orchestrator

import {
  mixPlaylists,
  validateInputs,
  createMixingContext,
  calculateTargetCounts,
} from '../playlistMixer';
import { PlaylistTracks } from '../types';
import { MixOptions, RatioConfig } from '../../../types/mixer';

// Mock data
const mockPlaylistTracks: PlaylistTracks = {
  playlist1: [
    {
      id: '1',
      name: 'Song 1',
      uri: 'spotify:track:1',
      artists: [
        {
          id: 'artist1',
          name: 'Artist 1',
          uri: 'spotify:artist:1',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'album1',
        name: 'Album 1',
        images: [],
        release_date: '2023-01-01',
        uri: 'spotify:album:1',
        external_urls: { spotify: '' },
      },
      duration_ms: 180000,
      explicit: false,
      popularity: 80,
      preview_url: null,
      track_number: 1,
      external_urls: { spotify: '' },
    },
    {
      id: '2',
      name: 'Song 2',
      uri: 'spotify:track:2',
      artists: [
        {
          id: 'artist2',
          name: 'Artist 2',
          uri: 'spotify:artist:2',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'album2',
        name: 'Album 2',
        images: [],
        release_date: '2022-01-01',
        uri: 'spotify:album:2',
        external_urls: { spotify: '' },
      },
      duration_ms: 200000,
      explicit: false,
      popularity: 60,
      preview_url: null,
      track_number: 1,
      external_urls: { spotify: '' },
    },
  ],
  playlist2: [
    {
      id: '3',
      name: 'Song 3',
      uri: 'spotify:track:3',
      artists: [
        {
          id: 'artist3',
          name: 'Artist 3',
          uri: 'spotify:artist:3',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'album3',
        name: 'Album 3',
        images: [],
        release_date: '2021-01-01',
        uri: 'spotify:album:3',
        external_urls: { spotify: '' },
      },
      duration_ms: 190000,
      explicit: false,
      popularity: 70,
      preview_url: null,
      track_number: 1,
      external_urls: { spotify: '' },
    },
  ],
};

const mockRatioConfig: RatioConfig = {
  playlist1: { min: 1, max: 2, weight: 2, weightType: 'frequency' },
  playlist2: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
};

const mockOptions: MixOptions = {
  totalSongs: 3,
  targetDuration: 10,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'Test Mix',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: false,
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
      expect(context.popularityPools).toBeDefined();
      expect(context.totalWeight).toBe(3); // 2 + 1
      expect(context.estimatedTotalSongs).toBe(3);
      expect(context.targetCounts).toBeDefined();
    });
  });

  describe('calculateTargetCounts', () => {
    it('should calculate correct target counts for frequency-based weighting', () => {
      const playlistIds = ['playlist1', 'playlist2'];
      const totalWeight = 3; // 2 + 1

      const result = calculateTargetCounts(
        mockPlaylistTracks,
        mockRatioConfig,
        mockOptions,
        playlistIds,
        totalWeight
      );

      expect(result.estimatedTotalSongs).toBe(3);
      expect(result.targetCounts['playlist1']).toBe(2); // 3 * (2/3) = 2
      expect(result.targetCounts['playlist2']).toBe(1); // 3 * (1/3) = 1
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
      expect(result.every(track => track.id && track.name && track.uri)).toBe(
        true
      );
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

    it('should handle different popularity strategies', () => {
      const strategies = [
        'mixed',
        'front-loaded',
        'mid-peak',
        'crescendo',
      ] as const;

      strategies.forEach(strategy => {
        const options = { ...mockOptions, popularityStrategy: strategy };
        const result = mixPlaylists(
          mockPlaylistTracks,
          mockRatioConfig,
          options
        );

        expect(result.length).toBeGreaterThan(0);
        expect(result.every(track => track.sourcePlaylist)).toBe(true);
      });
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
