import React from 'react';
import { MixOptions, SpotifyPlaylist } from '../../../types';
import { getPlaylistItemCount } from '../../../utils/spotify';
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
      (sum, playlist) => sum + getPlaylistItemCount(playlist),
      0
    );

    let totalDurationMinutes = 0;
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes =
          (getPlaylistItemCount(playlist) *
            playlist.realAverageDurationSeconds) /
          60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        totalDurationMinutes += getPlaylistItemCount(playlist) * 3.5;
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

      {/* Track ordering */}
      <div className={styles.inputGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={mixOptions.shuffleTracks}
            onChange={e =>
              onMixOptionsChange({ shuffleTracks: e.target.checked })
            }
            className={styles.checkbox}
          />
          Shuffle tracks within each playlist before balancing the mix
        </label>
        <p className={styles.helpText}>
          Spotify no longer provides catalog popularity. The mixer uses your
          playlist ratios and preserves playlist order unless shuffle is on.
        </p>
      </div>
    </div>
  );
};

export default PlaylistForm;
