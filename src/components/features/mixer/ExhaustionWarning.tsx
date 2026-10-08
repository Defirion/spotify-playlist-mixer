import { MixOptions, RatioConfigItem } from '../../../types';
import { RatioImbalanceWarning } from '../../../utils/exhaustionPrediction';
import styles from '../../PlaylistMixer.module.css';

interface ExhaustionWarningProps {
  warning: RatioImbalanceWarning | null;
  mixOptions: MixOptions;
  onMixOptionsChange: (updates: Partial<MixOptions>) => void;
  onRatioUpdate?: (playlistId: string, config: RatioConfigItem) => void;
}

export default function ExhaustionWarning({
  warning,
  mixOptions,
  onMixOptionsChange,
  onRatioUpdate,
}: ExhaustionWarningProps) {
  if (!warning && !mixOptions.continueWhenPlaylistEmpty) return null;
  return (
    <div className={styles.note} role="status">
      <p>
        {warning ? (
          <>
            <strong>Running low:</strong> {warning.limitingPlaylistName} is
            estimated to run out around {warning.mixWillBecomeImbalancedAt}{' '}
            {warning.unit}.{' '}
            {warning.willStopEarly
              ? 'The mix will stop there.'
              : 'The mix will continue with remaining playlists.'}
          </>
        ) : (
          'Continuing with remaining playlists.'
        )}
      </p>
      <div className={styles.acts}>
        {warning?.suggestedRatios?.length && onRatioUpdate ? (
          <button
            type="button"
            className={styles.link}
            onClick={() =>
              warning.suggestedRatios?.forEach(suggestion =>
                onRatioUpdate(suggestion.playlistId, suggestion.config)
              )
            }
          >
            Apply suggested ratios
          </button>
        ) : null}
        <button
          type="button"
          className={styles.link}
          onClick={() =>
            onMixOptionsChange({
              continueWhenPlaylistEmpty: !mixOptions.continueWhenPlaylistEmpty,
            })
          }
        >
          {mixOptions.continueWhenPlaylistEmpty
            ? 'Stop at first empty playlist'
            : 'Continue without it'}
        </button>
      </div>
    </div>
  );
}
