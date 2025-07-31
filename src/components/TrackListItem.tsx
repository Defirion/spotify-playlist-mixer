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
  dropPosition: { index: number; isTopHalf: boolean } | null;
  getTrackQuadrant: (
    track: MixedTrack
  ) => 'topHits' | 'popular' | 'moderate' | 'deepCuts' | null;
  dragOptions: {
    type: string;
    onDragStart: (item: any) => void;
    onDragEnd: (item: any, result: any) => void;
    onDrop: (item: any, result: any) => void;
    onDragOver: (item: any, position: any) => void;
    scrollContainer: HTMLElement | null;
  };
}

const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  index,
  selectedPlaylists,
  formatDuration,
  onRemove,
  dropPosition,
  getTrackQuadrant,
  dragOptions,
}) => {
  const sourcePlaylist = selectedPlaylists.find(
    p => p.id === track.sourcePlaylist
  );
  const quadrant = getTrackQuadrant(track);

  const trackDragHandlers = useDraggable({
    ...dragOptions,
    data: track,
  });

  const showDropLineAbove = dropPosition && dropPosition.index === index;
  const showDropLineBelow = dropPosition && dropPosition.index === index + 1;

  return (
    <div
      key={track.id}
      data-track-index={index}
      className={`${styles.trackItem} ${
        showDropLineAbove ? styles.trackItemDropAbove : ''
      }`}
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
