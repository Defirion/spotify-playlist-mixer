import { CacheService } from '../CacheService';
import { Track, Playlist } from '../../types';
import { memoryManager } from '../../utils/MemoryManager';

// Mock MemoryManager
jest.mock('../../utils/MemoryManager', () => ({
  memoryManager: {
    trackMemoryUsage: jest.fn(),
    releaseMemory: jest.fn()
  }
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      ttl: 1000, // 1 second for testing
      maxSize: 5
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      const testData = { id: '1', name: 'test' };
      
      cacheService.set('test-key', testData);
      const result = cacheService.get('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cacheService.set('test-key', 'test-value');
      
      expect(cacheService.has('test-key')).toBe(true);
      expect(cacheService.has('non-existent')).toBe(false);
    });

    it('should delete values', () => {
      cacheService.set('test-key', 'test-value');
      
      expect(cacheService.has('test-key')).toBe(true);
      
      const deleted = cacheService.delete('test-key');
      
      expect(deleted).toBe(true);
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should clear all values', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('test-key', 'test-value');
      
      expect(cacheService.get('test-key')).toBe('test-value');
      
      // Fast-forward time past TTL
      jest.advanceTimersByTime(1500);
      
      expect(cacheService.get('test-key')).toBeNull();
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should use custom TTL when provided', () => {
      cacheService.set('test-key', 'test-value', 2000); // 2 seconds
      
      // After 1 second (default TTL), should still exist
      jest.advanceTimersByTime(1500);
      expect(cacheService.get('test-key')).toBe('test-value');
      
      // After 2 seconds (custom TTL), should be expired
      jest.advanceTimersByTime(1000);
      expect(cacheService.get('test-key')).toBeNull();
    });

    it('should not expire entries before TTL', () => {
      cacheService.set('test-key', 'test-value');
      
      // Fast-forward time but not past TTL
      jest.advanceTimersByTime(500);
      
      expect(cacheService.get('test-key')).toBe('test-value');
    });
  });

  describe('size limits', () => {
    it('should cleanup when max size is reached', () => {
      // Fill cache to max size with expired entries
      for (let i = 0; i < 3; i++) {
        cacheService.set(`expired${i}`, `value${i}`, 100); // Very short TTL
      }
      
      // Fast-forward to expire entries
      jest.advanceTimersByTime(200);
      
      // Fill with valid entries
      for (let i = 0; i < 3; i++) {
        cacheService.set(`valid${i}`, `value${i}`);
      }
      
      // Add one more to trigger cleanup
      cacheService.set('trigger', 'cleanup');
      
      // Should have cleaned up expired entries
      expect(cacheService.getStats().size).toBeLessThanOrEqual(5);
    });

    it('should cleanup expired entries during cleanup', () => {
      // Add entries that will expire
      for (let i = 0; i < 3; i++) {
        cacheService.set(`expired${i}`, `value${i}`, 100); // Very short TTL
      }
      
      // Add entries that won't expire
      for (let i = 0; i < 3; i++) {
        cacheService.set(`valid${i}`, `value${i}`, 10000); // Long TTL
      }
      
      // Fast-forward to expire first set
      jest.advanceTimersByTime(200);
      
      // Trigger cleanup by adding new entry
      cacheService.set('trigger', 'cleanup');
      
      // Expired entries should be gone
      expect(cacheService.has('expired0')).toBe(false);
      expect(cacheService.has('valid0')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track hit rate correctly', () => {
      cacheService.set('key1', 'value1');
      
      // 2 hits
      cacheService.get('key1');
      cacheService.get('key1');
      
      // 1 miss
      cacheService.get('non-existent');
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeCloseTo(2/3, 2);
    });

    it('should track cache size', () => {
      expect(cacheService.getStats().size).toBe(0);
      
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      expect(cacheService.getStats().size).toBe(2);
    });

    it('should handle zero requests gracefully', () => {
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('memory management', () => {
    it('should track memory usage when setting values', () => {
      const testData = { large: 'data'.repeat(1000) };
      
      cacheService.set('test-key', testData);
      
      expect(memoryManager.trackMemoryUsage).toHaveBeenCalledWith(
        'cache:test-key',
        expect.any(Number)
      );
    });

    it('should handle memory cleanup events', () => {
      cacheService.set('test-key', 'test-value');
      
      // Simulate memory cleanup event
      const event = new CustomEvent('memory-cleanup', {
        detail: { key: 'cache:test-key' }
      });
      
      window.dispatchEvent(event);
      
      // Key should be removed from cache
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should estimate size correctly', () => {
      const smallData = 'small';
      const largeData = { data: 'x'.repeat(1000) };
      
      cacheService.set('small', smallData);
      cacheService.set('large', largeData);
      
      // Should have called trackMemoryUsage with different sizes
      const calls = (memoryManager.trackMemoryUsage as jest.Mock).mock.calls;
      expect(calls[0][1]).toBeLessThan(calls[1][1]);
    });
  });

  describe('specialized methods', () => {
    const mockPlaylist: Playlist = {
      id: 'playlist1',
      name: 'Test Playlist',
      trackCount: 10,
      owner: { id: 'user1', displayName: 'Test User' },
      images: []
    };

    const mockTrack: Track = {
      id: 'track1',
      name: 'Test Track',
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      album: {
        id: 'album1',
        name: 'Test Album',
        artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
        images: [],
        release_date: '2023-01-01'
      },
      duration_ms: 180000,
      popularity: 75,
      uri: 'spotify:track:track1'
    };

    describe('playlist methods', () => {
      it('should set and get playlists', () => {
        cacheService.setPlaylist(mockPlaylist);
        const result = cacheService.getPlaylist('playlist1');
        
        expect(result).toEqual(mockPlaylist);
      });

      it('should return null for non-existent playlist', () => {
        const result = cacheService.getPlaylist('non-existent');
        expect(result).toBeNull();
      });
    });

    describe('playlist tracks methods', () => {
      it('should set and get playlist tracks', () => {
        const tracks = [mockTrack];
        
        cacheService.setPlaylistTracks('playlist1', tracks);
        const result = cacheService.getPlaylistTracks('playlist1');
        
        expect(result).toEqual(tracks);
      });

      it('should return null for non-existent playlist tracks', () => {
        const result = cacheService.getPlaylistTracks('non-existent');
        expect(result).toBeNull();
      });
    });

    describe('user playlists methods', () => {
      it('should set and get user playlists', () => {
        const playlists = [mockPlaylist];
        
        cacheService.setUserPlaylists('user1', playlists);
        const result = cacheService.getUserPlaylists('user1');
        
        expect(result).toEqual(playlists);
      });
    });

    describe('search results methods', () => {
      it('should set and get search results', () => {
        const tracks = [mockTrack];
        
        cacheService.setSearchResults('test query', 'tracks', tracks);
        const result = cacheService.getSearchResults<Track>('test query', 'tracks');
        
        expect(result).toEqual(tracks);
      });

      it('should use shorter TTL for search results', () => {
        const tracks = [mockTrack];
        
        cacheService.setSearchResults('test query', 'tracks', tracks);
        
        // Should still exist after 1 second (default TTL)
        jest.advanceTimersByTime(1500);
        expect(cacheService.getSearchResults('test query', 'tracks')).toEqual(tracks);
        
        // Should expire after 2 minutes (search TTL is 2 minutes)
        jest.advanceTimersByTime(120000);
        expect(cacheService.getSearchResults('test query', 'tracks')).toBeNull();
      });

      it('should be case insensitive for search queries', () => {
        const tracks = [mockTrack];
        
        cacheService.setSearchResults('Test Query', 'tracks', tracks);
        const result = cacheService.getSearchResults<Track>('test query', 'tracks');
        
        expect(result).toEqual(tracks);
      });
    });
  });

  describe('cache invalidation', () => {
    beforeEach(() => {
      const mockPlaylist: Playlist = {
        id: 'playlist1',
        name: 'Test Playlist',
        trackCount: 10,
        owner: { id: 'user1', displayName: 'Test User' },
        images: []
      };

      const mockTrack: Track = {
        id: 'track1',
        name: 'Test Track',
        artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
        album: {
          id: 'album1',
          name: 'Test Album',
          artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
          images: [],
          release_date: '2023-01-01'
        },
        duration_ms: 180000,
        popularity: 75,
        uri: 'spotify:track:track1'
      };

      cacheService.setPlaylist(mockPlaylist);
      cacheService.setPlaylistTracks('playlist1', [mockTrack]);
      cacheService.setUserPlaylists('user1', [mockPlaylist]);
      cacheService.setSearchResults('test', 'tracks', [mockTrack]);
      cacheService.setSearchResults('test', 'playlists', [mockPlaylist]);
    });

    it('should invalidate playlist and its tracks', () => {
      cacheService.invalidatePlaylist('playlist1');
      
      expect(cacheService.getPlaylist('playlist1')).toBeNull();
      expect(cacheService.getPlaylistTracks('playlist1')).toBeNull();
    });

    it('should invalidate user playlists', () => {
      cacheService.invalidateUserPlaylists('user1');
      
      expect(cacheService.getUserPlaylists('user1')).toBeNull();
    });

    it('should invalidate specific search results', () => {
      cacheService.invalidateSearchResults('test', 'tracks');
      
      expect(cacheService.getSearchResults('test', 'tracks')).toBeNull();
      expect(cacheService.getSearchResults('test', 'playlists')).not.toBeNull();
    });

    it('should invalidate all search results when no parameters provided', () => {
      cacheService.invalidateSearchResults();
      
      expect(cacheService.getSearchResults('test', 'tracks')).toBeNull();
      expect(cacheService.getSearchResults('test', 'playlists')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle JSON stringify errors gracefully', () => {
      const circularRef: any = {};
      circularRef.self = circularRef;
      
      // Should not throw
      expect(() => cacheService.set('circular', circularRef)).not.toThrow();
    });

    it('should handle memory cleanup event errors gracefully', () => {
      cacheService.set('test-key', 'test-value');
      
      // Simulate event with invalid detail
      const event = new CustomEvent('memory-cleanup', {
        detail: null
      });
      
      expect(() => window.dispatchEvent(event)).not.toThrow();
    });
  });
});