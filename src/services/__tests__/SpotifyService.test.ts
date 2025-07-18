import { SpotifyService } from '../SpotifyService';
import { IAuthService } from '../../types/services';
import { User, Playlist, Track } from '../../types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }))
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AuthService
class MockAuthService implements IAuthService {
  private token: string | null = 'mock-token';
  private user: User | null = { id: 'user1', displayName: 'Test User' };
  private callbacks: (() => void)[] = [];

  async login() {
    return {
      token: this.token!,
      user: this.user!,
      expiresIn: 3600
    };
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
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
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

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('should delegate to auth service', async () => {
      const result = await spotifyService.authenticate();
      
      expect(result).toEqual({
        token: 'mock-token',
        user: { id: 'user1', displayName: 'Test User' },
        expiresIn: 3600
      });
    });
  });

  describe('getUserProfile', () => {
    it('should fetch and map user profile correctly', async () => {
      const mockResponse = {
        id: 'user123',
        display_name: 'John Doe',
        email: 'john@example.com'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await spotifyService.getUserProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me');
      expect(result).toEqual({
        id: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should handle missing display_name', async () => {
      const mockResponse = {
        id: 'user123',
        email: 'john@example.com'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await spotifyService.getUserProfile();

      expect(result.displayName).toBe('user123');
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { error: { message: 'Forbidden' } }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'API',
        message: 'Forbidden'
      });
    });
  });

  describe('getUserPlaylists', () => {
    it('should fetch and map user playlists correctly', async () => {
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

      const result = await spotifyService.getUserPlaylists();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me/playlists?limit=50&offset=0');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'playlist1',
        name: 'My Playlist',
        description: 'Test playlist',
        trackCount: 10,
        owner: { id: 'user1', displayName: 'User One' },
        images: [{ url: 'image.jpg', height: 300, width: 300 }]
      });
    });

    it('should handle custom limit and offset', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { items: [] } });

      await spotifyService.getUserPlaylists(20, 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/me/playlists?limit=20&offset=10');
    });
  });

  describe('getPlaylistTracks', () => {
    it('should fetch all tracks from playlist with pagination', async () => {
      const mockTrack = {
        id: 'track1',
        name: 'Test Track',
        artists: [{ id: 'artist1', name: 'Artist One', uri: 'spotify:artist:artist1' }],
        album: {
          id: 'album1',
          name: 'Test Album',
          artists: [{ id: 'artist1', name: 'Artist One', uri: 'spotify:artist:artist1' }],
          images: [],
          release_date: '2023-01-01'
        },
        duration_ms: 180000,
        popularity: 75,
        uri: 'spotify:track:track1',
        preview_url: 'preview.mp3'
      };

      // First page
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            items: Array(100).fill({ track: mockTrack })
          }
        })
        // Second page (partial)
        .mockResolvedValueOnce({
          data: {
            items: Array(50).fill({ track: mockTrack })
          }
        });

      const result = await spotifyService.getPlaylistTracks('playlist1');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(150);
      expect(result[0].id).toBe('track1');
    });

    it('should filter out null tracks and tracks without duration', async () => {
      const validTrack = {
        id: 'track1',
        name: 'Valid Track',
        duration_ms: 180000,
        artists: [],
        album: { id: 'album1', name: 'Album', artists: [], images: [], release_date: '' },
        popularity: 0,
        uri: 'spotify:track:track1'
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          items: [
            { track: validTrack },
            { track: null },
            { track: { id: 'track2', name: 'No Duration' } }, // Missing duration_ms
            { track: { duration_ms: 0 } } // Missing id
          ]
        }
      });

      const result = await spotifyService.getPlaylistTracks('playlist1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('track1');
    });
  });

  describe('createPlaylist', () => {
    it('should create playlist successfully', async () => {
      const mockUser = { id: 'user1', displayName: 'Test User' };
      const mockPlaylist = {
        id: 'new-playlist',
        name: 'New Playlist',
        description: 'Test description',
        tracks: { total: 0 },
        owner: { id: 'user1', display_name: 'Test User' },
        images: []
      };

      // Mock getUserProfile call
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockUser });
      // Mock create playlist call
      mockAxiosInstance.request.mockResolvedValueOnce({ data: mockPlaylist });

      const result = await spotifyService.createPlaylist('New Playlist', 'Test description');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: '/users/user1/playlists',
        method: 'POST',
        data: {
          name: 'New Playlist',
          description: 'Test description',
          public: false
        }
      });

      expect(result.id).toBe('new-playlist');
      expect(result.name).toBe('New Playlist');
    });

    it('should trim playlist name', async () => {
      mockAuthService.setUser({ id: 'user1', displayName: 'Test User' });
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { id: 'user1', display_name: 'Test User' } 
      });
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { id: 'playlist1', name: 'Trimmed', tracks: { total: 0 }, owner: {}, images: [] } 
      });

      await spotifyService.createPlaylist('  Trimmed  ');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed'
          })
        })
      );
    });
  });

  describe('addTracksToPlaylist', () => {
    it('should add tracks in chunks of 100', async () => {
      const trackUris = Array(250).fill(0).map((_, i) => `spotify:track:track${i}`);

      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      await spotifyService.addTracksToPlaylist('playlist1', trackUris);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3); // 250 tracks = 3 chunks
      
      // Check first chunk
      expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(1, {
        url: '/playlists/playlist1/tracks',
        method: 'POST',
        data: {
          uris: trackUris.slice(0, 100)
        }
      });

      // Check last chunk
      expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(3, {
        url: '/playlists/playlist1/tracks',
        method: 'POST',
        data: {
          uris: trackUris.slice(200, 250)
        }
      });
    });
  });

  describe('searchTracks', () => {
    it('should search tracks and map results correctly', async () => {
      const mockResponse = {
        tracks: {
          items: [
            {
              id: 'track1',
              name: 'Search Result',
              artists: [],
              album: { id: 'album1', name: 'Album', artists: [], images: [], release_date: '' },
              duration_ms: 180000,
              popularity: 80,
              uri: 'spotify:track:track1'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await spotifyService.searchTracks('test query', 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search?q=test%20query&type=track&limit=10'
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Search Result');
    });

    it('should handle empty search results', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await spotifyService.searchTracks('no results');

      expect(result).toHaveLength(0);
    });
  });

  describe('searchPlaylists', () => {
    it('should search playlists and map results correctly', async () => {
      const mockResponse = {
        playlists: {
          items: [
            {
              id: 'playlist1',
              name: 'Search Result Playlist',
              tracks: { total: 5 },
              owner: { id: 'user1', display_name: 'Owner' },
              images: []
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await spotifyService.searchPlaylists('test query', 5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search?q=test%20query&type=playlist&limit=5'
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Search Result Playlist');
    });
  });

  describe('getMultipleTracks', () => {
    it('should fetch multiple tracks in chunks of 50', async () => {
      const trackIds = Array(120).fill(0).map((_, i) => `track${i}`);
      const mockTrack = {
        id: 'track1',
        name: 'Track',
        artists: [],
        album: { id: 'album1', name: 'Album', artists: [], images: [], release_date: '' },
        duration_ms: 180000,
        popularity: 0,
        uri: 'spotify:track:track1'
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { tracks: Array(50).fill(mockTrack) } })
        .mockResolvedValueOnce({ data: { tracks: Array(50).fill(mockTrack) } })
        .mockResolvedValueOnce({ data: { tracks: Array(20).fill(mockTrack) } });

      const result = await spotifyService.getMultipleTracks(trackIds);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(120);
    });

    it('should filter out null tracks', async () => {
      const trackIds = ['track1', 'track2'];
      const validTrack = {
        id: 'track1',
        name: 'Valid Track',
        artists: [],
        album: { id: 'album1', name: 'Album', artists: [], images: [], release_date: '' },
        duration_ms: 180000,
        popularity: 0,
        uri: 'spotify:track:track1'
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { tracks: [validTrack, null] }
      });

      const result = await spotifyService.getMultipleTracks(trackIds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('track1');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = { request: {}, message: 'Network Error' };
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'NETWORK',
        message: 'Network error occurred'
      });
    });

    it('should handle API errors with custom messages', async () => {
      const apiError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: { message: 'Playlist not found' } }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(apiError);

      await expect(spotifyService.getPlaylist('nonexistent')).rejects.toMatchObject({
        type: 'API',
        message: 'Playlist not found'
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockAxiosInstance.get.mockRejectedValue(genericError);

      await expect(spotifyService.getUserProfile()).rejects.toMatchObject({
        type: 'API',
        message: 'Something went wrong'
      });
    });
  });

  describe('rate limiting and retries', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should implement basic rate limiting', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 'user1' } });

      // Make two quick requests
      const promise1 = spotifyService.getUserProfile();
      const promise2 = spotifyService.getUserProfile();

      // Fast-forward time to resolve delays
      jest.advanceTimersByTime(200);

      await Promise.all([promise1, promise2]);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});