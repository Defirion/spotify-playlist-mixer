import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { SpotifyPlaylist } from '../types';
import { getPlaylistItemCount } from '../utils/spotify';
import LoadingOverlay from './LoadingOverlay';
import { usePlaylistSearch } from '../hooks/usePlaylistSearch';
import { useSpotifyUrlHandler } from '../hooks/useSpotifyUrlHandler';
import { getDisplayErrorWithLabel } from '../utils/normalizeError';
import styles from './PlaylistSelector.module.css';

interface PlaylistSelectorProps {
  accessToken: string | null;
  selectedPlaylists: SpotifyPlaylist[];
  onPlaylistSelect: (playlist: SpotifyPlaylist) => void;
  onClearAll: () => void;
  // Keep backwards-compatible behavior (string errors) but accept any
  // richer error objects (ApiError, Error, etc.) so callers can pass
  // normalized error shapes through the global UI store.
  onError: (error: unknown) => void;
}

const PlaylistSelector = memo<PlaylistSelectorProps>(
  ({
    accessToken,
    selectedPlaylists,
    onPlaylistSelect,
    onClearAll,
    onError,
  }) => {
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [playlistInput, setPlaylistInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [inputType, setInputType] = useState<'search' | 'url'>('search');

    // Ref for the input to manage focus
    const inputRef = useRef<HTMLInputElement>(null);

    // Custom hooks
    const {
      setQuery,
      results: searchResults,
      loading: searching,
      error: searchError,
      showResults: showSearchResults,
      setShowResults,
      clearResults,
    } = usePlaylistSearch({
      accessToken,
      debounceMs: 150,
      limit: 10,
    });

    const { isValidSpotifyLink, isValidPlaylistUrl, handleAddPlaylistByUrl } =
      useSpotifyUrlHandler({
        accessToken,
        selectedPlaylists,
        onPlaylistSelect: playlist => {
          onPlaylistSelect(playlist);
          setPlaylistInput('');
          clearResults();

          // Auto-focus input for immediate next search
          setTimeout(() => {
            if (inputRef.current) {
              try {
                inputRef.current.focus({ preventScroll: true });
              } catch (e) {
                inputRef.current.focus();
              }
            }
          }, 100);
        },
        onError,
      });

    // Handle search error - prefer passing through plain strings unchanged
    // for backward-compatibility; if a richer error object is present,
    // normalize it to the DisplayError details so callers can surface
    // structured information.
    useEffect(() => {
      if (searchError) {
        if (typeof searchError === 'string') {
          onError(searchError);
        } else {
          onError(getDisplayErrorWithLabel(searchError).details);
        }
      }
    }, [searchError, onError]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPlaylistInput(value);
        setQuery(value);

        if (isValidSpotifyLink(value.trim())) {
          setInputType('url');
          setShowResults(false); // Hide search results if it's a URL
        } else {
          setInputType('search');
          // Search will be triggered by the usePlaylistSearch hook
        }
      },
      [isValidSpotifyLink, setQuery, setShowResults]
    );

    const handleInputSubmit = useCallback(async () => {
      if (!playlistInput.trim()) {
        onError('Please enter a playlist URL or search term');
        return;
      }

      const input = playlistInput.trim();

      // If it's a valid Spotify URL/ID, add it directly
      if (isValidPlaylistUrl(input)) {
        setLoading(true);
        setShowResults(false);
        try {
          await handleAddPlaylistByUrl(input);
        } finally {
          setLoading(false);
        }
      } else {
        // For search terms, results should already be showing from the hook
        if (searchResults.length === 0) {
          onError('No playlists found for this search term');
        }
      }
    }, [
      playlistInput,
      onError,
      isValidPlaylistUrl,
      handleAddPlaylistByUrl,
      setShowResults,
      searchResults.length,
    ]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (searchResults.length > 0 && showSearchResults) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prevIndex =>
              prevIndex === -1
                ? 0
                : Math.min(prevIndex + 1, searchResults.length - 1)
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prevIndex =>
              prevIndex <= 0 ? 0 : prevIndex - 1
            );
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex !== -1 && searchResults[highlightedIndex]) {
              setLoading(true);
              setShowResults(false);
              handleAddPlaylistByUrl(
                searchResults[highlightedIndex].id
              ).finally(() => setLoading(false));
            } else {
              handleInputSubmit();
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleInputSubmit();
        }
      },
      [
        searchResults,
        showSearchResults,
        highlightedIndex,
        handleAddPlaylistByUrl,
        handleInputSubmit,
        setShowResults,
      ]
    );

    // Auto-focus input on component mount
    useEffect(() => {
      if (inputRef.current) {
        try {
          inputRef.current.focus({ preventScroll: true });
        } catch (e) {
          inputRef.current.focus();
        }
      }
    }, []);

    // Reset highlighted index when search results change and always highlight first result
    useEffect(() => {
      setHighlightedIndex(searchResults.length > 0 ? 0 : -1);
    }, [searchResults, showSearchResults]);

    const handleSearchResultClick = useCallback(
      (playlist: SpotifyPlaylist) => {
        setShowResults(false);
        onPlaylistSelect(playlist);
        setPlaylistInput('');
        clearResults();

        // Auto-focus input for immediate next search
        setTimeout(() => {
          if (inputRef.current) {
            try {
              inputRef.current.focus({ preventScroll: true });
            } catch (e) {
              inputRef.current.focus();
            }
          }
        }, 100);
      },
      [onPlaylistSelect, setShowResults, clearResults]
    );

    const handleInputFocus = useCallback(() => {
      if (playlistInput.trim() && inputType === 'search') {
        setShowResults(true);
      }
    }, [playlistInput, inputType, setShowResults]);

    const handleInputBlur = useCallback(() => {
      // Delay to allow click on results
      setTimeout(() => setShowResults(false), 100);
    }, [setShowResults]);

    return (
      <div
        className={`card ${styles.container} ${
          showSearchResults ? styles.containerWithResults : ''
        }`}
      >
        {loading && <LoadingOverlay />}

        <div className={styles.header}>
          <h2 className={styles.title}>Add Playlists to Mix</h2>
          <div className={styles.headerActions}>
            <div className={styles.playlistCounter}>
              {selectedPlaylists.length}/10 playlists
            </div>
            {selectedPlaylists.length > 0 && (
              <button
                onClick={onClearAll}
                className={styles.clearButton}
                title="Remove all playlists from mix"
              >
                <span className={styles.clearButtonIcon}>🗑️</span>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className={styles.inputSection}>
          <div className="input-group">
            <label>Search playlists or paste URL:</label>
            <div className={styles.inputGroup}>
              <input
                ref={inputRef}
                type="text"
                value={playlistInput}
                onChange={handleInputChange}
                placeholder="Try: 'salsa romantica', 'bachata sensual' or paste Spotify URL..."
                className={styles.input}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                className={`btn ${styles.submitButton}`}
                onClick={handleInputSubmit}
                disabled={
                  searching ||
                  !playlistInput.trim() ||
                  (inputType === 'url' && !isValidPlaylistUrl(playlistInput))
                }
              >
                {searching
                  ? 'Searching...'
                  : inputType === 'url'
                    ? 'Add'
                    : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults
                .filter(playlist => playlist && playlist.id) // Filter out null playlists
                .map((playlist, index) => {
                  const isAlreadySelected = selectedPlaylists.find(
                    p => p.id === playlist.id
                  );
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={playlist.id}
                      onClick={() => handleSearchResultClick(playlist)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSearchResultClick(playlist);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`
                        ${styles.searchResultItem}
                        ${isHighlighted ? styles.searchResultItemHighlighted : ''}
                        ${isAlreadySelected ? styles.searchResultItemSelected : ''}
                      `}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseLeave={() => setHighlightedIndex(-1)}
                    >
                      {playlist?.images?.[0]?.url && (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name || 'Playlist'}
                          className={styles.searchResultImage}
                        />
                      )}
                      <div className={styles.searchResultContent}>
                        <div className={styles.searchResultName}>
                          {playlist?.name || 'Untitled Playlist'}
                        </div>
                        <div className={styles.searchResultMeta}>
                          by {playlist?.owner?.display_name || 'Unknown'} •{' '}
                          {getPlaylistItemCount(playlist)} tracks
                        </div>
                      </div>
                      {isAlreadySelected && (
                        <div className={styles.searchResultCheckmark}>✓</div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {selectedPlaylists.length >= 10 && (
          <div className={styles.maxPlaylistsWarning}>
            Maximum of 10 playlists reached
          </div>
        )}
      </div>
    );
  }
);

PlaylistSelector.displayName = 'PlaylistSelector';

export default PlaylistSelector;
