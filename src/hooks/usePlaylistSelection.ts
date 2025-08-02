import { useState, useCallback } from 'react';
import { SpotifyPlaylist } from '../types/spotify';

/**
 * Custom hook for managing selected playlists state
 * Handles playlist selection, deselection, and clearing
 */
export const usePlaylistSelection = (
  initialPlaylists: SpotifyPlaylist[] = []
) => {
  const [selectedPlaylists, setSelectedPlaylists] =
    useState<SpotifyPlaylist[]>(initialPlaylists);

  const selectPlaylist = useCallback((playlist: SpotifyPlaylist) => {
    setSelectedPlaylists(prev => {
      // Check if playlist is already selected
      if (prev.find(p => p.id === playlist.id)) {
        return prev; // Already selected, no change
      }
      return [...prev, playlist];
    });
  }, []);

  const deselectPlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const togglePlaylistSelection = useCallback((playlist: SpotifyPlaylist) => {
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
    (playlistId: string): boolean => {
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
