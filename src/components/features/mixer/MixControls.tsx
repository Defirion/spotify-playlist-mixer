import { MixOptions, SpotifyPlaylist } from '../../../types';
import hardware from '../../ui/Hardware.module.css';

interface MixControlsProps {
  selectedPlaylists: SpotifyPlaylist[];
  mixOptions: MixOptions;
  hasPreview: boolean;
  loading: boolean;
  previewLoading: boolean;
  onGeneratePreview: () => void;
  onCreatePlaylist: () => void;
}

export default function MixControls({
  selectedPlaylists,
  mixOptions,
  loading,
  previewLoading,
  onGeneratePreview,
  onCreatePlaylist,
}: MixControlsProps) {
  const ready = selectedPlaylists.length >= 2;
  const busy = loading || previewLoading;
  return (
    <>
      <button
        className={hardware.hw}
        type="button"
        disabled={!ready || busy}
        onClick={onGeneratePreview}
      >
        {previewLoading ? 'Generating...' : 'Preview'}
      </button>
      <button
        className={hardware.go}
        type="button"
        disabled={!ready || !mixOptions.playlistName?.trim() || busy}
        onClick={onCreatePlaylist}
      >
        {loading ? 'Creating...' : 'Create on Spotify'}
      </button>
      <p className={hardware.privacy}>
        Saved playlists stay off your profile, but anyone with the link can open
        them.
      </p>
    </>
  );
}
