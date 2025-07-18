import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ISpotifyService, IAuthService } from '../types/services';
import { User, Playlist, Track, AuthResult } from '../types';
import { createAPIError, createNetworkError, APIError, NetworkError } from '../types/errors';

export class SpotifyService implements ISpotifyService {
  private static readonly API_BASE_URL = 'https://api.spotify.com/v1';
  private static readonly AUTH_BASE_URL = 'https://accounts.spotify.com';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second
  
  private axiosInstance: AxiosInstance;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(private authService: IAuthService) {
    this.axiosInstance = axios.create({
      baseURL: SpotifyService.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  async authenticate(): Promise<AuthResult> {
    return this.authService.login();
  }

  async getUserProfile(): Promise<User> {
    try {
      const response = await this.makeRequest<any>('/me');
      
      return {
        id: response.id,
        displayName: response.display_name || response.id,
        email: response.email
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get user profile', '/me', 'GET');
    }
  }

  async getUserPlaylists(limit: number = 50, offset: number = 0): Promise<Playlist[]> {
    try {
      const response = await this.makeRequest<any>(`/me/playlists?limit=${limit}&offset=${offset}`);
      
      return response.items.map((item: any) => this.mapToPlaylist(item));
    } catch (error) {
      throw this.handleError(error, 'Failed to get user playlists', '/me/playlists', 'GET');
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    try {
      const tracks: Track[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.makeRequest<any>(
          `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
        );

        const trackItems = response.items
          .filter((item: any) => item.track && item.track.id && item.track.duration_ms)
          .map((item: any) => this.mapToTrack(item.track));

        tracks.push(...trackItems);

        if (response.items.length < limit) {
          break;
        }

        offset += limit;
      }

      return tracks;
    } catch (error) {
      throw this.handleError(error, 'Failed to get playlist tracks', `/playlists/${playlistId}/tracks`, 'GET');
    }
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    try {
      // First get the current user ID
      const user = await this.getUserProfile();
      
      const response = await this.makeRequest<any>(`/users/${user.id}/playlists`, {
        method: 'POST',
        data: {
          name: name.trim(),
          description: description || '',
          public: false
        }
      });

      return this.mapToPlaylist(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create playlist', '/users/{userId}/playlists', 'POST');
    }
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    try {
      // Spotify API has a limit of 100 tracks per request
      const chunks = this.chunkArray(trackUris, 100);

      for (const chunk of chunks) {
        await this.makeRequest<any>(`/playlists/${playlistId}/tracks`, {
          method: 'POST',
          data: {
            uris: chunk
          }
        });
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to add tracks to playlist', `/playlists/${playlistId}/tracks`, 'POST');
    }
  }

  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const response = await this.makeRequest<any>(
        `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
      );

      return (response.tracks?.items || []).map((track: any) => this.mapToTrack(track));
    } catch (error) {
      throw this.handleError(error, 'Failed to search tracks', '/search', 'GET');
    }
  }

  async searchPlaylists(query: string, limit: number = 10): Promise<Playlist[]> {
    try {
      const response = await this.makeRequest<any>(
        `/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`
      );

      return (response.playlists?.items || []).map((playlist: any) => this.mapToPlaylist(playlist));
    } catch (error) {
      throw this.handleError(error, 'Failed to search playlists', '/search', 'GET');
    }
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    try {
      const response = await this.makeRequest<any>(`/playlists/${playlistId}`);
      return this.mapToPlaylist(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get playlist', `/playlists/${playlistId}`, 'GET');
    }
  }

  async getTrack(trackId: string): Promise<Track> {
    try {
      const response = await this.makeRequest<any>(`/tracks/${trackId}`);
      return this.mapToTrack(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get track', `/tracks/${trackId}`, 'GET');
    }
  }

  async getMultipleTracks(trackIds: string[]): Promise<Track[]> {
    try {
      // Spotify API has a limit of 50 tracks per request
      const chunks = this.chunkArray(trackIds, 50);
      const allTracks: Track[] = [];

      for (const chunk of chunks) {
        const response = await this.makeRequest<any>(`/tracks?ids=${chunk.join(',')}`);
        const tracks = (response.tracks || [])
          .filter((track: any) => track && track.id)
          .map((track: any) => this.mapToTrack(track));
        allTracks.push(...tracks);
      }

      return allTracks;
    } catch (error) {
      throw this.handleError(error, 'Failed to get multiple tracks', '/tracks', 'GET');
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = this.authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Rate limiting
        await this.handleRateLimit();

        // Logging
        this.logRequest(config);

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      async (error) => {
        this.logError(error);

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401) {
          // Token expired, trigger re-authentication
          this.authService.onTokenExpired(() => {
            // This will be handled by the auth context
          });
        }

        // Handle 429 Rate Limited
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : SpotifyService.RATE_LIMIT_DELAY;
          
          await this.delay(delay);
          
          // Retry the request
          return this.axiosInstance.request(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(url: string, options?: any): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= SpotifyService.MAX_RETRIES; attempt++) {
      try {
        const response = options 
          ? await this.axiosInstance.request({ url, ...options })
          : await this.axiosInstance.get(url);
        
        return response.data;
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === SpotifyService.MAX_RETRIES) {
          break;
        }

        // Wait before retrying
        await this.delay(SpotifyService.RETRY_DELAY * attempt);
      }
    }

    throw lastError;
  }

  private async handleRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Simple rate limiting: max 1 request per 100ms
    if (timeSinceLastRequest < 100) {
      await this.delay(100 - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private mapToPlaylist(spotifyPlaylist: any): Playlist {
    return {
      id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description || undefined,
      trackCount: spotifyPlaylist.tracks?.total || 0,
      owner: {
        id: spotifyPlaylist.owner?.id || 'unknown',
        displayName: spotifyPlaylist.owner?.display_name || 'Unknown User'
      },
      images: (spotifyPlaylist.images || []).map((img: any) => ({
        url: img.url,
        height: img.height,
        width: img.width
      }))
    };
  }

  private mapToTrack(spotifyTrack: any): Track {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      artists: (spotifyTrack.artists || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        uri: artist.uri
      })),
      album: {
        id: spotifyTrack.album?.id || 'unknown',
        name: spotifyTrack.album?.name || 'Unknown Album',
        artists: (spotifyTrack.album?.artists || []).map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri
        })),
        images: (spotifyTrack.album?.images || []).map((img: any) => ({
          url: img.url,
          height: img.height,
          width: img.width
        })),
        release_date: spotifyTrack.album?.release_date || ''
      },
      duration_ms: spotifyTrack.duration_ms || 0,
      popularity: spotifyTrack.popularity || 0,
      uri: spotifyTrack.uri,
      preview_url: spotifyTrack.preview_url || undefined
    };
  }

  private handleError(error: any, defaultMessage: string, endpoint: string, method: string): APIError | NetworkError {
    if (error.response) {
      // HTTP error response
      return createAPIError(
        error.response.data?.error?.message || defaultMessage,
        endpoint,
        method,
        error.response.data,
        {
          status: error.response.status,
          statusText: error.response.statusText,
          originalError: error
        }
      );
    } else if (error.request) {
      // Network error
      return createNetworkError(
        'Network error occurred',
        undefined,
        undefined,
        { originalError: error, endpoint, method }
      );
    } else {
      // Other error
      return createAPIError(
        error.message || defaultMessage,
        endpoint,
        method,
        undefined,
        { originalError: error }
      );
    }
  }

  private logRequest(config: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SpotifyService] ${config.method?.toUpperCase()} ${config.url}`);
    }
  }

  private logResponse(response: AxiosResponse): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SpotifyService] ${response.status} ${response.config.url}`);
    }
  }

  private logError(error: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SpotifyService] Error:`, {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      });
    }
  }
}