import { getSpotifyApi } from '../utils/spotify';

/**
 * Centralized Spotify API service class
 * Handles all Spotify API interactions with automatic pagination, error handling, and retry logic
 */
class SpotifyService {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required for SpotifyService');
    }
    this.api = getSpotifyApi(accessToken);
    this.accessToken = accessToken;
  }

  /**
   * Generic retry wrapper for API calls
   * @param {Function} apiCall - The API call function to retry
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} - The API response
   */
  async withRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw this.createSpotifyError(error, 'Authentication failed');
        }

        if (error.response?.status === 400) {
          throw this.createSpotifyError(error, 'Bad request');
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;

        console.warn(
          `API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`,
          error.message
        );

        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw this.createSpotifyError(lastError, 'API call failed after retries');
  }

  /**
   * Create a standardized error object
   * @param {Error} originalError - The original error
   * @param {string} message - Custom error message
   * @returns {Error} - Standardized error object
   */
  createSpotifyError(originalError, message) {
    const error = new Error(message);
    error.originalError = originalError;
    error.status = originalError.response?.status;
    error.statusText = originalError.response?.statusText;
    error.data = originalError.response?.data;
    return error;
  }

  /**
   * Search for tracks on Spotify
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.limit - Number of results to return (default: 20, max: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.market - Market code for track availability
   * @returns {Promise<Object>} - Search results with tracks array and pagination info
   */
  async searchTracks(query, options = {}) {
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
        type: 'track',
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (market) {
        params.append('market', market);
      }

      const response = await this.api.get(`/search?${params.toString()}`);

      return {
        tracks: response.data.tracks.items.filter(track => track && track.id),
        total: response.data.tracks.total,
        limit: response.data.tracks.limit,
        offset: response.data.tracks.offset,
        hasMore:
          response.data.tracks.offset + response.data.tracks.limit <
          response.data.tracks.total,
      };
    });
  }

  /**
   * Get all tracks from a playlist with automatic pagination
   * @param {string} playlistId - Spotify playlist ID
   * @param {Object} options - Options for fetching tracks
   * @param {string} options.market - Market code for track availability
   * @param {Function} options.onProgress - Progress callback function
   * @returns {Promise<Array>} - Array of all tracks in the playlist
   */
  async getPlaylistTracks(playlistId, options = {}) {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const { market, onProgress } = options;
    let allTracks = [];
    let offset = 0;
    const limit = 100; // Maximum allowed by Spotify API
    let totalTracks = null;

    while (true) {
      const currentOffset = offset;
      const currentTotalTracks = totalTracks;

      const result = await this.withRetry(async () => {
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
      });

      // Set total on first request
      if (totalTracks === null && result.totalTracks) {
        totalTracks = result.totalTracks;
      }

      const tracks = result.items
        .filter(item => item.track && item.track.id) // Filter out null/invalid tracks
        .map(item => ({
          ...item.track,
          added_at: item.added_at,
          added_by: item.added_by,
        }));

      allTracks = [...allTracks, ...tracks];

      // Call progress callback if provided
      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          loaded: allTracks.length,
          total: totalTracks,
          percentage:
            totalTracks > 0
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

    return allTracks;
  }

  /**
   * Get user's playlists with automatic pagination
   * @param {Object} options - Options for fetching playlists
   * @param {number} options.limit - Number of playlists per request (default: 50, max: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {boolean} options.all - Fetch all playlists automatically (default: false)
   * @returns {Promise<Object>} - Playlists data with pagination info
   */
  async getUserPlaylists(options = {}) {
    const { limit = 50, offset = 0, all = false } = options;

    if (limit > 50) {
      throw new Error('Limit cannot exceed 50 for playlist requests');
    }

    if (all) {
      // Fetch all playlists automatically
      let allPlaylists = [];
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
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile() {
    return this.withRetry(async () => {
      const response = await this.api.get('/me');
      return response.data;
    });
  }

  /**
   * Create a new playlist for the user
   * @param {string} userId - Spotify user ID
   * @param {Object} playlistData - Playlist creation data
   * @param {string} playlistData.name - Playlist name
   * @param {string} playlistData.description - Playlist description (optional)
   * @param {boolean} playlistData.public - Whether playlist is public (default: false)
   * @param {boolean} playlistData.collaborative - Whether playlist is collaborative (default: false)
   * @returns {Promise<Object>} - Created playlist data
   */
  async createPlaylist(userId, playlistData) {
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
   * @param {string} playlistId - Spotify playlist ID
   * @param {Array<string>} trackUris - Array of Spotify track URIs
   * @param {number} position - Position to insert tracks (optional)
   * @returns {Promise<Object>} - Response with snapshot_id
   */
  async addTracksToPlaylist(playlistId, trackUris, position = null) {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    if (!Array.isArray(trackUris) || trackUris.length === 0) {
      throw new Error('Track URIs array is required and cannot be empty');
    }

    // Spotify API allows maximum 100 tracks per request
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);

      const result = await this.withRetry(async () => {
        const requestBody = { uris: batch };

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
   * @param {string} playlistId - Spotify playlist ID
   * @param {Array<Object>} tracks - Array of track objects with uri and positions
   * @returns {Promise<Object>} - Response with snapshot_id
   */
  async removeTracksFromPlaylist(playlistId, tracks) {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('Tracks array is required and cannot be empty');
    }

    return this.withRetry(async () => {
      const response = await this.api.delete(
        `/playlists/${playlistId}/tracks`,
        {
          data: { tracks },
        }
      );

      return response.data;
    });
  }

  /**
   * Get a specific playlist's details
   * @param {string} playlistId - Spotify playlist ID
   * @param {Object} options - Options for fetching playlist
   * @param {string} options.market - Market code for track availability
   * @param {string} options.fields - Comma-separated list of fields to return
   * @returns {Promise<Object>} - Playlist data
   */
  async getPlaylist(playlistId, options = {}) {
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
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.limit - Number of results to return (default: 20, max: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.market - Market code for playlist availability
   * @returns {Promise<Object>} - Search results with playlists array and pagination info
   */
  async searchPlaylists(query, options = {}) {
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
}

export default SpotifyService;
