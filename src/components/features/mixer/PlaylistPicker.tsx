import { useCallback, useEffect, useState } from 'react';
import PlaylistSelector from '../../PlaylistSelector';
import Modal from '../../ui/Modal';
import { SpotifyPlaylist } from '../../../types';
import styles from '../../RatioConfig.module.css';

interface PlaylistPickerProps {
  accessToken: string | null;
  selectedPlaylists: SpotifyPlaylist[];
  onPlaylistSelect: (playlist: SpotifyPlaylist) => void;
  onError: (error: unknown) => void;
}

export default function PlaylistPicker(props: PlaylistPickerProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const atLimit = props.selectedPlaylists.length >= 10;
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === '/' &&
        !atLimit &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]'
        )
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [atLimit]);
  return (
    <>
      <button
        className={styles.ghost}
        type="button"
        disabled={atLimit}
        onClick={() => setOpen(true)}
        aria-keyshortcuts="/"
      >
        <span>
          <b aria-hidden="true">+</b>
          {atLimit ? '10 playlists added' : 'Add playlist'}
        </span>
      </button>
      {open && (
        <Modal isOpen onClose={close} title="Add playlist">
          <PlaylistSelector {...props} onClearAll={() => {}} compact />
        </Modal>
      )}
    </>
  );
}
