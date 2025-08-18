import React, { useState, useEffect, useRef } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MixedTrack } from '../../../types';
import SortableWrapper from '../../SortableWrapper';
import TrackItem from '../../ui/TrackItem';
import SpotifySearchModal from '../../SpotifySearchModal';
import AddUnselectedModal from '../../AddUnselectedModal';
import { getTrackDragId } from '../../../utils/trackUtils';
import styles from '../../PlaylistMixer.module.css';

interface PlaylistStats {
  [playlistId: string]: {
    name: string;
    count: number;
    totalDuration: number;
  };
}

interface MixPreviewProps {
  tracks: MixedTrack[];
  stats: PlaylistStats;
  totalDuration: number;
  loading: boolean;
  onTrackOrderChange: (reorderedTracks: MixedTrack[]) => void;
  accessToken: string;
  selectedPlaylists: any[];
}

const DroppableTrackList: React.FC<{ tracks: MixedTrack[] }> = ({ tracks }) => {
  return (
    <div className={styles.trackListContainer}>
      {tracks.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(139, 195, 74, 0.7)',
            fontSize: '16px',
            padding: '40px',
            border: '2px dashed rgba(139, 195, 74, 0.3)',
            borderRadius: '8px',
            backgroundColor: 'rgba(139, 195, 74, 0.05)',
          }}
        >
          Drag tracks from modals to add them here
        </div>
      )}
      <SortableContext
        items={tracks.map(t => getTrackDragId(t))}
        strategy={verticalListSortingStrategy}
      >
        {tracks.map(track => {
          const dragId = getTrackDragId(track);
          return (
            <SortableWrapper
              key={dragId}
              id={dragId}
              data={{ context: 'preview' }}
            >
              <TrackItem track={track} />
            </SortableWrapper>
          );
        })}
      </SortableContext>
    </div>
  );
};

