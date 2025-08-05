import React from 'react';
import { MixedTrack, SpotifyPlaylist } from '../types';
import useDraggable from '../hooks/useDraggable';
import { getPopularityIcon } from '../utils/dragAndDrop';
import styles from './DraggableTrackList.module.css';

interface TrackListItemProps {
  track: MixedTrack;
  index: number;
  selectedPlaylists: SpotifyPlaylist[];
  formatDuration: (durationMs: number) => string;
  onRemove: (index: number) => void;
  dropPosition: {
    index: number;
    isTopHalf: boolean;
    isFirst: boolean;
    isLast: boolean;
    y: number;
  } | null;
  getTrackQuadrant: (
    track: MixedTrack
  ) => 'topHits' | 'popular' | 'moderate' | 'deepCuts' | null;
  scrollContainer: HTMLElement | null;
}

const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  index,
  selectedPlaylists,
  formatDuration,
  onRemove,
  dropPosition,
  getTrackQuadrant,
  scrollContainer,
}) => {
  const sourcePlaylist = selectedPlaylists.find(
    p => p.id === track.sourcePlaylist
  );
  const quadrant = getTrackQuadrant(track);

  // Validate track data before initializing drag handlers
  const isValidTrackData = track && track.id && typeof index === 'number';

  // Use the new useDraggable hook with proper configuration
  const trackDragHandlers = useDraggable({
    type: 'internal-track',
    data: isValidTrackData ? { ...track, index } : undefined, // Only pass data if valid
    disabled: !isValidTrackData, // Disable if track data is invalid
    scrollContainer,
    onDragStart: item => {
      console.log('[TrackListItem] Drag started:', item);
    },
    onDragEnd: (item, success) => {
      console.log('[TrackListItem] Drag ended:', item, success);
    },
  });

  // Enhanced drop line logic with better positioning
  const showDropLineAbove =
    dropPosition && dropPosition.index === index && !dropPosition.isLast;
  const showDropLineBelow =
    dropPosition && dropPosition.index === index + 1 && !dropPosition.isFirst;

  // Special handling for first and last positions
  const isDropTarget =
    dropPosition &&
    ((dropPosition.index === index && dropPosition.isTopHalf) ||
      (dropPosition.index === index + 1 && !dropPosition.isTopHalf));

  return (
    <div
      key={track.id}
      data-track-index={index}
      className={`${styles.trackItem} ${
        showDropLineAbove ? styles.trackItemDropAbove : ''
      } ${isDropTarget ? styles.trackItemDropTarget : ''}`}
      {...trackDragHandlers.dragHandleProps}
    >
      <div className={styles.trackContent}>
        <div className={styles.dragHandle}>⋮⋮</div>
        <div className={styles.trackInfo}>
          {track.album?.images?.[0]?.url && (
            <img
              src={
                track.album.images[2]?.url ||
                track.album.images[1]?.url ||
                track.album.images[0]?.url
              }
              alt={`${track.album.name} album cover`}
              className={styles.albumCover}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className={styles.trackDetails}>
            <div className={styles.trackName}>
              {index + 1}. {track.name}
            </div>
            <div className={styles.trackMeta}>
              <span>{track.artists?.[0]?.name || 'Unknown Artist'}</span>
              <span>•</span>
              <span
                className={
                  track.sourcePlaylist === 'search'
                    ? styles.sourcePlaylistSearch
                    : styles.sourcePlaylistNormal
                }
              >
                {track.sourcePlaylist === 'search' ? (
                  <>
                    <span className={styles.buttonText}>🔍 Spotify Search</span>
                    <span className={styles.mobileText}>🔍</span>
                  </>
                ) : (
                  sourcePlaylist?.name || 'Unknown'
                )}
              </span>
              {quadrant && (
                <>
                  <span>•</span>
                  <span
                    className={`${styles.popularityBadge} ${
                      quadrant === 'topHits'
                        ? styles.popularityBadgeTopHits
                        : quadrant === 'popular'
                          ? styles.popularityBadgePopular
                          : quadrant === 'moderate'
                            ? styles.popularityBadgeModerate
                            : styles.popularityBadgeDeepCuts
                    }`}
                    title={
                      quadrant === 'topHits'
                        ? `Top Hits (${track.popularity})`
                        : quadrant === 'popular'
                          ? `Popular (${track.popularity})`
                          : quadrant === 'moderate'
                            ? `Moderate (${track.popularity})`
                            : `Deep Cuts (${track.popularity})`
                    }
                  >
                    <span className={styles.buttonText}>
                      {quadrant === 'topHits'
                        ? `🔥 Top Hits (${track.popularity})`
                        : quadrant === 'popular'
                          ? `⭐ Popular (${track.popularity})`
                          : quadrant === 'moderate'
                            ? `📻 Moderate (${track.popularity})`
                            : `💎 Deep Cuts (${track.popularity})`}
                    </span>
                    <span className={styles.mobileText}>
                      {getPopularityIcon(quadrant)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.trackActions}>
        <div className={styles.duration}>
          {formatDuration(track.duration_ms || 0)}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove(index);
          }}
          className={styles.removeButton}
          title="Remove track from playlist"
        >
          ×
        </button>
      </div>

      {/* Drop line below */}
      {showDropLineBelow && <div className={styles.dropLineBelow} />}
    </div>
  );
};

export default TrackListItem;
