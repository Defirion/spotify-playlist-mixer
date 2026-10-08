import { ReactNode } from 'react';
import { MixOptions, SpotifyPlaylist, RatioConfigItem } from '../../../types';
import { getPlaylistItemCount } from '../../../utils/spotify';
import { RatioImbalanceWarning } from '../../../utils/exhaustionPrediction';
import ExhaustionWarning from './ExhaustionWarning';
import { formatMixDuration } from './channelAppearance';
import hardware from '../../ui/Hardware.module.css';
import channel from '../../RatioConfig.module.css';
import styles from '../../PlaylistMixer.module.css';

interface PlaylistFormProps {
  mixOptions: MixOptions;
  onMixOptionsChange: (updates: Partial<MixOptions>) => void;
  selectedPlaylists: SpotifyPlaylist[];
  balance?: ReactNode;
  exceedsLimit?: {
    requestedFormatted: string;
    availableFormatted: string;
  } | null;
  ratioImbalance?: RatioImbalanceWarning | null;
  onRatioUpdate?: (playlistId: string, config: RatioConfigItem) => void;
}

export default function PlaylistForm({
  mixOptions,
  onMixOptionsChange,
  selectedPlaylists,
  balance,
  exceedsLimit,
  ratioImbalance,
  onRatioUpdate,
}: PlaylistFormProps) {
  const totalSongs = selectedPlaylists.reduce(
    (sum, playlist) => sum + getPlaylistItemCount(playlist),
    0
  );
  const duration = selectedPlaylists.reduce(
    (sum, playlist) =>
      sum +
      getPlaylistItemCount(playlist) *
        (playlist.realAverageDurationSeconds || 210),
    0
  );
  const time = mixOptions.useTimeLimit && !mixOptions.useAllSongs;
  const amount = time
    ? Math.round(mixOptions.targetDurationSeconds / 60)
    : mixOptions.totalSongs;
  const updateAmount = (value: number) =>
    onMixOptionsChange(
      time
        ? { targetDurationSeconds: Math.max(1, value) * 60 }
        : { totalSongs: Math.max(1, value) }
    );
  return (
    <>
      <div className={hardware.groove} />
      <input
        className={hardware['tape-input']}
        aria-label="Mix name"
        placeholder="Mix name"
        value={mixOptions.playlistName}
        onChange={event =>
          onMixOptionsChange({ playlistName: event.target.value })
        }
      />
      {balance}
      <div>
        <p className={hardware.cap}>Length</p>
        <div className={hardware.lenrow} role="group" aria-label="Length">
          {(['all', 'songs', 'time'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              className={`${hardware.hw} ${hardware.ledbtn}`}
              aria-pressed={
                mode === 'all'
                  ? mixOptions.useAllSongs
                  : mode === 'time'
                    ? time
                    : !mixOptions.useAllSongs && !time
              }
              onClick={() =>
                onMixOptionsChange({
                  useAllSongs: mode === 'all',
                  useTimeLimit: mode === 'time',
                })
              }
            >
              <i className={hardware.led} aria-hidden="true" />
              {mode === 'all' ? 'All' : mode === 'songs' ? 'Songs' : 'Time'}
            </button>
          ))}
        </div>
      </div>
      {mixOptions.useAllSongs ? (
        <p className={styles.helpText}>
          Up to {totalSongs} source songs (~{formatMixDuration(duration * 1000)}
          ). Repeated tracks are included once.
        </p>
      ) : (
        <div className={hardware.lenval}>
          <span className={hardware.step}>
            <button
              className={`${hardware.hw} ${hardware.sq}`}
              type="button"
              aria-label="Decrease length"
              disabled={amount <= 1}
              onClick={() => updateAmount(amount - 1)}
            >
              −
            </button>
            <input
              className={`${channel.num} ${channel.wide}`}
              type="number"
              aria-label={time ? 'Minutes' : 'Song count'}
              min={1}
              value={amount}
              onChange={event => {
                if (event.target.value)
                  updateAmount(Math.round(Number(event.target.value)));
              }}
            />
            <button
              className={`${hardware.hw} ${hardware.sq}`}
              type="button"
              aria-label="Increase length"
              onClick={() => updateAmount(amount + 1)}
            >
              +
            </button>
          </span>
          <span className={hardware.u}>{time ? 'min' : 'songs'}</span>
        </div>
      )}
      <div className={hardware.groove} />
      <label className={hardware.switch}>
        <input
          type="checkbox"
          checked={mixOptions.shuffleTracks}
          onChange={event =>
            onMixOptionsChange({ shuffleTracks: event.target.checked })
          }
        />
        <span className={hardware.track} aria-hidden="true">
          <span className={hardware.lever} />
        </span>
        <span className={hardware.txt}>Shuffle</span>
      </label>
      {exceedsLimit && (
        <p className={styles.note}>
          Not enough content: {exceedsLimit.requestedFormatted} requested;{' '}
          {exceedsLimit.availableFormatted} available.
        </p>
      )}
      {ratioImbalance && (
        <ExhaustionWarning
          warning={ratioImbalance}
          mixOptions={mixOptions}
          onMixOptionsChange={onMixOptionsChange}
          onRatioUpdate={onRatioUpdate}
        />
      )}
    </>
  );
}
