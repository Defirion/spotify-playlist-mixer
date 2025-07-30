import React from 'react';
import DraggableTrackList from '../../DraggableTrackList';
import { MixedTrack } from '../../../types';
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
  const formatTotalDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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
          <DraggableTrackList
            tracks={tracks}
            selectedPlaylists={selectedPlaylists}
            onTrackOrderChange={onTrackOrderChange}
            formatDuration={(ms: number) => {
              const minutes = Math.floor(ms / 60000);
              const seconds = Math.floor((ms % 60000) / 1000);
              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }}
            accessToken={accessToken}
          />
        </div>
      </div>
    </div>
  );
};

export default MixPreview;