const MixPreview: React.FC<MixPreviewProps> = ({
  tracks,
  stats,
  totalDuration,
  loading,
  onTrackOrderChange,
  accessToken,
  selectedPlaylists,
}) => {
  const [isSpotifySearchOpen, setIsSpotifySearchOpen] = useState(false);
  const [isAddUnselectedOpen, setIsAddUnselectedOpen] = useState(false);
  const trackCountRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [useShortLabel, setUseShortLabel] = useState<Record<string, boolean>>(
    {}
  );
  const playlistStatRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [useStackedDetails, setUseStackedDetails] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const observers: ResizeObserver[] = [];

    const updateForId = (id: string) => {
      const el = trackCountRefs.current[id];
      const stat = (stats as any)[id];
      if (!el || !stat) return;

      // measure required width for the full label using canvas (reliable across overflow behaviors)
      const text = `${stat.count} tracks`;
      const cs = window.getComputedStyle(el);
      const font =
        `${cs.fontStyle || ''} ${cs.fontWeight || ''} ${cs.fontSize} ${cs.fontFamily}`.trim();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let textWidth = 0;
      if (ctx) {
        ctx.font = font;
        textWidth = Math.ceil(ctx.measureText(text).width);
      } else {
        // fallback to scrollWidth check
        textWidth = el.scrollWidth;
      }

      const available = el.clientWidth - 4; // small padding tolerance
      const needsShort = textWidth > available;

      setUseShortLabel(prev => {
        if (prev[id] === needsShort) return prev;
        return { ...prev, [id]: needsShort };
      });
    };

    Object.keys(stats).forEach(id => {
      const el = trackCountRefs.current[id];
      if (el) {
        // observe the parent/container so changes to layout (name wrap, available width) trigger measurement
        const container = el.parentElement ?? el;
        const ro = new ResizeObserver(() => updateForId(id));
        try {
          ro.observe(container);
        } catch (e) {
          // fallback to observing the element itself
          try {
            ro.observe(el);
          } catch (_) {
            /* ignore */
          }
        }
        observers.push(ro);
        // initial check on next paint to ensure layout settled
        requestAnimationFrame(() => updateForId(id));
      }
    });

    const onWindow = () => Object.keys(stats).forEach(updateForId);
    window.addEventListener('resize', onWindow);

    return () => {
      observers.forEach(o => o.disconnect());
      window.removeEventListener('resize', onWindow);
    };
  }, [stats]);

  // measure per-playlist whether track count + duration fit side-by-side; if not, stack them
  useEffect(() => {
    const observers: ResizeObserver[] = [];

    const updateStackForId = (id: string) => {
      const statEl = playlistStatRefs.current[id];
      const trackEl = trackCountRefs.current[id];
      const statData = (stats as any)[id];
      if (!statEl || !trackEl || !statData) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cs = window.getComputedStyle(trackEl);
      const font =
        `${cs.fontStyle || ''} ${cs.fontWeight || ''} ${cs.fontSize} ${cs.fontFamily}`.trim();
      ctx.font = font;
      const trackText = useShortLabel[id]
        ? `${statData.count} tr`
        : `${statData.count} tracks`;
      const durText = formatTotalDuration(statData.totalDuration);
      const trackW = Math.ceil(ctx.measureText(trackText).width);
      const durW = Math.ceil(ctx.measureText(durText).width);

      const gap = 8; // approximate gap in CSS
      const available = statEl.clientWidth - 8; // small padding
      const needsStack = trackW + durW + gap > available;

      setUseStackedDetails(prev => {
        if (prev[id] === needsStack) return prev;
        return { ...prev, [id]: needsStack };
      });
    };

    Object.keys(stats).forEach(id => {
      const el = playlistStatRefs.current[id];
      if (el) {
        const ro = new ResizeObserver(() => updateStackForId(id));
        ro.observe(el);
        observers.push(ro);
        requestAnimationFrame(() => updateStackForId(id));
      }
    });

    const onWindow = () => Object.keys(stats).forEach(updateStackForId);
    window.addEventListener('resize', onWindow);

    return () => {
      observers.forEach(o => o.disconnect());
      window.removeEventListener('resize', onWindow);
    };
  }, [stats, useShortLabel]);
  const formatTotalDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // compute adaptive grid columns based on playlist count
  const playlistIds = Object.keys(stats || {});
  const playlistCount = playlistIds.length;
  let gridCols = playlistCount > 0 ? playlistCount : 1;
  if (playlistCount > 5) {
    const top = Math.min(5, Math.ceil(playlistCount / 2));
    const bottom = playlistCount - top;
    gridCols = Math.max(top, bottom);
  }

  const handleAddTracks = (newTracks: any[]) => {
    // Add the new tracks to the existing mix
    const updatedTracks = [...tracks, ...newTracks];
    onTrackOrderChange(updatedTracks);
  };

  if (loading) {
    return (
      <div className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>
            <span className={styles.loadingSpinner}></span>
            Generating Preview...
          </h3>
        </div>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <div className={styles.previewSection}>
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>🎵 Mix Preview</h3>
        <div className={styles.previewStats}>
          <div className={styles.previewStat}>
            <span>📊</span>
            <span>{tracks.length} tracks</span>
          </div>
          <div className={styles.previewStat}>
            <span>⏱️</span>
            <span>{formatTotalDuration(totalDuration)}</span>
          </div>
        </div>
        <div className={styles.previewActions}>
          <button
            onClick={() => setIsSpotifySearchOpen(true)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            title="Search Spotify for more tracks"
          >
            🔍 Search Spotify
          </button>
          <button
            onClick={() => setIsAddUnselectedOpen(true)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            title="Add unselected tracks from your playlists"
          >
            ➕ Add Unselected
          </button>
        </div>
      </div>

      <div className={styles.previewContent}>
        {/* Playlist breakdown */}
        <div
          className={styles.playlistBreakdown}
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {Object.entries(stats).map(([playlistId, stat]) => (
            <div
              key={playlistId}
              className={
                styles.playlistStat +
                (useStackedDetails[playlistId]
                  ? ` ${styles.stackedDetails}`
                  : '')
              }
              ref={el => (playlistStatRefs.current[playlistId] = el)}
            >
              {/* show truncated name with full title on hover */}
              <div className={styles.playlistStatName} title={stat.name}>
                {stat.name}
              </div>
              <div className={styles.playlistStatDetails}>
                <span
                  className={styles.trackCount}
                  ref={el => (trackCountRefs.current[playlistId] = el)}
                >
                  {useShortLabel[playlistId]
                    ? `${stat.count} tr`
                    : `${stat.count} tracks`}
                </span>
                <span className={styles.playlistDuration}>
                  {formatTotalDuration(stat.totalDuration)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Track list - droppable and sortable */}
        <DroppableTrackList tracks={tracks} />
      </div>

      {/* Modals */}
      <SpotifySearchModal
        isOpen={isSpotifySearchOpen}
        onClose={() => setIsSpotifySearchOpen(false)}
        accessToken={accessToken}
        onAddTracks={handleAddTracks}
      />

      <AddUnselectedModal
        isOpen={isAddUnselectedOpen}
        onClose={() => setIsAddUnselectedOpen(false)}
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        currentTracks={tracks}
        onAddTracks={handleAddTracks}
      />
    </div>
  );
};

export default MixPreview;
