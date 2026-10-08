import { CSSProperties, useState } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MixedTrack, SpotifyPlaylist, SpotifyTrack } from '../../../types';
import SortableWrapper from '../../SortableWrapper';
import TrackItem from '../../ui/TrackItem';
import SpotifySearchModal from '../../SpotifySearchModal';
import AddUnselectedModal from '../../AddUnselectedModal';
import {
  getTrackDragId,
  createMixedTrackInstance,
} from '../../../utils/trackUtils';
import PreviewHeader, { PlaylistStats } from './PreviewHeader';
import { channelColors } from './channelAppearance';
import styles from '../../PlaylistMixer.module.css';

interface MixPreviewProps {
  tracks: MixedTrack[];
  stats: PlaylistStats;
  totalDuration: number;
  loading: boolean;
  onTrackOrderChange: (reorderedTracks: MixedTrack[]) => void;
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  stale?: boolean;
  hasPreview?: boolean;
}

export default function MixPreview({
  tracks,
  stats,
  totalDuration,
  loading,
  onTrackOrderChange,
  accessToken,
  selectedPlaylists,
  stale = false,
  hasPreview = true,
}: MixPreviewProps) {
  const [dialog, setDialog] = useState<'search' | 'unselected' | null>(null);
  const addTracks = (newTracks: SpotifyTrack[]) =>
    onTrackOrderChange([
      ...tracks,
      ...newTracks.map(track =>
        createMixedTrackInstance(track, track.sourcePlaylist || 'search')
      ),
    ]);
  if (!tracks) return null;
  return (
    <section
      className={styles.preview}
      aria-label="Mix Preview"
      aria-busy={loading}
    >
      <div className={styles.bezel}>
        <div className={styles.screen}>
          <PreviewHeader
            songs={tracks.length}
            duration={totalDuration}
            stats={stats}
            selectedPlaylists={selectedPlaylists}
          />
          {loading && (
            <p className={styles['empty-prev']} role="status">
              <span className={styles.loadingSpinner} /> Generating Preview...
            </p>
          )}
          <div
            className={styles.tracks}
            role="list"
            aria-label="Tracks in order"
          >
            {!tracks.length && !loading && (
              <p className={styles['empty-prev']}>
                {hasPreview
                  ? 'No playable tracks in this preview. Add tracks here or press Preview again.'
                  : selectedPlaylists.length < 2
                    ? 'Add at least two playlists to preview a mix.'
                    : 'Press Preview to hear how your sources come together.'}
              </p>
            )}
            <SortableContext
              items={tracks.map(getTrackDragId)}
              strategy={verticalListSortingStrategy}
            >
              {tracks.map((track, index) => {
                const sourceIndex = selectedPlaylists.findIndex(
                  playlist => playlist.id === track.sourcePlaylist
                );
                const name =
                  stats[track.sourcePlaylist]?.name ||
                  track.sourcePlaylistName ||
                  'Added track';
                return (
                  <SortableWrapper
                    key={getTrackDragId(track)}
                    id={getTrackDragId(track)}
                    data={{ context: 'preview' }}
                    handleLabel={`Reorder ${track.name}`}
                  >
                    <TrackItem
                      track={{ ...track, sourcePlaylistName: name }}
                      showSourcePlaylist
                      showIndex
                      index={index + 1}
                      style={
                        {
                          '--c':
                            sourceIndex >= 0
                              ? channelColors[
                                  sourceIndex % channelColors.length
                                ]
                              : 'var(--oled-dim)',
                        } as CSSProperties
                      }
                      onRemove={() =>
                        onTrackOrderChange(
                          tracks.filter(
                            item =>
                              getTrackDragId(item) !== getTrackDragId(track)
                          )
                        )
                      }
                    />
                  </SortableWrapper>
                );
              })}
            </SortableContext>
          </div>
          <div className={styles['scr-f']}>
            {stale && hasPreview && (
              <span className={styles.stale} role="status">
                Settings changed. Press Preview to refresh.
              </span>
            )}
            <button
              className={styles.dk}
              type="button"
              disabled={!hasPreview || loading}
              onClick={() => setDialog('search')}
            >
              Search Spotify
            </button>
            <button
              className={styles.dk}
              type="button"
              disabled={!hasPreview || loading}
              onClick={() => setDialog('unselected')}
            >
              Add unselected
            </button>
          </div>
        </div>
      </div>
      {dialog === 'search' && (
        <SpotifySearchModal
          isOpen
          onClose={() => setDialog(null)}
          accessToken={accessToken}
          onAddTracks={addTracks}
        />
      )}
      {dialog === 'unselected' && (
        <AddUnselectedModal
          isOpen
          onClose={() => setDialog(null)}
          accessToken={accessToken}
          selectedPlaylists={selectedPlaylists}
          currentTracks={tracks}
          onAddTracks={addTracks}
        />
      )}
    </section>
  );
}
