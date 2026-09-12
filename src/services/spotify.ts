import { getSpotifyApi } from '../utils/spotify';
import type { FetchInstance } from './fetchClient';
import { ApiErrorHandler, ApiError, ERROR_TYPES } from './apiErrorHandler';
import chunkArray from './_helpers/batching';
import buildAddRequestBody from './_helpers/requestBody';
import paginate from './_helpers/pagination';
import retryWithBackoff from './_helpers/retry';
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

const SPOTIFY_SEARCH_LIMIT = 10;
const SPOTIFY_PLAYLIST_ITEMS_LIMIT = 50;

/**
 * Centralized Spotify API service class
 * Handles all Spotify API interactions with automatic pagination, error handling, and retry logic
 */
class SpotifyService implements ISpotifyService {
  private api: any;
  private accessToken: string | null = null;
  private errorHandler: ApiErrorHandler;

  /**
   * Constructor supports two signatures for gradual migration to dependency injection:
   * 1. new SpotifyService(accessToken: string, errorHandler?) - legacy form
   * 2. new SpotifyService(apiClient: FetchInstance, errorHandler?) - DI form
   */
  constructor(
    accessTokenOrClient: string | FetchInstance,
    errorHandler?: ApiErrorHandler | null
  ) {
    // Determine which signature was used
    if (
      typeof accessTokenOrClient === 'string' ||
      accessTokenOrClient == null
    ) {
      const accessToken = accessTokenOrClient as string;
      if (!accessToken) {
        throw new ApiError(
          ERROR_TYPES.BAD_REQUEST,
          new Error('Access token is required for SpotifyService'),
          { service: 'SpotifyService', operation: 'constructor' }
        );
      }
      this.api = getSpotifyApi(accessToken);
      this.accessToken = accessToken;
    } else {
      // Dependency injection form
      this.api = accessTokenOrClient;
      // Try to infer token from provided client headers if present
      try {
        const auth = (this.api?.defaults?.headers?.Authorization ||
          this.api?.defaults?.headers?.authorization) as string | undefined;
        if (auth) {
          this.accessToken = auth.replace(/^Bearer\s+/i, '');
        }
      } catch (_) {
        // ignore
      }
    }

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
    // If the service was constructed with a DI client, attempt to update its headers; otherwise rebuild.
    if (this.api && this.api.defaults && this.api.defaults.headers) {
      try {
        this.api.defaults.headers.Authorization = `Bearer ${token}`;
        return;
      } catch (_) {
        // fall through to rebuild
      }
    }
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
    const { limit = 5, offset = 0, market } = options;

    if (!query || query.trim() === '') {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Search query cannot be empty'),
        { operation: 'searchTracks' }
      );
    }

