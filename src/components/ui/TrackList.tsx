import React, { useMemo, memo, useCallback } from 'react';
import TrackItem from './TrackItem';
import useVirtualization from '../../hooks/useVirtualization';
import { TrackListProps, SpotifyTrack } from '../../types';
import styles from './TrackList.module.css';

const TrackList = memo<TrackListProps>(
  ({
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
    // Use virtualization hook when enabled
    const virtualizationData = useVirtualization({
      items: tracks,
      itemHeight,
      containerHeight,
      overscan,
    });

    // Determine which data to use based on virtualization setting
    const {
      visibleItems,
      startIndex,
      containerProps,
      spacerProps,
      getItemProps,
    } = virtualized
      ? virtualizationData
      : {
          visibleItems: tracks,
          startIndex: 0,
          containerProps: {},
          spacerProps: {},
          getItemProps: () => ({}),
        };

    // Stabilize event handlers with useCallback
    const handleTrackSelect = useCallback(
      (track: SpotifyTrack) => {
        if (onTrackSelect) {
          onTrackSelect(track);
        }
      },
      [onTrackSelect]
    );

    const handleTrackRemove = useCallback(
      (track: SpotifyTrack) => {
        if (onTrackRemove) {
          onTrackRemove(track);
        }
      },
      [onTrackRemove]
    );

    // Memoize track item rendering function
    const renderTrackItem = useCallback(
      (track: SpotifyTrack, index: number) => {
        const actualIndex = virtualized ? startIndex + index : index;
        const isSelected = selectedTracks.has(track.id);

        // Custom actions from render prop
        const customActions = renderTrackActions
          ? renderTrackActions(track, actualIndex)
          : null;

        // Get item positioning props for virtualization
        const itemProps = virtualized ? getItemProps(index) : {};

        return (
          <div key={track.id} {...itemProps}>
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
                onTrackClick
                  ? (e: React.MouseEvent<HTMLDivElement>) =>
                      onTrackClick(e, track, actualIndex)
                  : undefined
              }
              onMouseEnter={
                onTrackMouseEnter
                  ? (e: React.MouseEvent<HTMLDivElement>) =>
                      onTrackMouseEnter(e, track, actualIndex)
                  : undefined
              }
              onMouseLeave={
                onTrackMouseLeave
                  ? (e: React.MouseEvent<HTMLDivElement>) =>
                      onTrackMouseLeave(e, track, actualIndex)
                  : undefined
              }
              onMouseDown={
                onTrackMouseDown
                  ? (e: React.MouseEvent<HTMLDivElement>) =>
                      onTrackMouseDown(e, track, actualIndex)
                  : undefined
              }
              onMouseUp={
                onTrackMouseUp
                  ? (e: React.MouseEvent<HTMLDivElement>) =>
                      onTrackMouseUp(e, track, actualIndex)
                  : undefined
              }
              onDragStart={
                onTrackDragStart
                  ? (e: React.DragEvent<HTMLDivElement>) =>
                      onTrackDragStart(e, track, actualIndex)
                  : undefined
              }
              onDragEnd={
                onTrackDragEnd
                  ? (e: React.DragEvent<HTMLDivElement>) =>
                      onTrackDragEnd(e, track, actualIndex)
                  : undefined
              }
              onTouchStart={
                onTrackTouchStart
                  ? (e: React.TouchEvent<HTMLDivElement>) =>
                      onTrackTouchStart(e, track, actualIndex)
                  : undefined
              }
              onTouchMove={
                onTrackTouchMove
                  ? (e: React.TouchEvent<HTMLDivElement>) =>
                      onTrackTouchMove(e, track, actualIndex)
                  : undefined
              }
              onTouchEnd={
                onTrackTouchEnd
                  ? (e: React.TouchEvent<HTMLDivElement>) =>
                      onTrackTouchEnd(e, track, actualIndex)
                  : undefined
              }
              className={virtualized ? styles.virtualizedItem : undefined}
              style={
                virtualized
                  ? ({
                      '--item-height': `${itemHeight}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            />
          </div>
        );
      },
      [
        virtualized,
        startIndex,
        selectedTracks,
        renderTrackActions,
        getItemProps,
        selectable,
        handleTrackSelect,
        onTrackRemove,
        handleTrackRemove,
        draggable,
        showCheckbox,
        showDragHandle,
        showPopularity,
        showDuration,
        showAlbumArt,
        showSourcePlaylist,
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
        itemHeight,
      ]
    );

    // Memoize CSS classes generation
    const trackListClasses = useMemo(
      () =>
        [styles.trackList, virtualized && styles.virtualized, className]
          .filter(Boolean)
          .join(' '),
      [virtualized, className]
    );

    // Empty state
    if (tracks.length === 0) {
      return (
        <div
          className={`${styles.empty} ${className}`}
          style={
            {
              '--container-height': `${containerHeight}px`,
              ...style,
            } as React.CSSProperties
          }
          {...otherProps}
        >
          {emptyMessage}
        </div>
      );
    }

    return (
      <div
        className={trackListClasses}
        data-testid="track-list"
        {...(virtualized ? containerProps : {})}
        {...otherProps}
        style={
          {
            '--container-height': virtualized ? `${containerHeight}px` : 'auto',
            ...style,
            ...(virtualized ? containerProps.style : {}),
          } as React.CSSProperties
        }
      >
        {virtualized && (
          // Spacer for virtualization
          <div className={styles.spacer} {...spacerProps}>
            {visibleItems.map((track, index) => renderTrackItem(track, index))}
          </div>
        )}

        {!virtualized && (
          <div className={styles.listContainer}>
            {tracks.map((track, index) => renderTrackItem(track, index))}
          </div>
        )}
      </div>
    );
  }
);

TrackList.displayName = 'TrackList';

export default TrackList;
