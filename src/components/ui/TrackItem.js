import React, { forwardRef } from 'react';
import {
  formatDuration,
  getTrackQuadrant,
  getPopularityStyle,
} from '../../utils/dragAndDrop';
import styles from './TrackItem.module.css';

const TrackItem = forwardRef(
  (
    {
      track,
      onSelect,
      onRemove,
      draggable = false,
      selected = false,
      actions,
      className = '',
      showCheckbox = false,
      showDragHandle = false,
      showPopularity = true,
      showDuration = true,
      showAlbumArt = true,
      showSourcePlaylist = false,
      style = {},
      onClick,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      // Drag event handlers
      onDragStart,
      onDragEnd,
      // Touch event handlers
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      ...otherProps
    },
    ref
  ) => {
    const quadrant = getTrackQuadrant(track);
    const popularityStyle =
      showPopularity && track.popularity !== undefined
        ? getPopularityStyle(quadrant, track.popularity)
        : null;

    // Generate CSS classes
    const trackItemClasses = [
      styles.trackItem,
      selected && styles.selected,
      draggable && styles.draggable,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = e => {
      if (onClick) {
        onClick(e, track);
      } else if (onSelect) {
        onSelect(track);
      }
    };

    const handleRemoveClick = e => {
      e.stopPropagation();
      if (onRemove) {
        onRemove(track);
      }
    };

    return (
      <div
        ref={ref}
        className={trackItemClasses}
        draggable={draggable}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={style}
        data-testid="track-item"
        role="listitem"
        {...otherProps}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div className={styles.dragHandle} aria-label="Drag handle">
            ⋮⋮
          </div>
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <div
            className={`${styles.checkbox} ${selected ? styles.selected : ''}`}
          >
            {selected && <span className={styles.checkmark}>✓</span>}
          </div>
        )}

        {/* Album Art */}
        {showAlbumArt && track.album?.images?.[0]?.url && (
          <img
            src={
              track.album.images[2]?.url ||
              track.album.images[1]?.url ||
              track.album.images[0]?.url
            }
            alt={`${track.album.name} album cover`}
            className={styles.albumArt}
            onError={e => {
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Track Info */}
        <div className={styles.trackInfo}>
          {/* Track Name */}
          <div className={styles.trackName}>{track.name}</div>

          {/* Artist and Additional Info */}
          <div className={styles.artistInfo}>
            <span>{track.artists?.[0]?.name || 'Unknown Artist'}</span>

            {/* Source Playlist */}
            {showSourcePlaylist && track.sourcePlaylistName && (
              <>
                <span>•</span>
                <span className={styles.sourcePlaylist}>
                  {track.sourcePlaylistName}
                </span>
              </>
            )}

            {/* Popularity Indicator */}
            {popularityStyle && (
              <>
                <span>•</span>
                <span
                  className={styles.popularityBadge}
                  style={{
                    background: popularityStyle.background,
                    color: popularityStyle.color,
                  }}
                >
                  {popularityStyle.text}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Duration */}
        {showDuration && track.duration_ms && (
          <div className={styles.duration}>
            {formatDuration(track.duration_ms)}
          </div>
        )}

        {/* Custom Actions */}
        {actions && <div className={styles.actions}>{actions}</div>}

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={handleRemoveClick}
            aria-label={`Remove ${track.name}`}
            className={styles.removeButton}
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

TrackItem.displayName = 'TrackItem';

export default TrackItem;
