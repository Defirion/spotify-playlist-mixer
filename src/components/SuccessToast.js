import React from 'react';

const SuccessToast = ({ mixedPlaylists, onDismiss }) => {
  if (!mixedPlaylists || mixedPlaylists.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
      }}
    >
      {mixedPlaylists.map((playlist, index) => (
        <div
          key={playlist.toastId}
          style={{
            background: 'var(--hunter-green)',
            border: '2px solid #1DB954',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: `slideInLeft 0.3s ease-out ${index * 0.1}s both`,
            transform: index > 0 ? 'scale(0.98)' : 'scale(1)',
            opacity: index > 2 ? 0.8 : 1,
            transition: 'all 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  color: '#1DB954',
                  fontSize: '16px',
                }}
              >
                🎉 Mixed Playlist Created!
              </h3>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  lineHeight: '1.4',
                }}
              >
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
              <div
                style={{
                  fontSize: '12px',
                  opacity: '0.7',
                  marginBottom: '12px',
                }}
              >
                Created {formatTimeAgo(playlist.createdAt)}
              </div>
              {playlist.external_urls?.spotify && (
                <a
                  href={playlist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      background: '#1DB954',
                      border: '1px solid #1DB954',
                    }}
                  >
                    Open in Spotify
                  </button>
                </a>
              )}
            </div>
            <button
              onClick={() => onDismiss(playlist.toastId)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mindaro)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
                opacity: '0.7',
                borderRadius: '4px',
                minWidth: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => (e.target.style.opacity = '1')}
              onMouseLeave={e => (e.target.style.opacity = '0.7')}
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
