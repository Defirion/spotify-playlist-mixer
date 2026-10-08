import { ReactNode } from 'react';
import {
  SpotifyPlaylist,
  MixOptions,
  RatioConfig,
  RatioConfigItem,
} from '../../../types';
import PlaylistForm from './PlaylistForm';
import BalanceControl from './BalanceControl';
import MasterDisplay from './MasterDisplay';
import styles from '../../PlaylistMixer.module.css';

export interface MixerSettingsProps {
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
  updateMixOptions: (updates: Partial<MixOptions>) => void;
  onRatioUpdate?: (id: string, ratio: RatioConfigItem) => void;
  presets?: ReactNode;
}

interface MixerPanelProps extends MixerSettingsProps {
  songs: number;
  duration: number;
  hasPreview: boolean;
  stale: boolean;
}
export default function MixerPanel({
  selectedPlaylists,
  ratioConfig,
  mixOptions,
  updateMixOptions,
  onRatioUpdate,
  presets,
  songs,
  duration,
  hasPreview,
  stale,
}: MixerPanelProps) {
  return (
    <aside className={styles.master} aria-label="Presets and mix settings">
      {presets}
      <PlaylistForm
        mixOptions={mixOptions}
        onMixOptionsChange={updateMixOptions}
        selectedPlaylists={selectedPlaylists}
        balance={
          <BalanceControl
            selectedPlaylists={selectedPlaylists}
            ratioConfig={ratioConfig}
            onRatioUpdate={onRatioUpdate}
          />
        }
      />
      <MasterDisplay
        mixOptions={mixOptions}
        songs={songs}
        duration={duration}
        hasPreview={hasPreview}
        stale={stale}
      />
    </aside>
  );
}
