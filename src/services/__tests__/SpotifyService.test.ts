import axios from 'axios';
import { SpotifyService } from '../SpotifyService';
import { IAuthService } from '../../types/services';
import { User, Playlist, Track } from '../../types';
import { CacheService } from '../CacheService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock CacheService
jest.mock('../CacheService');

// Mock AuthService
class MockAuthService implements IAuthService {
  private token: string | null = 'mock-token';
  private user: User | null = { id: 'user1', displayName: 'Test User' };
  private callbacks: (() => void)[] = [];

  async login() {
    return { token: this.token!, user: this.user!, expiresIn: 3600 };
  }

  async logout() {
    this.token = null;
    this.user = null;
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return this.token !== null;
  }

  getCurrentUser() {
    return this.user;
  }

  async refreshToken() {
    return this.token!;
  }

  onTokenExpired(callback: () => void) {
    this.callbacks.push(callback);
  }

  clearTokenExpiredCallbacks() {
    this.callbacks = [];
  }

  // Test helpers
  setToken(token: string | null) {
    this.token = token;
  }

  setUser(user: User | null) {
    this.user = user;
  }

  triggerTokenExpired() {
    this.callbacks.forEach(cb => cb());
  }
}

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;
  let mockAuthService: MockAuthService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
    
    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Clear all mocks before creating service
    jest.clearAllMocks();
    
    spotifyService = new SpotifyService(mockAuthService);
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.spotify.com/v1',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('should delegate to auth service', async () => {
      const result = await spotifyService.authenticate();
      
      expect(result.token).toBe('mock-token');
      expect(result.user.id).toBe('user1');
    });
  });

  describe('getUserProfile', () => {
    it('should fetch and return user profile', async () => {
      const mockResponse = {
        id: 'spotify-user-id',
        display_name: 'Spotify User',
        email: 'user@example.com'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const user = await spotifyService.getUserProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me');
      expect(user).toEqual({
        id: 'spotify-user-id',
        displayName: 'Spotify User',
        email: 'user@example.com'
      });
    });

    it('should handle missing display_name gracefully', async () => {
      const mockResponse = {
        id: 'spotify-user-id',
        email: 'user@example.com'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const user = await spotifyService.getUserProfile();

      expect(user.displayName).toBe('spotify-user-id');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(spotifyService.getUserProfile()).rejects.toThrow();
    });
  });

  describe('getUserPlaylists', () => {
    it('should fetch user playlists with default parameters', async () => {
      const mockResponse = {
        items: [
          {
            id: 'playlist1',
            name: 'My Playlist',
            description: 'Test playlist',
            tracks: { total: 10 },
            owner: { id: 'user1', display_name: 'User One' },
            images: [{ url: 'image.jpg', height: 300, width: 300 }]
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const playlists = await spotifyService.getUserPlaylists();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me/playlists?limit=50&offset=0');
      expect(playlists).toHaveLength(1);
      expect(playlists[0]).toEqual({
        id: 'playlist1',
        name: 'My Playlist',
        description: 'Test playlist',
        trackCount: 10,
        owner: { id: 'user1', displayName: 'User One' },
        images: [{ url: 'image.jpg', height: 300, width: 300 }]
      });
    });

    it('should use custom limit and offset parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { items: [] } });

      await spotifyService.getUserPlaylists(20, 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me/playlists?limit=20&offset=10');
    });
  });

  describe('getPlaylistTracks', () => {
    it('should fetch all tracks from a playlist', async () => {
      const mockResponse = {
        items: [
          {
            track: {
              id: 'track1',
              name: 'Track 1',
              artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
              album: {
                id: 'album1',
                name: 'Album 1',
                artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
                images: [],
                release_date: '2023-01-01'
              },
              duration_ms: 180000,
              popularity: 75,
              uri: 'spotify:track:track1',
              preview_url: 'preview.mp3'
            }
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const tracks = await spotifyService.getPlaylistTracks('playlist1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/playlists/playlist1/tracks?offset=0&limit=100');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe('track1');
      expect(tracks[0].name).toBe('Track 1');
    });

    it('should handle pagination for large playlists', async () => {
      // First page
      const firstPageResponse = {
        items: Array(100).fill(null).map((_, i) => ({
          track: {
            id: `track${i}`,
            name: `Track ${i}`,
            artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
            album: {
              id: 'album1',
              name: 'Album 1',
              artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
              images: [],
              release_date: '2023-01-01'
            },
            duration_ms: 180000,
            popularity: 75,
            uri: `spotify:track:track${i}`
          }
        }))
      };

      // Second page (partial)
      const secondPageResponse = {
        items: Array(50).fill(null).map((_, i) => ({
          track: {
            id: `track${i + 100}`,
            name: `Track ${i + 100}`,
            artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
            album: {
              id: 'album1',
              name: 'Album 1',
              artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
              images: [],
              release_date: '2023-01-01'
            },
            duration_ms: 180000,
            popularity: 75,
            uri: `spotify:track:track${i + 100}`
          }
        }))
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: firstPageResponse })
        .mockResolvedValueOnce({ data: secondPageResponse });

      const tracks = await spotifyService.getPlaylistTracks('playlist1');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(tracks).toHaveLength(150);
    });

    it('should filter out invalid tracks', async () => {
      const mockResponse = {
        items: [
          {
            track: {
              id: 'track1',
              name: 'Valid Track',
              artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
              album: {
                id: 'album1',
                name: 'Album 1',
                artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
                images: [],
                release_date: '2023-01-01'
              },
              duration_ms: 180000,
              popularity: 75,
              uri: 'spotify:track:track1'
            }
          },
          {
            track: null // Invalid track
          },
          {
            track: {
              id: null, // Invalid track - no ID
              name: 'Invalid Track'
            }
          },
          {
            track: {
              id: 'track2',
              name: 'Track without duration',
              duration_ms: null // Invalid - no duration
            }
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const tracks = await spotifyService.getPlaylistTracks('playlist1');

      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe('track1');
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist', async () => {
      const mockUserResponse = {
        id: 'user1',
        display_name: 'Test User'
      };

      const mockPlaylistResponse = {
        id: 'new-playlist',
        name: 'New Playlist',
        description: 'Test description',
        tracks: { total: 0 },
        owner: { id: 'user1', display_name: 'Test User' },
        images: []
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockUserResponse });
      mockAxiosInstance.request.mockResolvedValue({ data: mockPlaylistResponse });

      const playlist = await spotifyService.createPlaylist('New Playlist', 'Test description');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: '/users/user1/playlists',
        method: 'POST',
        data: {
          name: 'New Playlist',
          description: 'Test description',
          public: false
        }
      });

      expect(playlist.id).toBe('new-playlist');
      expect(playlist.name).toBe('New Playlist');
    });

    it('should trim playlist name', async () => {
      const mockUserResponse = { id: 'user1', display_name: 'Test User' };
      const mockPlaylistResponse = {
        id: 'new-playlist',
        name: 'Trimmed Playlist',
        tracks: { total: 0 },
        owner: { id: 'user1', display_name: 'Test User' },
        images: []
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockUserResponse });
      mockAxiosInstance.request.mockResolvedValue({ data: mockPlaylistResponse });

      await spotifyService.createPlaylist('  Trimmed Playlist  ');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed Playlist'
          })
        })
      );
    });
  });

  describe('addTracksToPlaylist', () => {
    it('should add tracks to playlist', async () => {
      const trackUris = ['spotify:track:1', 'spotify:track:2'];
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      await spotifyService.addTracksToPlaylist('playlist1', trackUris);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: '/playlists/playlist1/tracks',
        method: 'POST',
        data: { uris: trackUris }
      });
    });

    it('should handle large track lists by chunking', async () => {
      const trackUris = Array(250).fill(null).map((_, i) => `spotify:track:${i}`);
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      await spotifyService.addTracksToPlaylist('playlist1', trackUris);

      // Should make 3 requests (100 + 100 + 50)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('searchTracks', () => {
    it('should search for tracks', async () => {
      const mockResponse = {
        tracks: {
          items: [
            {
              id: 'track1',
              name: 'Search Result',
              artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
              album: {
                id: 'album1',
                name: 'Album 1',
                artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
                images: [],
                release_date: '2023-01-01'
              },
              duration_ms: 180000,
              popularity: 75,
              uri: 'spotify:track:track1'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const tracks = await spotifyService.searchTracks('test query');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search?q=test%20query&type=track&limit=20'
      );
      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Search Result');
    });

    it('should handle empty search results', async () => {
      const mockResponse = { tracks: { items: [] } };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const tracks = await spotifyService.searchTracks('nonexistent');

      expect(tracks).toHaveLength(0);
    });

    it('should encode search query properly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { tracks: { items: [] } } });

      await spotifyService.searchTracks('artist:"The Beatles" year:1969');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search?q=artist%3A%22The%20Beatles%22%20year%3A1969&type=track&limit=20'
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = {
        request: {},
        message: 'Network Error'
      };

      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'NETWORK'
      });
    });

    it('should handle API errors with response', async () => {
      const apiError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            error: {
              message: 'Playlist not found'
            }
          }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(apiError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'API',
        endpoint: '/me',
        method: 'GET'
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockAxiosInstance.get.mockRejectedValue(genericError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'API'
      });
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle 429 rate limit responses', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '2'
          }
        },
        config: {
          url: '/me'
        }
      };

      // First call fails with rate limit, second succeeds
      mockAxiosInstance.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { id: 'user1' } });

      const promise = spotifyService.getUserProfile();

      // Fast-forward time to simulate retry delay
      jest.advanceTimersByTime(2000);

      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache user profile', async () => {
      // Create a new service instance without mocked CacheService for this test
      const realCacheService = jest.requireActual('../CacheService');
      const serviceWithRealCache = new (class extends SpotifyService {
        constructor(authService: IAuthService) {
          super(authService);
          // Override the cache with a real instance
          (this as any).cache = new realCacheService.CacheService({
            ttl: 5 * 60 * 1000,
            maxSize: 1000
          });
        }
      })(mockAuthService);

      const mockResponse = {
        id: 'user1',
        display_name: 'Test User'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      // First call
      await serviceWithRealCache.getUserProfile();
      // Second call should use cache
      await serviceWithRealCache.getUserProfile();

      // Should only make one API call due to caching
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });
});