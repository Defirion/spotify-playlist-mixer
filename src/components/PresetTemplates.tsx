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
  mixOptions,
  ratioConfig,
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
        targetDurationSeconds: 300 * 60,
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
        targetDurationSeconds: 60 * 60,
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
        targetDurationSeconds: 180 * 60,
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
    event: React.KeyboardEvent<HTMLButtonElement>,
    preset: PresetTemplate
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleApplyPreset(preset);
    }
  };

  return (
    <div className={className || ''} data-testid={testId}>
      <p className={styles.cap}>Presets</p>

      <div className={styles.pads}>
        {presets.map((preset: PresetTemplate) => {
          const ratios = preset.ratios(selectedPlaylists);
          const active =
            selectedPlaylists.length > 0 &&
            !!mixOptions &&
            !!ratioConfig &&
            Object.entries(preset.settings).every(
              ([key, value]) =>
                mixOptions[key as keyof typeof mixOptions] === value
            ) &&
            selectedPlaylists.every((playlist, index) =>
              Object.entries(ratios[index]).every(
                ([key, value]) =>
                  ratioConfig[playlist.id]?.[key as keyof RatioConfigItem] ===
                  value
              )
            );
          return (
            <button
              type="button"
              key={preset.id}
              className={`${styles.pad} ${active ? styles.active : ''}`}
              disabled={!selectedPlaylists.length}
              aria-pressed={active}
              onClick={() => handleApplyPreset(preset)}
              onKeyDown={e => handleKeyDown(e, preset)}
              aria-label={`Apply ${preset.name} preset template`}
            >
              <b>{preset.name.replace(/^[^A-Za-z]+/, '')}</b>
              <span>{preset.settings.targetDurationSeconds / 3600} h</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetTemplates;
