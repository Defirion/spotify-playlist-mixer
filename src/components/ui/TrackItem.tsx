import React, { forwardRef, memo, useMemo, useCallback } from 'react';
import {
  formatDuration,
  getTrackQuadrant,
  getPopularityStyle,
} from '../../utils/dragAndDrop';
import useDraggable from '../../hooks/useDraggable';
import { TrackItemProps } from '../../types';
import styles from './TrackItem.module.css';

const TrackItem = memo(
  forwardRef<HTMLDivElement, TrackItemProps>(
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
      // Memoize expensive calculations
      const quadrant = useMemo(() => getTrackQuadrant(track), [track]);

      const popularityStyle = useMemo(
        () =>
          showPopularity && track.popularity !== undefined
            ? getPopularityStyle(quadrant, track.popularity)
            : null,
        [showPopularity, track.popularity, quadrant]
      );

      // Memoize CSS classes generation
      const trackItemClasses = useMemo(
        () =>
          [
            styles.trackItem,
            selected && styles.selected,
            draggable && styles.draggable,
            className,
          ]
            .filter(Boolean)
            .join(' '),
        [selected, draggable, className]
      );

      // Stabilize event handlers with useCallback
      const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
          if (onClick) {
            onClick(e, track);
          } else if (onSelect) {
            onSelect(track);
          }
        },
        [onClick, onSelect, track]
      );

      const handleRemoveClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          if (onRemove) {
            onRemove(track);
          }
        },
        [onRemove, track]
      );

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
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as any);
            }
          }}
          style={style}
          data-testid="track-item"
          role="listitem"
          tabIndex={0}
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
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).style.display = 'none';
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
                    style={
                      {
                        '--badge-bg': popularityStyle.background,
                        '--badge-color': popularityStyle.color,
                      } as React.CSSProperties
                    }
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
  )
);

TrackItem.displayName = 'TrackItem';

export default TrackItem;
