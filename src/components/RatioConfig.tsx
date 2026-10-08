import { CSSProperties, memo, ReactNode } from 'react';
import {
  SpotifyPlaylist,
  RatioConfig as Config,
  RatioConfigItem,
} from '../types';
import { useRatioCalculation } from '../hooks/useRatioCalculation';
import HardwareControl from './ui/HardwareControl';
import LcdNumber from './ui/LcdNumber';
import { channelColors } from './features/mixer/channelAppearance';
import styles from './RatioConfig.module.css';

interface RatioConfigProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: Config;
  onRatioUpdate: (playlistId: string, config: RatioConfigItem) => void;
  onPlaylistRemove?: (playlistId: string) => void;
  className?: string;
  addPlaylist?: ReactNode;
}

const RatioConfig = memo<RatioConfigProps>(
  ({
    selectedPlaylists,
    ratioConfig,
    onRatioUpdate,
    onPlaylistRemove,
    className,
    addPlaylist,
  }) => {
    const method = selectedPlaylists.some(
      playlist => ratioConfig[playlist.id]?.weightType === 'time'
    )
      ? 'time'
      : 'frequency';
    const { getPlaylistPercentage } = useRatioCalculation(
      selectedPlaylists,
      ratioConfig,
      method
    );
    return (
      <div
        className={`${styles.strips} ${className || ''}`}
        aria-label="Playlist channels"
      >
        {selectedPlaylists.map((playlist, index) => {
          const config = ratioConfig[playlist.id] || {
            min: 1,
            max: 2,
            weight: 1,
            weightType: method,
          };
          const update = (field: 'min' | 'max' | 'weight', value: number) =>
            onRatioUpdate(playlist.id, {
              ...config,
              [field]: field === 'max' ? Math.max(config.min, value) : value,
              max:
                field === 'min'
                  ? Math.max(value, config.max)
                  : field === 'max'
                    ? Math.max(config.min, value)
                    : config.max,
            });
          const share = getPlaylistPercentage(playlist.id);
          return (
            <section
              key={playlist.id}
              className={styles.strip}
              aria-label={playlist.name || 'Playlist'}
              style={
                {
                  '--c': channelColors[index % channelColors.length],
                } as CSSProperties
              }
            >
              <div className={styles['s-head']}>
                {playlist.images?.[0]?.url ? (
                  <img
                    className={styles.cover}
                    src={playlist.images[0].url}
                    alt={playlist.name}
                  />
                ) : (
                  <span
                    className={`${styles.cover} ${styles.coverFallback}`}
                    aria-hidden="true"
                  >
                    {(playlist.name || 'P')[0]}
                  </span>
                )}
                <h2 className={styles.sname}>{playlist.name || 'Playlist'}</h2>
              </div>
              {onPlaylistRemove && (
                <button
                  className={styles['x-btn']}
                  title={`Remove ${playlist.name}`}
                  aria-label={`Remove ${playlist.name}`}
                  onClick={() => onPlaylistRemove(playlist.id)}
                >
                  ×
                </button>
              )}
              <fieldset>
                <legend>Songs in a row</legend>
                <div className={styles.knobs}>
                  {(['min', 'max'] as const).map(field => (
                    <div className={styles.knobwrap} key={field}>
                      <HardwareControl
                        kind="knob"
                        label={`${playlist.name} ${field === 'min' ? 'minimum' : 'maximum'} songs in a row`}
                        value={config[field]}
                        min={1}
                        max={8}
                        onChange={value => update(field, value)}
                      />
                      <span className={styles.klabel}>
                        {field === 'min' ? 'Min' : 'Max'}
                      </span>
                      <LcdNumber
                        label={`${playlist.name} ${field} value`}
                        value={config[field]}
                        min={1}
                        max={8}
                        onChange={value => update(field, value)}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.pri}>
                <legend>Priority</legend>
                <div className={styles.fwrap}>
                  <div className={styles.fscale} aria-hidden="true">
                    {[100, 50, 1].map(value => (
                      <span
                        key={value}
                        style={{ '--v': (value - 1) / 99 } as CSSProperties}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                  <HardwareControl
                    kind="fader"
                    label={`${playlist.name} priority`}
                    value={config.weight}
                    min={1}
                    max={100}
                    onChange={value => update('weight', value)}
                  />
                  <div
                    className={styles.vu}
                    role="meter"
                    aria-label={`${playlist.name} share`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={share}
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <i
                        key={i}
                        className={i < Math.round(share / 5) ? styles.lit : ''}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.pnum}>
                  <LcdNumber
                    label={`${playlist.name} priority value`}
                    value={config.weight}
                    min={1}
                    max={100}
                    onChange={value => update('weight', value)}
                  />
                </div>
              </fieldset>
            </section>
          );
        })}
        {addPlaylist}
      </div>
    );
  }
);
RatioConfig.displayName = 'RatioConfig';
export default RatioConfig;
