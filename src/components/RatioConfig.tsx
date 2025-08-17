import React, { useState, memo, useCallback, useEffect } from 'react';
import { SpotifyPlaylist } from '../types/spotify';
import {
  RatioConfig as RatioConfigType,
  RatioConfigItem,
  WeightType,
} from '../types/mixer';
import { useRatioCalculation } from '../hooks/useRatioCalculation';
import styles from './RatioConfig.module.css';

interface ExampleMixDisplayProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfigType;
  globalBalanceMethod: WeightType;
}

// Memoized component for expensive example mix calculations
const ExampleMixDisplay = memo<ExampleMixDisplayProps>(
  ({ selectedPlaylists, ratioConfig, globalBalanceMethod }) => {
    const { exampleMixData } = useRatioCalculation(
      selectedPlaylists,
      ratioConfig,
      globalBalanceMethod
    );

    return (
      <div className={styles.exampleMixContainer}>
        <div className={styles.exampleMixContent}>
          <div className={styles.exampleMixTitle}>
            🎯 {exampleMixData.exampleTitle}
          </div>
          <div className={styles.exampleMixList}>
            {exampleMixData.playlistExamples.map(example => (
              <div key={example.id} className={styles.exampleMixItem}>
                • <strong>{example.name}:</strong> {example.displayText},{' '}
                {example.groupText} ({example.weightTypeText})
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ExampleMixDisplay.displayName = 'ExampleMixDisplay';

interface RatioConfigProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfigType;
  onRatioUpdate: (playlistId: string, config: RatioConfigItem) => void;
  onPlaylistRemove?: (playlistId: string) => void;
  className?: string;
}

const RatioConfig = memo<RatioConfigProps>(
  ({
    selectedPlaylists,
    ratioConfig,
    onRatioUpdate,
    onPlaylistRemove,
    className,
  }) => {
    const [globalBalanceMethod, setGlobalBalanceMethod] =
      useState<WeightType>('frequency');

    const { formatDurationFromSeconds, getPlaylistPercentage } =
      useRatioCalculation(selectedPlaylists, ratioConfig, globalBalanceMethod);

    // Update global balance method when ratioConfig changes (from presets)
    useEffect(() => {
      if (selectedPlaylists.length > 0 && ratioConfig) {
        // Check if any playlist has weightType 'time'
        const hasTimeWeighting = selectedPlaylists.some(playlist => {
          const config = ratioConfig[playlist.id];
          return config && config.weightType === 'time';
        });

        // Set global balance method based on the weightType found
        const newMethod: WeightType = hasTimeWeighting ? 'time' : 'frequency';
        if (newMethod !== globalBalanceMethod) {
          setGlobalBalanceMethod(newMethod);
        }
      }
    }, [ratioConfig, selectedPlaylists, globalBalanceMethod]);

    const handleConfigChange = useCallback(
      (
        playlistId: string,
        field: keyof RatioConfigItem,
        value: string | number
      ) => {
        const currentConfig = ratioConfig[playlistId] || {
          min: 1,
          max: 2,
          weight: 2,
          weightType: 'frequency' as WeightType,
        };

        const newValue =
          field === 'weightType' ? value : parseInt(value as string) || 1;
        onRatioUpdate(playlistId, {
          ...currentConfig,
          [field]: newValue,
        });
      },
      [ratioConfig, onRatioUpdate]
    );

    const handleGlobalBalanceMethodChange = useCallback(
      (method: WeightType) => {
        setGlobalBalanceMethod(method);
        // Update all playlists to use the new balance method
        selectedPlaylists.forEach(playlist => {
          handleConfigChange(playlist.id, 'weightType', method);
        });
      },
      [selectedPlaylists, handleConfigChange]
    );

    const getWeightDescription = useCallback(
      (weight: number, playlistId: string): string => {
        const percentage = getPlaylistPercentage(playlistId);

        if (weight <= 20) return `Low (${weight}) - ~${percentage}% of mix`;
        if (weight <= 40) return `Normal (${weight}) - ~${percentage}% of mix`;
        if (weight <= 60) return `High (${weight}) - ~${percentage}% of mix`;
        if (weight <= 80) return `Top (${weight}) - ~${percentage}% of mix`;
        return `Max (${weight}) - ~${percentage}% of mix`;
      },
      [getPlaylistPercentage]
    );

    const getGroupDescription = useCallback(
      (min: number, max: number): string => {
        if (min === max) {
          return min === 1 ? '1 song' : `${min} songs`;
        }
        return `${min}-${max} songs`;
      },
      []
    );

    return (
      <div className={`card ${className || ''}`}>
        <h2>🎛️ Customize Your Mix</h2>
        <p>Choose how your playlists blend together</p>

        {/* Universal Balance Method */}
        <div className={styles.balanceMethodContainer}>
          <label className={styles.balanceMethodLabel}>
            ⚖️ Balance Method (applies to all playlists):
          </label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${globalBalanceMethod === 'frequency' ? 'active' : ''}`}
              onClick={() => handleGlobalBalanceMethodChange('frequency')}
            >
              Same Song Count
            </button>
            <button
              type="button"
              className={`toggle-option ${globalBalanceMethod === 'time' ? 'active' : ''}`}
              onClick={() => handleGlobalBalanceMethodChange('time')}
            >
              Same Play Time
            </button>
          </div>
          <div className={styles.balanceMethodDescription}>
            {globalBalanceMethod === 'time'
              ? 'Perfect for mixing genres with different song lengths (salsa vs bachata)'
              : 'Traditional approach - equal number of songs from each playlist'}
          </div>
        </div>

        <div className={styles.ratioControls}>
          {selectedPlaylists.map(playlist => {
            const config = ratioConfig[playlist.id] || {
              min: 1,
              max: 2,
              weight: 1,
              weightType: 'frequency' as WeightType,
            };

            const hasImage = Boolean(playlist.images?.[0]?.url);

            return (
              <div key={playlist.id} className={styles.playlistContainer}>
                <div
                  className={`${styles.ratioGrid} ${!hasImage ? styles.ratioGridNoImage : ''}`}
                >
                  {hasImage && (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className={styles.playlistCover}
                    />
                  )}
                  <div className={styles.playlistInfo}>
                    <div className={styles.playlistName}>{playlist.name}</div>
                    <div className={styles.playlistDetails}>
                      {playlist.tracks.total} tracks
                      {playlist.realAverageDurationSeconds && (
                        <span>
                          {' '}
                          • avg{' '}
                          {formatDurationFromSeconds(
                            playlist.realAverageDurationSeconds
                          )}{' '}
                          per song
                        </span>
                      )}
                      {playlist.realAverageDurationSeconds &&
                        playlist.tracksWithDuration !==
                          playlist.tracks.total && (
                          <span className={styles.playlistDurationInfo}>
                            {' '}
                            ({playlist.tracksWithDuration} with duration data)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Inline Sliders */}
                  <div className={styles.sliderContainer}>
                    <div className={styles.sliderLabel}>
                      🎵 Play together:{' '}
                      {getGroupDescription(config.min, config.max)}
                    </div>
                    <div className={styles.sliderWrapper}>
                      <span className={styles.sliderMinMax}>1</span>
                      <div className={styles.dualRangeSlider}>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={config.min}
                          onChange={e => {
                            const newMin = parseInt(e.target.value);
                            // If new min exceeds current max, update both in a
                            // single call to avoid transient inconsistent states
                            if (newMin > config.max) {
                              onRatioUpdate(playlist.id, {
                                min: newMin,
                                max: newMin,
                                weight: config.weight,
                                weightType: config.weightType,
                              });
                            } else {
                              handleConfigChange(playlist.id, 'min', newMin);
                            }
                          }}
                          className={styles.rangeMin}
                        />
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={config.max}
                          onChange={e => {
                            const newMax = parseInt(e.target.value);
                            // Ensure max never drops below current min. If it does,
                            // clamp the max to the existing min so we don't move
                            // the min down unexpectedly.
                            const adjustedMax = Math.max(newMax, config.min);

                            onRatioUpdate(playlist.id, {
                              min: config.min,
                              max: adjustedMax,
                              weight: config.weight,
                              weightType: config.weightType,
                            });
                          }}
                          className={styles.rangeMax}
                        />
                      </div>
                      <span className={styles.sliderMinMax}>8</span>
                    </div>

                    <div className={styles.sliderLabel}>
                      🎲 Priority:{' '}
                      {getWeightDescription(config.weight, playlist.id)}
                    </div>
                    <div className={styles.sliderWrapper}>
                      <span className={styles.sliderMinMax}>Low</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={config.weight}
                        onChange={e =>
                          handleConfigChange(
                            playlist.id,
                            'weight',
                            e.target.value
                          )
                        }
                        className={styles.ratioConfigSlider}
                      />
                      <span className={styles.sliderMinMax}>High</span>
                    </div>
                  </div>
                </div>
                {onPlaylistRemove && (
                  <button
                    onClick={() => onPlaylistRemove(playlist.id)}
                    className={styles.removeButton}
                    title={`Remove ${playlist.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedPlaylists.length > 1 && (
          <ExampleMixDisplay
            selectedPlaylists={selectedPlaylists}
            ratioConfig={ratioConfig}
            globalBalanceMethod={globalBalanceMethod}
          />
        )}
      </div>
    );
  }
);

RatioConfig.displayName = 'RatioConfig';

export default RatioConfig;
