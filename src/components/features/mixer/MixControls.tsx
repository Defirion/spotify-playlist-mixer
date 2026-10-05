import React from 'react';
import { SpotifyPlaylist, MixOptions } from '../../../types';
import styles from '../../PlaylistMixer.module.css';

interface MixControlsProps {
  selectedPlaylists: SpotifyPlaylist[];
  mixOptions: MixOptions;
  hasPreview: boolean;
  loading: boolean;
  previewLoading: boolean;
  onGeneratePreview: () => void;
  onCreatePlaylist: () => void;
}

const MixControls: React.FC<MixControlsProps> = ({
  selectedPlaylists,
  mixOptions,
  hasPreview,
  loading,
  previewLoading,
  onGeneratePreview,
  onCreatePlaylist,
}) => {
  const canGeneratePreview = selectedPlaylists.length >= 2;
  const playlistName =
    mixOptions && typeof mixOptions.playlistName === 'string'
      ? mixOptions.playlistName
      : '';
  const canCreatePlaylist =
    canGeneratePreview && playlistName.trim().length > 0;

  return (
    <>
      <p className={styles.helpText}>
        Saved playlists stay off your Spotify profile, but anyone with the link
        may still access them. To restrict access, open the saved playlist in
        Spotify and choose “Make private”.
      </p>
      <div className={styles.actionButtons}>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onGeneratePreview}
          disabled={!canGeneratePreview || previewLoading || loading}
        >
          {previewLoading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              {hasPreview ? 'Regenerating...' : 'Generating...'}
            </>
          ) : (
            <>🔄 {hasPreview ? 'Regenerate' : 'Generate Preview'}</>
          )}
        </button>

        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={onCreatePlaylist}
          disabled={!canCreatePlaylist || loading || previewLoading}
        >
          {loading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              Creating Playlist...
            </>
          ) : (
            <>✨ Create This Playlist</>
          )}
        </button>
      </div>
    </>
  );
};

export default MixControls;
