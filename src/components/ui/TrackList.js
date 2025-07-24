import React, { useMemo, useRef, useEffect, useState } from 'react';
import TrackItem from './TrackItem';

const TrackList = ({
  tracks = [],
  onTrackSelect,
  onTrackRemove,
  virtualized = false,
  draggable = false,
  selectable = false,
  selectedTracks = new Set(),
  renderTrackActions,
  className = '',
  style = {},
  itemHeight = 64, // Default height for virtualization
  containerHeight = 400, // Default container height for virtualization
  overscan = 5, // Number of items to render outside visible area
  showCheckbox = false,
  showDragHandle = false,
  showPopularity = true,
  showDuration = true,
  showAlbumArt = true,
  showSourcePlaylist = false,
  emptyMessage = 'No tracks available',
  // Event handlers that get passed to individual track items
  onTrackClick,
  onTrackMouseEnter,
  onTrackMouseLeave,
  onTrackMouseDown,
  onTrackMouseUp,
  onTrackDragStart,
  onTrackDragEnd,
  onTrackTouchStart,
  onTrackTouchMove,
  onTrackTouchEnd,
  ...otherProps
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Virtualization calculations
  const { visibleItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    if (!virtualized || tracks.length === 0) {
      return {
        visibleItems: tracks,
        totalHeight: tracks.length * itemHeight,
        startIndex: 0,
        endIndex: tracks.length - 1,
      };
    }

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      tracks.length - 1,
      startIdx + visibleCount + overscan * 2
    );

    return {
      visibleItems: tracks.slice(startIdx, endIdx + 1),
      totalHeight: tracks.length * itemHeight,
      startIndex: startIdx,
      endIndex: endIdx,
    };
  }, [tracks, virtualized, itemHeight, containerHeight, scrollTop, overscan]);

  // Handle scroll for virtualization
  const handleScroll = e => {
    if (virtualized) {
      setScrollTop(e.target.scrollTop);
    }
  };

  // Reset scroll position when tracks change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [tracks]);

  // Handle track selection
  const handleTrackSelect = track => {
    if (onTrackSelect) {
      onTrackSelect(track);
    }
  };

  // Handle track removal
  const handleTrackRemove = track => {
    if (onTrackRemove) {
      onTrackRemove(track);
    }
  };

  // Render individual track item
  const renderTrackItem = (track, index) => {
    const actualIndex = virtualized ? startIndex + index : index;
    const isSelected = selectedTracks.has(track.id);

    // Custom actions from render prop
    const customActions = renderTrackActions
      ? renderTrackActions(track, actualIndex)
      : null;

    return (
      <div
        key={track.id}
        style={
          virtualized
            ? {
                position: 'absolute',
                top: (startIndex + index) * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }
            : undefined
        }
      >
        <TrackItem
          track={track}
          onSelect={selectable ? handleTrackSelect : undefined}
          onRemove={onTrackRemove ? handleTrackRemove : undefined}
          draggable={draggable}
          selected={isSelected}
          actions={customActions}
          showCheckbox={showCheckbox}
          showDragHandle={showDragHandle}
          showPopularity={showPopularity}
          showDuration={showDuration}
          showAlbumArt={showAlbumArt}
          showSourcePlaylist={showSourcePlaylist}
          onClick={
            onTrackClick ? e => onTrackClick(e, track, actualIndex) : undefined
          }
          onMouseEnter={
            onTrackMouseEnter
              ? e => onTrackMouseEnter(e, track, actualIndex)
              : undefined
          }
          onMouseLeave={
            onTrackMouseLeave
              ? e => onTrackMouseLeave(e, track, actualIndex)
              : undefined
          }
          onMouseDown={
            onTrackMouseDown
              ? e => onTrackMouseDown(e, track, actualIndex)
              : undefined
          }
          onMouseUp={
            onTrackMouseUp
              ? e => onTrackMouseUp(e, track, actualIndex)
              : undefined
          }
          onDragStart={
            onTrackDragStart
              ? e => onTrackDragStart(e, track, actualIndex)
              : undefined
          }
          onDragEnd={
            onTrackDragEnd
              ? e => onTrackDragEnd(e, track, actualIndex)
              : undefined
          }
          onTouchStart={
            onTrackTouchStart
              ? e => onTrackTouchStart(e, track, actualIndex)
              : undefined
          }
          onTouchMove={
            onTrackTouchMove
              ? e => onTrackTouchMove(e, track, actualIndex)
              : undefined
          }
          onTouchEnd={
            onTrackTouchEnd
              ? e => onTrackTouchEnd(e, track, actualIndex)
              : undefined
          }
          style={virtualized ? { height: itemHeight } : undefined}
        />
      </div>
    );
  };

  // Empty state
  if (tracks.length === 0) {
    return (
      <div
        className={`track-list-empty ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: containerHeight,
          color: 'var(--mindaro)',
          opacity: '0.7',
          textAlign: 'center',
          ...style,
        }}
        {...otherProps}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`track-list ${className}`}
      onScroll={handleScroll}
      style={{
        height: virtualized ? containerHeight : 'auto',
        overflowY: virtualized ? 'auto' : 'visible',
        position: 'relative',
        ...style,
      }}
      {...otherProps}
    >
      {virtualized && (
        // Spacer for virtualization
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((track, index) => renderTrackItem(track, index))}
        </div>
      )}

      {!virtualized && (
        <div>{tracks.map((track, index) => renderTrackItem(track, index))}</div>
      )}
    </div>
  );
};

export default TrackList;