    if (limit > SPOTIFY_SEARCH_LIMIT) {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error(
          `Limit cannot exceed ${SPOTIFY_SEARCH_LIMIT} for search requests`
        ),
        { operation: 'searchTracks', limit }
      );
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
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist ID is required'),
        { operation: 'getPlaylistTracks' }
      );
    }

    const { market, onProgress } = options;
    const allTracks: SpotifyTrack[] = [];
    const limit = SPOTIFY_PLAYLIST_ITEMS_LIMIT;
    let totalTracks: number | null = null;

    const fetchPage = async (cursor?: string | null) => {
      const offset = cursor ? Number(cursor) : 0;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      });

      if (market) {
        params.append('market', market);
      }

      const response = await this.withRetry(
        async () => {
          return (
            await this.api.get(
              `/playlists/${playlistId}/items?${params.toString()}`
            )
          ).data;
        },
        { operation: 'getPlaylistTracks', playlistId, offset, limit }
      );

      if (totalTracks === null && typeof response.total === 'number') {
        totalTracks = response.total;
      }

      const items = (response.items || [])
        .map((item: any) => ({
          ...(item.item ?? item.track),
          added_at: item.added_at,
          added_by: item.added_by,
        }))
        .filter((t: any) => t && t.id);

      const responseLimit =
        typeof response.limit === 'number' ? response.limit : limit;
      const responseOffset =
        typeof response.offset === 'number' ? response.offset : offset;
      const hasNextPage =
        response.next !== undefined
          ? Boolean(response.next)
          : responseOffset + responseLimit < (response.total || 0);
      const nextCursor = hasNextPage
        ? String(responseOffset + responseLimit)
        : null;

      return { items, next_cursor: nextCursor };
    };

    for await (const track of paginate<SpotifyTrack>(fetchPage)) {
      allTracks.push(track);
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
    }

    // Ensure progress callback is invoked at least once (even if there are no items)
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
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Limit cannot exceed 50 for playlist requests'),
        { operation: 'getUserPlaylists', limit }
      );
    }

    if (all) {
      // Fetch all playlists automatically using the paginate helper
      const allPlaylists: SpotifyPlaylist[] = [];
      const pageLimit = 50;

      const fetchPage = async (cursor?: string | null) => {
        const offset = cursor ? Number(cursor) : 0;
        // Use withRetry for each page fetch
        const response = await this.withRetry(async () => {
          return (
            await this.api.get(
              `/me/playlists?limit=${pageLimit}&offset=${offset}`
            )
          ).data;
        });

        const nextCursor =
          response.offset + response.limit < response.total
            ? String(response.offset + response.limit)
            : null;

        return { items: response.items, next_cursor: nextCursor };
      };

      for await (const pl of paginate<SpotifyPlaylist>(fetchPage)) {
        allPlaylists.push(pl);
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
    playlistData: SpotifyCreatePlaylistRequest
  ): Promise<SpotifyPlaylist> {
    if (!playlistData) {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist data is required'),
        { operation: 'createPlaylist' }
      );
    }

    if (!playlistData?.name) {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist name is required'),
        { operation: 'createPlaylist' }
      );
    }

    const {
      name,
      description = '',
      public: isPublic = false,
      collaborative = false,
    } = playlistData;

    return this.withRetry(async () => {
      const response = await this.api.post('/me/playlists', {
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
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist ID is required'),
        { operation: 'addTracksToPlaylist' }
      );
    }

    const { uris: trackUris, position } = request;

    // DEBUG: optionally log received trackUris (gated to keep tests quiet)
    if (process.env.DEBUG_SPOTIFY === '1') {
      // eslint-disable-next-line no-console
      console.log(
        'DEBUG (spotify.ts): addTracksToPlaylist received trackUris:',
        trackUris
      );
      // eslint-disable-next-line no-console
      console.log(
        'DEBUG (spotify.ts): addTracksToPlaylist received trackUris length:',
        trackUris.length
      );
    }

    if (!Array.isArray(trackUris) || trackUris.length === 0) {
      if (process.env.DEBUG_SPOTIFY === '1') {
        // eslint-disable-next-line no-console
        console.error(
          'DEBUG (spotify.ts): Validation failed: trackUris is not an array or is empty.',
          trackUris
        );
      }
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Track URIs array is required and cannot be empty'),
        { operation: 'addTracksToPlaylist' }
      );
    }

    // Spotify API allows maximum 100 tracks per request
    const batchSize = 100;
    const results: { snapshot_id: string }[] = [];

    const batches = chunkArray(trackUris, batchSize);
    for (const [batchIndex, batch] of batches.entries()) {
      // Build a deterministic request body and filter invalid URIs
      const requestBody = buildAddRequestBody(batch as any, {
        position: batchIndex === 0 ? position : undefined,
      }) as SpotifyAddTracksRequest;

      // Use retryWithBackoff to honor Retry-After headers on 429 responses.
      let lastError: any = null;
      let result: any;
      try {
        result = await retryWithBackoff(
          async () => {
            try {
              const response = await this.api.post(
                `/playlists/${playlistId}/items`,
                requestBody
              );
              return response.data;
            } catch (err: any) {
              lastError = err;
              throw err;
            }
          },
          {
            maxRetries: 3,
            baseMs: 200,
            getRetryAfter: () => {
              try {
                const ra =
                  lastError &&
                  lastError.response &&
                  lastError.response.headers &&
                  (lastError.response.headers['retry-after'] ||
                    lastError.response.headers['Retry-After']);
                return ra ? Number(ra) : null;
              } catch (e) {
                return null;
              }
            },
          }
        );
      } catch (err: any) {
        // Convert to ApiError with context so callers/tests receive ApiError
        const apiErr = this.errorHandler.handleError(err, {
          operation: 'addTracksToPlaylist',
          playlistId,
          batchIndex,
        });
        throw apiErr;
      }

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
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist ID is required'),
        { operation: 'removeTracksFromPlaylist' }
      );
    }

    const { items } = request;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Tracks array is required and cannot be empty'),
        { operation: 'removeTracksFromPlaylist' }
      );
    }

    return this.withRetry(async () => {
      const response = await this.api.delete(`/playlists/${playlistId}/items`, {
        data: { ...request, items },
      });

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
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Playlist ID is required'),
        { operation: 'getPlaylist' }
      );
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
    const { limit = 5, offset = 0, market } = options;

    if (!query || query.trim() === '') {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error('Search query cannot be empty'),
        { operation: 'searchPlaylists' }
      );
    }

    if (limit > SPOTIFY_SEARCH_LIMIT) {
      throw new ApiError(
        ERROR_TYPES.BAD_REQUEST,
        new Error(
          `Limit cannot exceed ${SPOTIFY_SEARCH_LIMIT} for search requests`
        ),
        { operation: 'searchPlaylists', limit }
      );
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
}

export default SpotifyService;
