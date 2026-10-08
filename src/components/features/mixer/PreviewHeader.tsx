import { CSSProperties } from 'react';
import { SpotifyPlaylist } from '../../../types';
import { channelColors, formatMixDuration } from './channelAppearance';
import styles from '../../PlaylistMixer.module.css';

export interface PlaylistStats {
  [playlistId: string]: { name: string; count: number; totalDuration: number };
}

export default function PreviewHeader({
  songs,
  duration,
  stats,
  selectedPlaylists,
}: {
  songs: number;
  duration: number;
  stats: PlaylistStats;
  selectedPlaylists: SpotifyPlaylist[];
}) {
  return (
    <div className={styles['scr-h']}>
      <div className={styles.stat}>
        <b>{songs}</b>
        <span>songs</span>
      </div>
      <div className={styles.stat}>
        <b>{formatMixDuration(duration)}</b>
        <span>total</span>
      </div>
      <div
        className={styles.breakdown}
        role="group"
        aria-label="Source breakdown"
      >
        {Object.entries(stats).map(([id, stat]) => {
          const index = selectedPlaylists.findIndex(
            playlist => playlist.id === id
          );
          return (
            <div
              className={styles.bk}
              key={id}
              style={
                {
                  '--c':
                    index >= 0
                      ? channelColors[index % channelColors.length]
                      : 'var(--oled-dim)',
                } as CSSProperties
              }
            >
              <span className={styles.bn} title={stat.name}>
                <i aria-hidden="true" />
                {stat.name}
              </span>
              <div className={styles.bb} aria-hidden="true">
                <i
                  style={{
                    width: `${songs ? (stat.count / songs) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className={styles.bv}>
                <span>{stat.count} songs</span> ·{' '}
                <span>{formatMixDuration(stat.totalDuration)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
