import React from 'react';
import { SpotifyPlaylist } from '../types/spotify';
import {
  PresetTemplate,
  PresetApplyData,
  RatioConfig,
  PresetSettings,
  RatioConfigItem,
} from '../types/mixer';
import { PresetTemplatesProps } from '../types/components';
import styles from './PresetTemplates.module.css';

const PresetTemplates: React.FC<PresetTemplatesProps> = ({
  selectedPlaylists,
  onApplyPreset,
  className,
  testId,
}) => {
  const presets: PresetTemplate[] = [
    {
      id: 'karimctiva',
      name: '💃 Karimctiva',
      description: 'Balanced bachata/salsa mixing with dance flow',
      ratios: (playlists: SpotifyPlaylist[]): RatioConfigItem[] =>
        playlists.map((playlist: SpotifyPlaylist): RatioConfigItem => {
          const name = playlist.name.toLowerCase();
          if (name.includes('bachata')) {
            return { min: 2, max: 2, weight: 55, weightType: 'time' };
          } else if (name.includes('salsa')) {
            return { min: 1, max: 2, weight: 45, weightType: 'time' };
          } else {
            return { min: 1, max: 2, weight: 50, weightType: 'time' };
          }
        }),
      settings: {
        shuffleTracks: true,
        useTimeLimit: true,
        targetDuration: 300,
        useAllSongs: false,
      } as PresetSettings,
    },
    {
      id: 'workout-mix',
      name: '💪 Workout Mix',
      description: 'High energy with consistent tempo',
      ratios: (playlists: SpotifyPlaylist[]): RatioConfigItem[] =>
        playlists.map(
          (): RatioConfigItem => ({
            min: 3,
            max: 5,
            weight: 3,
            weightType: 'frequency',
          })
        ),
      settings: {
        shuffleTracks: true,
        useTimeLimit: true,
        targetDuration: 60,
        useAllSongs: false,
      } as PresetSettings,
    },
    {
      id: 'road-trip',
      name: '🚗 Road Trip',
      description: 'A varied, evenly blended road-trip mix',
      ratios: (playlists: SpotifyPlaylist[]): RatioConfigItem[] =>
        playlists.map(
          (): RatioConfigItem => ({
            min: 2,
            max: 3,
            weight: 2,
            weightType: 'frequency',
          })
        ),
      settings: {
        shuffleTracks: true,
        useTimeLimit: true,
        targetDuration: 180,
        useAllSongs: false,
      } as PresetSettings,
    },
  ];

  const handleApplyPreset = (preset: PresetTemplate): void => {
    if (selectedPlaylists.length === 0) {
      alert('Please add some playlists first!');
      return;
    }

    const ratioConfig: RatioConfig = {};
    selectedPlaylists.forEach((playlist: SpotifyPlaylist, index: number) => {
      const ratioItems = preset.ratios(selectedPlaylists);
      ratioConfig[playlist.id] = ratioItems[index] || {
        min: 1,
        max: 2,
        weight: 2,
        weightType: 'frequency',
      };
    });

    const applyData: PresetApplyData = {
      ratioConfig,
      settings: preset.settings,
      presetName: preset.name,
    };

    onApplyPreset(applyData);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    preset: PresetTemplate
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleApplyPreset(preset);
    }
  };

  if (selectedPlaylists.length === 0) {
    return null;
  }

  return (
    <div
      className={`card ${styles.container} ${className || ''}`.trim()}
      data-testid={testId}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>🎯 Quick Start Templates</h2>
        <p className={styles.description}>
          Apply proven mixing patterns for different occasions
        </p>
      </div>

      <div className={styles.presetsGrid}>
        {presets.map((preset: PresetTemplate) => (
          <div
            key={preset.id}
            className={styles.presetCard}
            onClick={() => handleApplyPreset(preset)}
            onKeyDown={e => handleKeyDown(e, preset)}
            role="button"
            tabIndex={0}
            aria-label={`Apply ${preset.name} preset template`}
          >
            <h3 className={styles.presetName}>{preset.name}</h3>
            <p className={styles.presetDescription}>{preset.description}</p>
            <div className={styles.presetMeta}>
              Playlist-balanced order • {selectedPlaylists.length} playlists
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tip}>
        <span className={styles.tipIcon}>💡</span>
        <strong className={styles.tipStrong}>Tip:</strong> These templates will
        automatically configure ratios and settings. You can still adjust them
        afterwards!
      </div>
    </div>
  );
};

export default PresetTemplates;
