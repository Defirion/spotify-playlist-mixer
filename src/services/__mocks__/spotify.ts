// Manual Jest mock for src/services/spotify.ts
// This file provides a compact, standalone mock implementation used by
// tests that rely on a SpotifyService instance. Tests can still override
// behavior with jest.mock('../../services/spotify', () => { ... }).

import { ApiError, ERROR_TYPES } from '../apiErrorHandler';

class MockSpotifyService {
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getUserPlaylists(options: any = {}) {
    if (options.all) {
      const items = Array.from({ length: 120 }).map((_, i) => ({
        id: `pl_all_${i}`,
        name: `PL ${i}`,
        tracks: { total: 0 },
      }));
      return {
        items,
        playlists: items,
        total: items.length,
        limit: items.length,
        offset: 0,
        hasMore: false,
      };
    }
    const items = [{ id: 'pl_1', name: 'PL 1', tracks: { total: 0 } }];
    return {
      items,
      playlists: items,
      total: items.length,
      limit: items.length,
      offset: 0,
      hasMore: false,
    };
  }

  async getPlaylist(playlistId: string) {
    return { id: playlistId, name: 'My Awesome Playlist' };
  }

  async getUserProfile() {
    const url = 'https://api.spotify.com/v1/me';
    const res = await (global as any).fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { __raw: text };
    }
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, body: data };
      throw err;
    }
    return data;
  }

  async searchTracks(query: string, options: any = {}) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    if (!query || !String(query).trim()) {
      const err: any = new Error('Search query cannot be empty');
      err.response = { status: 400 };
      throw err;
    }
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: String(limit),
      offset: String(offset),
    });
    if (options.market) params.append('market', options.market);
    const url = `https://api.spotify.com/v1/search?${params.toString()}`;
    const res = await (global as any).fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { __raw: text };
    }
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, body: data, headers: res.headers };
      throw err;
    }
    const items =
      data.tracks && data.tracks.items
        ? data.tracks.items.filter((t: any) => t && t.id)
        : [];
    return {
      items,
      tracks: items,
      total: data.tracks?.total || items.length,
      limit: data.tracks?.limit || limit,
      offset: data.tracks?.offset || offset,
      hasMore: !!(
        data.tracks &&
        data.tracks.offset + data.tracks.limit < data.tracks.total
      ),
    };
  }

  async searchPlaylists(query: string, options: any = {}) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    if (!query || !String(query).trim()) {
      const err: any = new Error('Search query cannot be empty');
      err.response = { status: 400 };
      throw err;
    }
    const params = new URLSearchParams({
      q: query,
      type: 'playlist',
      limit: String(limit),
      offset: String(offset),
    });
    if (options.market) params.append('market', options.market);
    const url = `https://api.spotify.com/v1/search?${params.toString()}`;
    const res = await (global as any).fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { __raw: text };
    }
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, body: data };
      throw err;
    }
    const items =
      data.playlists && data.playlists.items
        ? data.playlists.items.filter((t: any) => t && t.id)
        : [];
    return {
      items,
      playlists: items,
      total: data.playlists?.total || items.length,
      limit: data.playlists?.limit || limit,
      offset: data.playlists?.offset || offset,
      hasMore: !!(
        data.playlists &&
        data.playlists.offset + data.playlists.limit < data.playlists.total
      ),
    };
  }

  async getTrackAudioFeatures(trackId: string) {
    if (!trackId) {
      const err: any = new Error('Track ID required');
      err.response = { status: 400 };
      throw err;
    }
    const url = `https://api.spotify.com/v1/audio-features/${encodeURIComponent(trackId)}`;
    const res = await (global as any).fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { __raw: text };
    }
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, body: data };
      throw err;
    }
    return data;
  }

  async getMultipleTrackAudioFeatures(trackIds: string[]) {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      const err: any = new Error('Track IDs required');
      err.response = { status: 400 };
      throw err;
    }
    const ids = trackIds.join(',');
    const url = `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(ids)}`;
    const res = await (global as any).fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { __raw: text };
    }
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, body: data };
      throw err;
    }
    return data.audio_features || [];
  }

  async createPlaylist(userId: string, body: any) {
    if (!userId) {
      const err: any = new Error('User ID is required');
      err.response = { status: 400 };
      throw err;
    }
    if (!body || !body.name) {
      const err: any = new Error('Playlist name is required');
      err.response = { status: 400 };
      throw err;
    }
    return { id: `playlist_${Date.now()}`, name: body.name };
  }

  async removeTracksFromPlaylist(playlistId: string, request: any) {
    if (!playlistId) throw new Error('Playlist ID is required');
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const maxRetries = 3;
    let attempt = 0;
    while (true) {
      const res = await (global as any).fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (res.status === 429 && attempt < maxRetries) {
        attempt++;
        const ra =
          res.headers &&
          (res.headers.get
            ? res.headers.get('Retry-After')
            : res.headers['retry-after'] || res.headers['Retry-After']);
        const wait = ra ? Number(ra) * 1000 : 50;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status >= 400) {
        const type =
          res.status >= 500
            ? ERROR_TYPES.SERVER_ERROR
            : ERROR_TYPES.BAD_REQUEST;
        throw new ApiError(type, new Error(`HTTP ${res.status}`), {
          status: res.status,
          body: data,
        });
      }

      return data || { snapshot_id: null };
    }
  }

  async getPlaylistTracks(playlistId: string, options: any = {}) {
    if (!playlistId) throw new Error('Playlist ID is required');
    const limit = 100;
    let offset = 0;
    let all: any[] = [];
    let total = 0;
    while (true) {
      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`;
      const res = await (global as any).fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const text = await res.text().catch(() => '');
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { __raw: text };
      }
      const items = (data.items || []).map((it: any) => it.track || it);
      all = all.concat(items);
      total =
        typeof data.total === 'number' && data.total > 0
          ? data.total
          : total || all.length;
      if (options.onProgress && typeof options.onProgress === 'function') {
        try {
          options.onProgress({
            loaded: all.length,
            total,
            percentage: Math.round((all.length / Math.max(1, total)) * 100),
          });
        } catch (e) {
          /* ignore */
        }
      }
      if (!data.next) break;
      offset += limit;
    }
    return { tracks: all, total };
  }

  async addTracksToPlaylist(playlistId: string, request: any) {
    if (!playlistId) throw new Error('Playlist ID is required');
    const uris = request.uris || [];
    if (!uris || !Array.isArray(uris) || uris.length === 0)
      throw new Error('uris required');
    const batchSize = 100;
    let lastSnapshot: any = null;
    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, i + batchSize);
      const body: any = { uris: batch };
      if (i === 0 && typeof request.position !== 'undefined')
        body.position = request.position;
      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      const res = await (global as any).fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status >= 400) {
        const type =
          res.status >= 500
            ? ERROR_TYPES.SERVER_ERROR
            : ERROR_TYPES.BAD_REQUEST;
        throw new ApiError(type, new Error(`HTTP ${res.status}`), {
          status: res.status,
          body: data,
        });
      }

      lastSnapshot = data || lastSnapshot;
    }
    return lastSnapshot || { snapshot_id: null };
  }
}
// Export a jest mock function that constructs the MockSpotifyService instance.
// Tests expect the mocked module to be a Jest mock (have mockImplementation, mockRestore, etc.).
// Use `as any` to avoid tight TypeScript types in the mock file.
const MockSpotifyServiceFactory: any =
  jest && typeof jest.fn === 'function'
    ? jest.fn((accessToken: string) => new MockSpotifyService(accessToken))
    : (accessToken: string) => new MockSpotifyService(accessToken);

export default MockSpotifyServiceFactory;
