import { Track, Playlist } from '../types';
import { memoryManager } from '../utils/MemoryManager';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 1000;
  private hitCount = 0;
  private missCount = 0;

  constructor(private options: CacheOptions = {}) {
    // Listen for memory cleanup events
    if (typeof window !== 'undefined') {
      window.addEventListener('memory-cleanup', this.handleMemoryCleanup.bind(this));
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const timeToLive = ttl || this.options.ttl || this.defaultTTL;
    
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= (this.options.maxSize || this.maxSize)) {
      this.cleanup();
    }

    // Track memory usage
    const estimatedSize = this.estimateSize(data);
    memoryManager.trackMemoryUsage(`cache:${key}`, estimatedSize);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + timeToLive
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats(): { size: number; hitRate: number } {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0
    };
  }

  private handleMemoryCleanup(event: CustomEvent): void {
    if (!event.detail) return;
    
    const { key } = event.detail;
    if (key && this.cache.has(key)) {
      this.cache.delete(key);
    }
  }

  private estimateSize(data: any): number {
    // Simple size estimation for memory tracking
    try {
      return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default 1KB if can't stringify
    }
  }

  // Specialized methods for common data types
  setPlaylist(playlist: Playlist, ttl?: number): void {
    this.set(`playlist:${playlist.id}`, playlist, ttl);
  }

  getPlaylist(playlistId: string): Playlist | null {
    return this.get<Playlist>(`playlist:${playlistId}`);
  }

  setPlaylistTracks(playlistId: string, tracks: Track[], ttl?: number): void {
    this.set(`tracks:${playlistId}`, tracks, ttl);
  }

  getPlaylistTracks(playlistId: string): Track[] | null {
    return this.get<Track[]>(`tracks:${playlistId}`);
  }

  setUserPlaylists(userId: string, playlists: Playlist[], ttl?: number): void {
    this.set(`user_playlists:${userId}`, playlists, ttl);
  }

  getUserPlaylists(userId: string): Playlist[] | null {
    return this.get<Playlist[]>(`user_playlists:${userId}`);
  }

  setSearchResults(query: string, type: 'tracks' | 'playlists', results: any[], ttl?: number): void {
    const searchTTL = ttl || 2 * 60 * 1000; // 2 minutes for search results
    this.set(`search:${type}:${query.toLowerCase()}`, results, searchTTL);
  }

  getSearchResults<T>(query: string, type: 'tracks' | 'playlists'): T[] | null {
    return this.get<T[]>(`search:${type}:${query.toLowerCase()}`);
  }

  // Cache invalidation methods
  invalidatePlaylist(playlistId: string): void {
    this.delete(`playlist:${playlistId}`);
    this.delete(`tracks:${playlistId}`);
  }

  invalidateUserPlaylists(userId: string): void {
    this.delete(`user_playlists:${userId}`);
  }

  invalidateSearchResults(query?: string, type?: 'tracks' | 'playlists'): void {
    if (query && type) {
      this.delete(`search:${type}:${query.toLowerCase()}`);
    } else {
      // Clear all search results
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith('search:')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.delete(key));
    }
  }
}

// Global cache instance
export const globalCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
});