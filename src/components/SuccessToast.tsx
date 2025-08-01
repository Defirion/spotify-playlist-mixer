import React from 'react';
import { SuccessToastProps } from '../types/components';
import styles from './SuccessToast.module.css';

const SuccessToast: React.FC<SuccessToastProps> = ({
  mixedPlaylists,
  onDismiss,
  className,
  testId,
}) => {
  if (!mixedPlaylists || mixedPlaylists.length === 0) return null;

  return (
    <div
      className={`${styles.toastContainer} ${className || ''}`}
      data-testid={testId || 'success-toast'}
    >
      {mixedPlaylists.map((playlist, index) => {
        const toastClass = index <= 2 ? `toast-${index}` : 'toast-stacked';
        return (
          <div
            key={playlist.toastId}
            className={`${styles.toast} ${styles[toastClass] || ''}`}
            data-testid={`success-toast-${playlist.toastId}`}
          >
            <div className={styles.toastContent}>
              <div className={styles.toastMain}>
                <h3 className={styles.toastTitle}>
                  🎉 Mixed Playlist Created!
                </h3>
                <p className={styles.toastMessage}>
                  Your new playlist "{playlist.name}" has been created with{' '}
                  {playlist.tracks?.total || playlist.tracks?.length || 0} songs
                  {playlist.duration !== undefined &&
                    playlist.duration !== null && (
                      <span>
                        {' '}
                        ({Math.floor(playlist.duration / 60)}h{' '}
                        {playlist.duration % 60}m)
                      </span>
                    )}
                  .
                </p>
                <div className={styles.toastDetails}>
                  Created {formatTimeAgo(playlist.createdAt)}
                </div>
                {playlist.external_urls?.spotify && (
                  <a
                    href={playlist.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.spotifyLink}
                  >
                    <button
                      className={styles.toastButton}
                      type="button"
                      aria-label={`Open ${playlist.name} in Spotify`}
                    >
                      Open in Spotify
                    </button>
                  </a>
                )}
              </div>
              <button
                onClick={() => onDismiss(playlist.toastId)}
                className={styles.closeButton}
                type="button"
                aria-label={`Dismiss notification for ${playlist.name}`}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Handle invalid dates
  if (isNaN(diffInSeconds)) {
    return 'recently';
  }

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

export default SuccessToast;
