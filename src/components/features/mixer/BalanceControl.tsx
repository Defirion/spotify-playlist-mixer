import {
  SpotifyPlaylist,
  RatioConfig,
  RatioConfigItem,
  WeightType,
} from '../../../types';
import hardware from '../../ui/Hardware.module.css';
import styles from '../../PlaylistMixer.module.css';

interface BalanceControlProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  onRatioUpdate?: (id: string, config: RatioConfigItem) => void;
}

export default function BalanceControl({
  selectedPlaylists,
  ratioConfig,
  onRatioUpdate,
}: BalanceControlProps) {
  const method = selectedPlaylists.some(
    playlist => ratioConfig[playlist.id]?.weightType === 'time'
  )
    ? 'time'
    : 'frequency';
  const update = (weightType: WeightType): void =>
    selectedPlaylists.forEach(playlist =>
      onRatioUpdate?.(playlist.id, {
        ...(ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 }),
        weightType,
      })
    );
  return (
    <div>
      <p className={hardware.cap}>Balance by</p>
      <div className={styles.balrow} role="group" aria-label="Balance by">
        {(['frequency', 'time'] as const).map(value => (
          <button
            key={value}
            type="button"
            className={`${hardware.hw} ${hardware.ledbtn}`}
            aria-pressed={method === value}
            disabled={!selectedPlaylists.length}
            onClick={() => update(value)}
          >
            <i className={hardware.led} aria-hidden="true" />
            {value === 'frequency' ? 'Songs' : 'Time'}
          </button>
        ))}
      </div>
    </div>
  );
}
