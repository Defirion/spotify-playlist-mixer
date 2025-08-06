import React, { memo } from 'react';
import TrackSourceModal from './TrackSourceModal';
import { useUnselectedTracks } from '../hooks/useUnselectedTracks';
import { SpotifyTrack, SpotifyPlaylist } from '../types';

interface AddUnselectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  currentTracks: SpotifyTrack[];
  onAddTracks: (tracks: SpotifyTrack[]) => void;
}

const AddUnselectedModal = memo<AddUnselectedModalProps>(
  ({
    isOpen,
    onClose,
    accessToken,
    selectedPlaylists,
    currentTracks,
    onAddTracks,
  }) => {
    // Use the unselected tracks hook for data fetching
    const { filteredTracks, loading, error, searchQuery, setSearchQuery } =
      useUnselectedTracks({
        accessToken,
        selectedPlaylists,
        currentTracks,
      });

    return (
      <TrackSourceModal
        // Modal props
        isOpen={isOpen}
        onClose={onClose}
        title="➕ Add Unselected Tracks"
        // Data props
        tracks={filteredTracks}
        loading={loading}
        error={error}
        onAddTracks={onAddTracks}
        // Search props
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder="Search tracks, artists, or albums..."
        // Drag props
        dragType="modal-track"
        createDragPayload={track => ({
          track: track,
          source: 'AddUnselectedModal',
        })}
        // Display props
        emptyMessage={
          searchQuery
            ? 'No tracks match your search'
            : 'All tracks from your playlists are already included'
        }
      />
    );
  }
);

AddUnselectedModal.displayName = 'AddUnselectedModal';

export default AddUnselectedModal;
