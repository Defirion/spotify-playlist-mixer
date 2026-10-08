import React, { forwardRef, memo } from 'react';
import { formatDuration } from '../../utils/trackUtils';
import { TrackItemProps } from '../../types';
import styles from './TrackItem.module.css';

const TrackItem = memo(
  forwardRef<HTMLDivElement, TrackItemProps>(
    (
      {
        track,
        onSelect,
        onRemove,
        selected = false,
        actions,
        className = '',
        showCheckbox = false,
        showDuration = true,
        showAlbumArt = true,
        showSourcePlaylist = false,
        showIndex = false,
        index,
        style = {},
        onClick,
        ...otherProps
      },
      ref
    ) => {
      const columns = [
        showCheckbox && '20px',
        showIndex && '30px',
        showAlbumArt && '40px',
        'minmax(0,1fr)',
        showSourcePlaylist && track.sourcePlaylistName && '150px',
        showDuration && track.duration_ms && '54px',
        actions && 'auto',
        onRemove && '34px',
      ]
        .filter(Boolean)
        .join(' ');
      const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (onClick) onClick(event, track);
        else onSelect?.(track);
      };
      const artwork =
        track.album?.images?.[2]?.url ||
        track.album?.images?.[1]?.url ||
        track.album?.images?.[0]?.url;
      return (
        <div
          ref={ref}
          className={`${styles.trackItem} ${selected ? styles.selected : ''} ${showIndex ? styles.withIndex : ''} ${showSourcePlaylist ? styles.withSource : ''} ${className}`}
          onClick={handleClick}
          onKeyDown={event => {
            if (
              event.target === event.currentTarget &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault();
              handleClick(event as any);
            }
          }}
          style={{ ...style, gridTemplateColumns: columns }}
          data-testid={`track-item-${track.id}`}
          role="listitem"
          tabIndex={0}
          {...otherProps}
        >
          {showCheckbox && (
            <div
              className={`${styles.checkbox} ${selected ? styles.selected : ''}`}
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select ${track.name}`}
              tabIndex={0}
              onClick={event => {
                event.stopPropagation();
                onSelect?.(track);
              }}
              onKeyDown={event => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect?.(track);
                }
              }}
            >
              {selected && <span className={styles.checkmark}>✓</span>}
            </div>
          )}
          {showIndex && (
            <span className={styles.index} aria-hidden="true">
              {String(index).padStart(2, '0')}
            </span>
          )}
          {showAlbumArt &&
            (artwork ? (
              <img
                src={artwork}
                alt={`${track.album.name} album cover`}
                className={styles.albumArt}
                onError={event => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
            ) : (
              <span
                className={`${styles.albumArt} ${styles.artFallback}`}
                aria-hidden="true"
              >
                {track.name?.[0] || '♪'}
              </span>
            ))}
          <div className={styles.trackInfo}>
            <div className={styles.trackName}>{track.name}</div>
            <div className={styles.artistInfo}>
              <span className={styles.artistName}>
                {track.artists?.[0]?.name || 'Unknown Artist'}
              </span>
              {showSourcePlaylist && track.sourcePlaylistName && (
                <span className={styles.mobileSource}>
                  {track.sourcePlaylistName}
                </span>
              )}
            </div>
          </div>
          {showSourcePlaylist && track.sourcePlaylistName && (
            <div
              className={styles.sourcePlaylist}
              title={track.sourcePlaylistName}
            >
              <i aria-hidden="true" />
              {track.sourcePlaylistName}
            </div>
          )}
          {showDuration && !!track.duration_ms && (
            <div className={styles.duration}>
              {formatDuration(track.duration_ms)}
            </div>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
          {onRemove && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onRemove(track);
              }}
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
