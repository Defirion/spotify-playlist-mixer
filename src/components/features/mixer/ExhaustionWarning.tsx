import React from 'react';
import { MixOptions, RatioConfigItem } from '../../../types';
import { RatioImbalanceWarning } from '../../../utils/exhaustionPrediction';
import styles from '../../PlaylistMixer.module.css';

interface ExhaustionWarningProps {
  warning: RatioImbalanceWarning | null;
  mixOptions: MixOptions;
  onMixOptionsChange: (updates: Partial<MixOptions>) => void;
  onRatioUpdate?: (playlistId: string, config: RatioConfigItem) => void;
}

const ExhaustionWarning: React.FC<ExhaustionWarningProps> = ({
  warning,
  mixOptions,
  onMixOptionsChange,
  onRatioUpdate,
}) => (
  <>
    {warning && (
      <div className={styles.warningBox}>
        <span className={styles.warningIcon} aria-hidden="true">
          ⚠️
        </span>
        <div className={styles.exhaustionContent}>
          <div className={styles.warningText}>
            <strong>Ratio imbalance warning:</strong> "
            {warning.limitingPlaylistName}" is estimated to run out around{' '}
            {warning.mixWillBecomeImbalancedAt} {warning.unit}
            {warning.willStopEarly
              ? ', and mixing will stop there'
              : ', but mixing will continue with remaining playlists'}
            .
          </div>
          <p className={styles.helpText}>
            Based on source counts and average song lengths (3.5 minutes when
            unknown). Shared songs, unavailable tracks and song groups can
            change the result. Check the preview for the actual mix.
          </p>
          {!!warning.suggestedRatios?.length && (
            <div>
              <strong>Suggested source balance:</strong>
              <ul className={styles.suggestedRatios}>
                {warning.suggestedRatios.map(suggestion => (
                  <li key={suggestion.playlistId}>
                    {suggestion.name}: {suggestion.percentage}%
                  </li>
                ))}
              </ul>
              <p className={styles.helpText}>
                Match the available{' '}
                {warning.suggestedRatios[0].config.weightType === 'time'
                  ? 'listening time'
                  : 'song counts'}{' '}
                to help playlists run out closer together. Applying this changes
                your mix proportions.
              </p>
              {onRatioUpdate && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={() =>
                    warning.suggestedRatios?.forEach(suggestion =>
                      onRatioUpdate(suggestion.playlistId, suggestion.config)
                    )
                  }
                >
                  Apply suggested ratios
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )}
    <div className={styles.warningOption}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={mixOptions.continueWhenPlaylistEmpty}
          onChange={e =>
            onMixOptionsChange({ continueWhenPlaylistEmpty: e.target.checked })
          }
          className={styles.checkbox}
        />
        Continue with remaining playlists when one runs out
      </label>
      <p className={styles.helpText}>
        When off, stop at the first exhausted playlist. When on, use the
        remaining playlists until your target is reached or all songs are used.
      </p>
    </div>
  </>
);

export default ExhaustionWarning;
