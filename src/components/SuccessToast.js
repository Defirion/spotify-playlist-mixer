import React from 'react';
import styles from './SuccessToast.module.css';

const SuccessToast = ({ mixedPlaylists, onDismiss }) => {
  if (!mixedPlaylists || mixedPlaylists.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {mixedPlaylists.map((playlist, index) => (
        <div
          key={playlist.toastId}
          className={styles.toast}
          style={{
            animation: `slideInLeft 0.3s ease-out ${index * 0.1}s both`,
            transform: index > 0 ? 'scale(0.98)' : 'scale(1)',
            opacity: index > 2 ? 0.8 : 1,
          }}
        >
          <div className={styles.toastContent}>
            <div className={styles.toastMain}>
              <h3 className={styles.toastTitle}>🎉 Mixed Playlist Created!</h3>
              <p className={styles.toastMessage}>
                Your new playlist "{playlist.name}" has been created with{' '}
                {playlist.tracks?.total || playlist.tracks?.length || 0} songs
                {playlist.duration && (
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
                >
                  <button className={styles.toastButton}>
                    Open in Spotify
                  </button>
                </a>
              )}
            </div>
            <button
              onClick={() => onDismiss(playlist.toastId)}
              className={styles.closeButton}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const formatTimeAgo = date => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

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
