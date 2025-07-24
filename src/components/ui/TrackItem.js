import React, { forwardRef } from 'react';
import {
  formatDuration,
  getTrackQuadrant,
  getPopularityStyle,
} from '../../utils/dragAndDrop';

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
        className={`track-item ${className}`}
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
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          backgroundColor: selected ? 'rgba(144, 169, 85, 0.2)' : 'transparent',
          borderRadius: '8px',
          cursor: draggable ? 'grab' : 'pointer',
          transition: 'background-color 0.2s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          ...style,
        }}
        {...otherProps}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            style={{
              marginRight: '8px',
              color: 'var(--mindaro)',
              opacity: '0.5',
              cursor: 'grab',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Drag handle"
          >
            ⋮⋮
          </div>
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid var(--moss-green)',
              borderRadius: '4px',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? 'var(--moss-green)' : 'transparent',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            {selected && (
              <span
                style={{
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                ✓
              </span>
            )}
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
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              objectFit: 'cover',
              marginRight: '12px',
              flexShrink: 0,
            }}
            onError={e => {
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Track Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Track Name */}
          <div
            style={{
              fontWeight: '500',
              fontSize: '14px',
              color: 'var(--mindaro)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.3',
              maxHeight: '2.8em',
              marginBottom: '2px',
            }}
          >
            {track.name}
          </div>

          {/* Artist and Additional Info */}
          <div
            style={{
              fontSize: '12px',
              opacity: '0.7',
              color: 'var(--mindaro)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{track.artists?.[0]?.name || 'Unknown Artist'}</span>

            {/* Source Playlist */}
            {showSourcePlaylist && track.sourcePlaylistName && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--moss-green)' }}>
                  {track.sourcePlaylistName}
                </span>
              </>
            )}

            {/* Popularity Indicator */}
            {popularityStyle && (
              <>
                <span>•</span>
                <span
                  style={{
                    fontSize: '10px',
                    background: popularityStyle.background,
                    color: popularityStyle.color,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '500',
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
          <div
            style={{
              fontSize: '11px',
              opacity: '0.6',
              color: 'var(--mindaro)',
              marginLeft: '12px',
              flexShrink: 0,
            }}
          >
            {formatDuration(track.duration_ms)}
          </div>
        )}

        {/* Custom Actions */}
        {actions && (
          <div
            style={{
              marginLeft: '12px',
              display: 'flex',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            {actions}
          </div>
        )}

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={handleRemoveClick}
            aria-label={`Remove ${track.name}`}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mindaro)',
              opacity: '0.5',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              marginLeft: '8px',
              fontSize: '16px',
              transition: 'opacity 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.target.style.opacity = '1')}
            onMouseLeave={e => (e.target.style.opacity = '0.5')}
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
