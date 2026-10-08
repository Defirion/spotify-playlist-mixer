import { CSSProperties, useMemo } from 'react';
import { MixOptions, RatioConfig, SpotifyPlaylist } from '../../../types';
import { Track } from '../../../types/domain';
import { mixPlaylists } from '../../../utils/mixer';
import { getPlaylistItemCount } from '../../../utils/spotify';
import { channelColors } from './channelAppearance';
import styles from '../../RatioConfig.module.css';

interface ExampleOrderProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
}

export default function ExampleOrder({
  selectedPlaylists,
  ratioConfig,
  mixOptions,
}: ExampleOrderProps) {
  const order = useMemo(() => {
    if (selectedPlaylists.length < 2) return [];
    const tracks: Record<string, Track[]> = {};
    const ratios: RatioConfig = {};
    selectedPlaylists.forEach(playlist => {
      // Estimate only source order with average durations; use the real mixer.
      tracks[playlist.id] = Array.from(
        { length: Math.min(24, getPlaylistItemCount(playlist)) },
        (_, i) => ({
          id: `${playlist.id}:example:${i}`,
          title: 'Example song',
          artists: [],
          durationMs: (playlist.realAverageDurationSeconds || 210) * 1000,
          sourceRefs: [],
        })
      );
      ratios[playlist.id] = ratioConfig[playlist.id] || {
        min: 1,
        max: 2,
        weight: 1,
        weightType: 'frequency',
      };
    });
    return mixPlaylists(tracks, ratios, {
      ...mixOptions,
      useTimeLimit: false,
      useAllSongs: false,
      totalSongs: 24,
      shuffleTracks: false,
    }).slice(0, 24);
  }, [selectedPlaylists, ratioConfig, mixOptions]);
  if (!order.length) return null;
  return (
    <div className={styles.exw}>
      <p className={styles.cap}>Example order</p>
      <div
        className={styles.cells}
        aria-label="Estimated source order for the first 24 songs"
      >
        {order.map((track, i) => {
          const index = selectedPlaylists.findIndex(
            playlist => playlist.id === track.sourcePlaylist
          );
          const playlist = selectedPlaylists[index];
          return (
            <i
              key={i}
              title={playlist.name}
              style={
                {
                  '--c': channelColors[index % channelColors.length],
                } as CSSProperties
              }
            >
              {playlist.name[0]?.toUpperCase() || 'P'}
            </i>
          );
        })}
      </div>
    </div>
  );
}
