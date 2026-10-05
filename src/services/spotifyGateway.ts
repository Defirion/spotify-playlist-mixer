import {
  CreatedPlaylist,
  MixedTrack,
  Playlist,
  PlaylistDestination,
  PlaylistReadOptions,
  PlaylistSource,
} from '../types/domain';
import { MixedTrack as DisplayTrack } from '../types/mixer';
import { ISpotifyService } from '../types/api';
import { SpotifyPlaylist, SpotifyTrack } from '../types/spotify';
import SpotifyService from './spotify';
import {
  normalizeSpotifyPlaylist,
  normalizeSpotifyTrack,
  spotifyTrackUri,
} from './spotifyNormalizer';

/** One adapter for the mix path. Transport, pagination and retries stay in the service. */
export default class SpotifyGateway
  implements PlaylistSource, PlaylistDestination
{
  private service: ISpotifyService;
  private displayTracks = new Map<string, Map<string, SpotifyTrack>>();

  constructor(tokenOrService: string | ISpotifyService) {
    this.service =
      typeof tokenOrService === 'string'
        ? new SpotifyService(tokenOrService)
        : tokenOrService;
  }

  async getPlaylist(
    reference: Pick<Playlist, 'id' | 'name' | 'source'>,
    options: PlaylistReadOptions = {}
  ): Promise<Playlist> {
    if (reference.source && reference.source.provider !== 'spotify')
      throw new Error('This source is not a Spotify playlist');
    const result = await this.service.getPlaylistTracks(
      reference.source?.id ?? reference.id,
      options
    );
    if (options.signal?.aborted)
      throw new DOMException('Request canceled', 'AbortError');
    if (result.hasMore) throw new Error('Playlist loading is incomplete');
    const displayTracks = new Map<string, SpotifyTrack>();
    const tracks = result.tracks.map(dto => {
      const track = normalizeSpotifyTrack(dto);
      if (!displayTracks.has(track.id)) displayTracks.set(track.id, dto);
      return track;
    });
    this.displayTracks.set(reference.id, displayTracks);
    return { ...reference, tracks, sourceTotal: result.total };
  }

  /** Keep the existing editor's DTOs outside the canonical mixer. */
  toDisplayTracks(tracks: MixedTrack[]): DisplayTrack[] {
    return tracks.map(track => {
      const dto = this.displayTracks.get(track.sourcePlaylist)?.get(track.id);
      if (!dto) throw new Error(`Missing display metadata for ${track.title}`);
      return {
        ...dto,
        duration_ms: track.durationMs,
        sourcePlaylist: track.sourcePlaylist,
        instanceId: track.instanceId,
        originalIndex: track.originalIndex,
      };
    });
  }

  private async save(
    playlist: Playlist,
    options: { isSessionCurrent?: () => boolean } = {}
  ): Promise<{ receipt: CreatedPlaylist; dto: SpotifyPlaylist }> {
    if (!playlist.name.trim()) throw new Error('Please enter a playlist name');
    if (playlist.tracks.length === 0)
      throw new Error('No tracks to add to playlist');
    const uris = playlist.tracks.map(spotifyTrackUri);
    if (uris.some(uri => !uri))
      throw new Error('Every track must have a Spotify destination reference');
    if (options.isSessionCurrent?.() === false)
      throw new Error('Spotify session changed during saving');

    // Validate before creating anything. Do not replay creation or append here.
    const dto = await this.service.createPlaylist({
      name: playlist.name.trim(),
      description: 'Mixed playlist created with Spotify Playlist Mixer',
      public: false,
    });
    try {
      if (options.isSessionCurrent?.() === false)
        throw new Error('Spotify session changed during saving');
      await this.service.addTracksToPlaylist(dto.id, {
        uris: uris as string[],
      });
    } catch (error) {
      const confirmed =
        (error as { context?: { confirmedTracks?: number } })?.context
          ?.confirmedTracks ?? 0;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Playlist "${dto.name}" was created, but saving is incomplete: ${confirmed} of ${playlist.tracks.length} tracks confirmed saved. The last request may have succeeded. Open ${dto.external_urls?.spotify || `https://open.spotify.com/playlist/${dto.id}`} and check its contents before creating another mix. ${message}`
      );
    }
    return {
      dto,
      receipt: {
        playlist: {
          ...normalizeSpotifyPlaylist(dto),
          tracks: playlist.tracks,
          sourceTotal: uris.length,
        },
        url: dto.external_urls?.spotify,
        confirmedTracks: uris.length,
      },
    };
  }

  async savePlaylist(
    playlist: Playlist,
    options?: { isSessionCurrent?: () => boolean }
  ): Promise<CreatedPlaylist> {
    return (await this.save(playlist, options)).receipt;
  }

  /** Temporary presentation bridge for the existing hook return contract. */
  async saveDisplayPlaylist(
    name: string,
    tracks: DisplayTrack[],
    options?: { isSessionCurrent?: () => boolean }
  ): Promise<SpotifyPlaylist> {
    const { dto, receipt } = await this.save(
      { id: '', name, tracks: tracks.map(normalizeSpotifyTrack) },
      options
    );
    return {
      ...dto,
      items: { total: receipt.confirmedTracks, href: dto.items?.href || '' },
    };
  }
}
