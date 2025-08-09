import React from 'react';
import { MixOptions, SpotifyPlaylist } from '../../../types';
import styles from '../../PlaylistMixer.module.css';

interface PlaylistFormProps {
  mixOptions: MixOptions;
  onMixOptionsChange: (updates: Partial<MixOptions>) => void;
  selectedPlaylists: SpotifyPlaylist[];
  exceedsLimit?: {
    type: 'time' | 'songs';
    requested: number;
    available: number;
    availableFormatted: string;
    requestedFormatted: string;
  } | null;
  ratioImbalance?: {
    limitingPlaylistName: string;
    mixWillBecomeImbalancedAt: string | number;
    unit: string;
    willStopEarly: boolean;
    isUseAllSongs?: boolean;
  } | null;
}

const PlaylistForm: React.FC<PlaylistFormProps> = ({
  mixOptions,
  onMixOptionsChange,
  selectedPlaylists,
  exceedsLimit,
  ratioImbalance,
}) => {
  const formatTotalDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getTotalAvailableContent = () => {
    const totalSongs = selectedPlaylists.reduce(
      (sum, playlist) => sum + playlist.tracks.total,
      0
    );

    let totalDurationMinutes = 0;
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes =
          (playlist.tracks.total * playlist.realAverageDurationSeconds) / 60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        totalDurationMinutes += playlist.tracks.total * 3.5;
      }
    }

    return {
      totalSongs,
      totalDurationMinutes: Math.round(totalDurationMinutes),
    };
  };

  const available = getTotalAvailableContent();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>📝 Playlist Details</h3>

      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>What should we call your mix?</label>
          <input
            type="text"
            value={mixOptions.playlistName}
            onChange={e =>
              onMixOptionsChange({
                playlistName: e.target.value,
              })
            }
            placeholder="My Awesome Mix"
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>How long should your mix be?</label>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleOption} ${
                mixOptions.useAllSongs ? styles.active : ''
              }`}
              onClick={() =>
                onMixOptionsChange({
                  useAllSongs: true,
                  useTimeLimit: false,
                })
              }
            >
              Use All Songs
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${
                !mixOptions.useAllSongs && !mixOptions.useTimeLimit
                  ? styles.active
                  : ''
              }`}
              onClick={() =>
                onMixOptionsChange({
                  useAllSongs: false,
                  useTimeLimit: false,
                })
              }
            >
              Set Song Count
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${
                mixOptions.useTimeLimit ? styles.active : ''
              }`}
              onClick={() =>
                onMixOptionsChange({
                  useAllSongs: false,
                  useTimeLimit: true,
                })
              }
            >
              Set Duration
            </button>
          </div>

          {!mixOptions.useAllSongs && !mixOptions.useTimeLimit && (
            <input
              type="number"
              value={mixOptions.totalSongs}
              onChange={e =>
                onMixOptionsChange({
                  totalSongs: parseInt(e.target.value) || 0,
                })
              }
              min="1"
              max={available.totalSongs}
              placeholder="100"
              className={styles.input}
            />
          )}

          {mixOptions.useTimeLimit && (
            <input
              type="number"
              value={Math.round(mixOptions.targetDuration / 60)}
              onChange={e =>
                onMixOptionsChange({
                  targetDuration: (parseInt(e.target.value) || 0) * 60,
                })
              }
              min="1"
              max={available.totalDurationMinutes}
              placeholder="240"
              className={styles.input}
            />
          )}

          {mixOptions.useAllSongs && (
            <p className={styles.helpText}>
              Using all {available.totalSongs} songs (~
              {formatTotalDuration(available.totalDurationMinutes * 60 * 1000)})
            </p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {exceedsLimit && (
        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningText}>
            <strong>Not enough content:</strong> You requested{' '}
            {exceedsLimit.requestedFormatted}, but only{' '}
            {exceedsLimit.availableFormatted} available from selected playlists.
          </div>
        </div>
      )}

      {ratioImbalance && (
        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningText}>
            <strong>Ratio imbalance warning:</strong> Based on your current
            ratios, "{ratioImbalance.limitingPlaylistName}" will run out of
            songs at {ratioImbalance.mixWillBecomeImbalancedAt}{' '}
            {ratioImbalance.unit && ratioImbalance.unit}
            {ratioImbalance.willStopEarly
              ? ', and mixing will stop there'
              : ', but mixing will continue with remaining playlists'}
            .
          </div>
          <div className={styles.warningOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={mixOptions.continueWhenPlaylistEmpty}
                onChange={e =>
                  onMixOptionsChange({
                    continueWhenPlaylistEmpty: e.target.checked,
                  })
                }
                className={styles.checkbox}
              />
              Continue mixing until all songs are used up
            </label>
          </div>
        </div>
      )}

      {/* Strategy Selection */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          How should we arrange popular songs?
        </label>
        <div className={styles.strategyGrid}>
          <button
            type="button"
            className={`${styles.strategyOption} ${
              mixOptions.popularityStrategy === 'mixed' ? styles.active : ''
            }`}
            onClick={() =>
              onMixOptionsChange({
                popularityStrategy: 'mixed',
              })
            }
          >
            <div className={styles.strategyTitle}>🎲 Mixed</div>
            <div className={styles.strategyDescription}>
              Popular and deep cuts evenly distributed throughout
            </div>
          </button>

          <button
            type="button"
            className={`${styles.strategyOption} ${
              mixOptions.popularityStrategy === 'front-loaded'
                ? styles.active
                : ''
            }`}
            onClick={() =>
              onMixOptionsChange({
                popularityStrategy: 'front-loaded',
              })
            }
          >
            <div className={styles.strategyTitle}>🚀 Front-Loaded</div>
            <div className={styles.strategyDescription}>
              Start with hits, gradually transition to deep cuts
            </div>
          </button>

          <button
            type="button"
            className={`${styles.strategyOption} ${
              mixOptions.popularityStrategy === 'mid-peak' ? styles.active : ''
            }`}
            onClick={() =>
              onMixOptionsChange({
                popularityStrategy: 'mid-peak',
              })
            }
          >
            <div className={styles.strategyTitle}>⛰️ Mid-Peak</div>
            <div className={styles.strategyDescription}>
              Build to popular songs in the middle, bookend with variety
            </div>
          </button>

          <button
            type="button"
            className={`${styles.strategyOption} ${
              mixOptions.popularityStrategy === 'crescendo' ? styles.active : ''
            }`}
            onClick={() =>
              onMixOptionsChange({
                popularityStrategy: 'crescendo',
              })
            }
          >
            <div className={styles.strategyTitle}>📈 Crescendo</div>
            <div className={styles.strategyDescription}>
              Start with deep cuts, build up to the biggest hits
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistForm;
