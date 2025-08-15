import React, { useState } from 'react';
import { MixedTrack } from '../../../types';
import { TrackListContainer } from '../../TrackList';
import SpotifySearchModal from '../../SpotifySearchModal';
import AddUnselectedModal from '../../AddUnselectedModal';
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
  const formatTotalDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

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
        <div className={styles.playlistBreakdown}>
          {Object.entries(stats).map(([playlistId, stat]) => (
            <div key={playlistId} className={styles.playlistStat}>
              <div className={styles.playlistStatName}>{stat.name}</div>
              <div className={styles.playlistStatDetails}>
                <span>{stat.count} tracks</span>
                <span>{formatTotalDuration(stat.totalDuration)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Track list */}
        <div className={styles.trackListContainer}>
          <TrackListContainer
            tracks={tracks}
            onReorder={(activeId: string, overId: string) => {
              const oldIndex = tracks.findIndex(track => track.id === activeId);
              const newIndex = tracks.findIndex(track => track.id === overId);

              if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newTracks = [...tracks];
                const [movedTrack] = newTracks.splice(oldIndex, 1);
                newTracks.splice(newIndex, 0, movedTrack);
                onTrackOrderChange(newTracks);
              }
            }}
          />
        </div>
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
