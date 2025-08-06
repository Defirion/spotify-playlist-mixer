import React, { memo, useEffect } from 'react';
import TrackSourceModal from './TrackSourceModal';
import useSpotifySearch from '../hooks/useSpotifySearch';
import { SpotifyTrack } from '../types';

interface SpotifySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onAddTracks: (tracks: SpotifyTrack[]) => void;
  className?: string;
}

const SpotifySearchModal = memo<SpotifySearchModalProps>(
  ({ isOpen, onClose, accessToken, onAddTracks, className = '' }) => {
    // Use the Spotify search hook with auto-search enabled
    const {
      query,
      results: searchResults,
      loading,
      error,
      setQuery,
      search,
      clear,
    } = useSpotifySearch(accessToken, {
      autoSearch: true, // Enable search-as-you-type
      debounceMs: 300, // Add debouncing to avoid too many API calls
      limit: 20,
    });

    // Handle adding tracks with source metadata
    const handleAddTracksWithSource = (tracks: SpotifyTrack[]) => {
      const tracksWithSource = tracks.map(track => ({
        ...track,
        sourcePlaylist: 'search',
        sourcePlaylistName: 'Spotify Search',
      }));
      onAddTracks(tracksWithSource);
    };

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        clear();
      }
    }, [isOpen, clear]);

    return (
      <TrackSourceModal
        // Modal props
        isOpen={isOpen}
        onClose={onClose}
        title="🎵 Search Spotify"
        className={className}
        // Data props
        tracks={searchResults}
        loading={loading}
        error={error}
        onAddTracks={handleAddTracksWithSource}
        // Search props
        searchQuery={query}
        onSearchQueryChange={setQuery}
        searchPlaceholder="Type to search songs, artists, or albums..."
        showSearchButton={true}
        onManualSearch={search}
        showLoadingIndicator={true}
        // Drag props
        dragType="search-track"
        createDragPayload={track => ({
          track: track,
          query: query,
        })}
        // Display props
        emptyMessage="No tracks found. Try a different search term."
      />
    );
  }
);

SpotifySearchModal.displayName = 'SpotifySearchModal';

export default SpotifySearchModal;
