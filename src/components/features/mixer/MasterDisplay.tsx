import { MixOptions } from '../../../types';
import { formatMixDuration } from './channelAppearance';
import hardware from '../../ui/Hardware.module.css';

interface MasterDisplayProps {
  mixOptions: MixOptions;
  songs: number;
  duration: number;
  hasPreview: boolean;
  stale: boolean;
}

export default function MasterDisplay({
  mixOptions,
  songs,
  duration,
  hasPreview,
  stale,
}: MasterDisplayProps) {
  const time = mixOptions.useTimeLimit && !mixOptions.useAllSongs;
  const target = time
    ? mixOptions.targetDurationSeconds * 1000
    : mixOptions.totalSongs;
  const actual = time ? duration : songs;
  const difference = time
    ? Math.round((actual - target) / 60000)
    : actual - target;
  const label = mixOptions.useAllSongs
    ? 'All songs'
    : time
      ? formatMixDuration(target)
      : `${target} songs`;
  return (
    <div
      className={`${hardware.lcd} ${hardware['lcd-big']}`}
      aria-label="Mix totals"
      aria-live="polite"
    >
      <div className={hardware.l1}>
        <span>
          <b>{songs}</b>
          <span className={hardware.u}>songs</span>
        </span>
        <b>{formatMixDuration(duration)}</b>
      </div>
      <div className={hardware.mbar}>
        <i
          style={{
            width: `${mixOptions.useAllSongs ? (hasPreview ? 100 : 0) : Math.min(100, (actual / Math.max(1, target)) * 100)}%`,
          }}
        />
      </div>
      <div className={hardware.l2}>
        <span>Target {label}</span>
        <span>
          {stale
            ? 'Out of date'
            : hasPreview && !mixOptions.useAllSongs
              ? `${difference >= 0 ? '+' : ''}${difference} ${time ? 'm' : 'songs'}`
              : 'Press Preview'}
        </span>
      </div>
    </div>
  );
}
