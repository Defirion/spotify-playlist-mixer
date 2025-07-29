import { getSpotifyApi } from '../utils/spotify';
import { ApiErrorHandler } from './apiErrorHandler';
import {
  ISpotifyService,
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyUserProfile,
  SearchTracksOptions,
  GetPlaylistTracksOptions,
  GetUserPlaylistsOptions,
  SpotifyCreatePlaylistRequest,
  SpotifyAddTracksRequest,
  SpotifyRemoveTracksRequest,
} from '../types';

interface SearchResult {
  items: SpotifyTrack[];
  tracks: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface PlaylistsResult {
  items: SpotifyPlaylist[];
  playlists: SpotifyPlaylist[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Centralized Spotify API service class
 * Handles all Spotify API interactions with automatic pagination, error handling, and retry logic
 */
class SpotifyService implements ISpotifyService {
  private api: any;
  private accessToken: string;
  private errorHandler: ApiErrorHandler;

  constructor(accessToken: string, errorHandler?: ApiErrorHandler | null) {
    if (!accessToken) {
      throw new Error('Access token is required for SpotifyService');
    }
    this.api = getSpotifyApi(accessToken);
    this.accessToken = accessToken;
    this.errorHandler =
      errorHandler ||
      new ApiErrorHandler({
        enableLogging: process.env.NODE_ENV === 'development',
      });
  }

  /**
   * Set access token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.api = getSpotifyApi(token);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Generic retry wrapper for API calls using the centralized error handler
   */
  private async withRetry<T>(
    apiCall: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    return this.errorHandler.withRetry(apiCall, {
      service: 'SpotifyService',
      accessToken: this.accessToken ? 'present' : 'missing',
      ...context,
    });
  }

  /**
   * Search for tracks on Spotify
   */
  async searchTracks(
    query: string,
    options: SearchTracksOptions = {}
  ): Promise<SearchResult> {
    const { limit = 20, offset = 0, market } = options;

    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    if (limit > 50) {
      throw new Error('Limit cannot exceed 50 for search requests');
    }

    return this.withRetry(
      async () => {
        const params = new URLSearchParams({
          q: query.trim(),
          type: 'track',
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (market) {
          params.append('market', market);
        }

        const response = await this.api.get(`/search?${params.toString()}`);

        const filteredTracks = response.data.tracks.items.filter(
          (track: any) => track && track.id
        );
        return {
          items: filteredTracks,
          tracks: filteredTracks,
          total: response.data.tracks.total,
          limit: response.data.tracks.limit,
          offset: response.data.tracks.offset,
          hasMore:
            response.data.tracks.offset + response.data.tracks.limit <
            response.data.tracks.total,
        };
      },
      {
        operation: 'searchTracks',
        query: query.substring(0, 50), // Truncate for logging
        limit,
        offset,
      }
    );
  }

  /**
   * Get all tracks from a playlist with automatic pagination
   */
  async getPlaylistTracks(
    playlistId: string,
    options: GetPlaylistTracksOptions = {}
  ): Promise<{ tracks: SpotifyTrack[]; total: number; hasMore: boolean }> {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const { market, onProgress } = options;
    let allTracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = 100; // Maximum allowed by Spotify API
    let totalTracks: number | null = null;

    while (true) {
      const currentOffset = offset;
      const currentTotalTracks = totalTracks;

      const result = await this.withRetry(
        async () => {
          const params = new URLSearchParams({
            offset: currentOffset.toString(),
            limit: limit.toString(),
          });

          if (market) {
            params.append('market', market);
          }

          const response = await this.api.get(
            `/playlists/${playlistId}/tracks?${params.toString()}`
          );

          // Set total on first request
          if (currentTotalTracks === null) {
            return {
              ...response.data,
              totalTracks: response.data.total,
            };
          }

          return response.data;
        },
        {
          operation: 'getPlaylistTracks',
          playlistId,
          offset: currentOffset,
          limit,
        }
      );

      // Set total on first request
      if (totalTracks === null && result.totalTracks) {
        totalTracks = result.totalTracks;
      }

      const tracks = result.items
        .filter((item: any) => item.track && item.track.id) // Filter out null/invalid tracks
        .map((item: any) => ({
          ...item.track,
          added_at: item.added_at,
          added_by: item.added_by,
        }));

      allTracks = [...allTracks, ...tracks];

      // Call progress callback if provided
      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          loaded: allTracks.length,
          total: totalTracks || 0,
          percentage:
            totalTracks && totalTracks > 0
              ? Math.round((allTracks.length / totalTracks) * 100)
              : 0,
        });
      }

      // Break if we've fetched all tracks
      if (tracks.length < limit) {
        break;
      }

      offset += limit;
    }

    return {
      tracks: allTracks,
      total: totalTracks || allTracks.length,
      hasMore: false,
    };
  }

  /**
   * Get user's playlists with automatic pagination
   */
  async getUserPlaylists(
    options: GetUserPlaylistsOptions = {}
  ): Promise<PlaylistsResult> {
    const { limit = 50, offset = 0, all = false } = options;

    if (limit > 50) {
      throw new Error('Limit cannot exceed 50 for playlist requests');
    }

    if (all) {
      // Fetch all playlists automatically
      let allPlaylists: SpotifyPlaylist[] = [];
      let currentOffset = 0;
      const pageLimit = 50;

      while (true) {
        const currentOffsetValue = currentOffset;

        const result = await this.withRetry(async () => {
          const response = await this.api.get(
            `/me/playlists?limit=${pageLimit}&offset=${currentOffsetValue}`
          );
          return response.data;
        });

        allPlaylists = [...allPlaylists, ...result.items];

        if (result.items.length < pageLimit) {
          break;
        }

        currentOffset += pageLimit;
      }

      return {
        items: allPlaylists,
        playlists: allPlaylists,
        total: allPlaylists.length,
        limit: allPlaylists.length,
        offset: 0,
        hasMore: false,
      };
    }

    // Fetch single page
    return this.withRetry(async () => {
      const response = await this.api.get(
        `/me/playlists?limit=${limit}&offset=${offset}`
      );

      return {
        items: response.data.items,
        playlists: response.data.items,
        total: response.data.total,
        limit: response.data.limit,
        offset: response.data.offset,
        hasMore:
          response.data.offset + response.data.limit < response.data.total,
      };
    });
  }

  /**
   * Get user's profile information
   */
  async getUserProfile(): Promise<SpotifyUserProfile> {
    return this.withRetry(async () => {
      const response = await this.api.get('/me');
      return response.data;
    });
  }

  /**
   * Create a new playlist for the user
   */
  async createPlaylist(
    userId: string,
    playlistData: SpotifyCreatePlaylistRequest
  ): Promise<SpotifyPlaylist> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!playlistData?.name) {
      throw new Error('Playlist name is required');
    }

    const {
      name,
      description = '',
      public: isPublic = false,
      collaborative = false,
    } = playlistData;

    return this.withRetry(async () => {
      const response = await this.api.post(`/users/${userId}/playlists`, {
        name,
        description,
        public: isPublic,
        collaborative,
      });

      return response.data;
    });
  }

