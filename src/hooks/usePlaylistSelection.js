import { useState, useCallback } from 'react';

/**
 * Custom hook for managing selected playlists state
 * Handles playlist selection, deselection, and clearing
 */
export const usePlaylistSelection = (initialPlaylists = []) => {
  const [selectedPlaylists, setSelectedPlaylists] = useState(initialPlaylists);

  const selectPlaylist = useCallback(playlist => {
    setSelectedPlaylists(prev => {
      // Check if playlist is already selected
      if (prev.find(p => p.id === playlist.id)) {
        return prev; // Already selected, no change
      }
      return [...prev, playlist];
    });
  }, []);

  const deselectPlaylist = useCallback(playlistId => {
    setSelectedPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const togglePlaylistSelection = useCallback(playlist => {
    setSelectedPlaylists(prev => {
      const isSelected = prev.find(p => p.id === playlist.id);
      if (isSelected) {
        return prev.filter(p => p.id !== playlist.id);
      } else {
        return [...prev, playlist];
      }
    });
  }, []);

  const clearAllPlaylists = useCallback(() => {
    setSelectedPlaylists([]);
  }, []);

  const isPlaylistSelected = useCallback(
    playlistId => {
      return selectedPlaylists.some(p => p.id === playlistId);
    },
    [selectedPlaylists]
  );

  return {
    selectedPlaylists,
    selectPlaylist,
    deselectPlaylist,
    togglePlaylistSelection,
    clearAllPlaylists,
    isPlaylistSelected,
  };
};
