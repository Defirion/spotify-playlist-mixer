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
import MixControls from './MixControls';
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
  loading: boolean;
  previewLoading: boolean;
  generatePreview: () => Promise<void>;
  createPlaylist: () => Promise<void>;
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
  loading,
  previewLoading,
  generatePreview,
  createPlaylist,
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
      <MixControls
        selectedPlaylists={selectedPlaylists}
        mixOptions={mixOptions}
        hasPreview={hasPreview}
        loading={loading}
        previewLoading={previewLoading}
        onGeneratePreview={generatePreview}
        onCreatePlaylist={createPlaylist}
      />
    </aside>
  );
}