  /**
   * Add tracks to a playlist (handles batching for large track lists)
   */
  async addTracksToPlaylist(
    playlistId: string,
    request: SpotifyAddTracksRequest
  ): Promise<{ snapshot_id: string }> {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const { uris: trackUris, position } = request;

    if (!Array.isArray(trackUris) || trackUris.length === 0) {
      throw new Error('Track URIs array is required and cannot be empty');
    }

    // Spotify API allows maximum 100 tracks per request
    const batchSize = 100;
    const results: { snapshot_id: string }[] = [];

    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);

      const result = await this.withRetry(async () => {
        const requestBody: SpotifyAddTracksRequest = { uris: batch };

        // Only add position for the first batch
        if (position !== null && i === 0) {
          requestBody.position = position;
        }

        const response = await this.api.post(
          `/playlists/${playlistId}/tracks`,
          requestBody
        );
        return response.data;
      });

      results.push(result);
    }

    // Return the last snapshot_id
    return results[results.length - 1];
  }

  /**
   * Remove tracks from a playlist
   */
  async removeTracksFromPlaylist(
    playlistId: string,
    request: SpotifyRemoveTracksRequest
  ): Promise<{ snapshot_id: string }> {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const { tracks } = request;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('Tracks array is required and cannot be empty');
    }

    return this.withRetry(async () => {
      const response = await this.api.delete(
        `/playlists/${playlistId}/tracks`,
        {
          data: request,
        }
      );

      return response.data;
    });
  }

  /**
   * Get a specific playlist's details
   */
  async getPlaylist(
    playlistId: string,
    options: { market?: string; fields?: string } = {}
  ): Promise<SpotifyPlaylist> {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const { market, fields } = options;

    return this.withRetry(async () => {
      const params = new URLSearchParams();

      if (market) {
        params.append('market', market);
      }

      if (fields) {
        params.append('fields', fields);
      }

      const queryString = params.toString();
      const url = `/playlists/${playlistId}${queryString ? `?${queryString}` : ''}`;

      const response = await this.api.get(url);
      return response.data;
    });
  }

  /**
   * Search for playlists
   */
  async searchPlaylists(
    query: string,
    options: { limit?: number; offset?: number; market?: string } = {}
  ): Promise<{
    playlists: SpotifyPlaylist[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 20, offset = 0, market } = options;

    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    if (limit > 50) {
      throw new Error('Limit cannot exceed 50 for search requests');
    }

    return this.withRetry(async () => {
      const params = new URLSearchParams({
        q: query.trim(),
        type: 'playlist',
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (market) {
        params.append('market', market);
      }

      const response = await this.api.get(`/search?${params.toString()}`);

      return {
        playlists: response.data.playlists.items,
        total: response.data.playlists.total,
        limit: response.data.playlists.limit,
        offset: response.data.playlists.offset,
        hasMore:
          response.data.playlists.offset + response.data.playlists.limit <
          response.data.playlists.total,
      };
    });
  }

  /**
   * Get audio features for a track
   */
  async getTrackAudioFeatures(trackId: string): Promise<any> {
    if (!trackId) {
      throw new Error('Track ID is required');
    }

    return this.withRetry(async () => {
      const response = await this.api.get(`/audio-features/${trackId}`);
      return response.data;
    });
  }

  /**
   * Get audio features for multiple tracks
   */
  async getMultipleTrackAudioFeatures(trackIds: string[]): Promise<any[]> {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      throw new Error('Track IDs array is required and cannot be empty');
    }

    return this.withRetry(async () => {
      const ids = trackIds.join(',');
      const response = await this.api.get(`/audio-features?ids=${ids}`);
      return response.data.audio_features;
    });
  }
}

export default SpotifyService;
