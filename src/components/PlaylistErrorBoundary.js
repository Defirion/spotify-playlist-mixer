import React from 'react';
import ErrorBoundary from './ErrorBoundary';

const PlaylistErrorBoundary = ({ children, onError }) => {
  const playlistFallback = (error, errorInfo, retry) => (
    <div style={{
      padding: '24px',
      textAlign: 'center',
      background: 'var(--hunter-green)',
      border: '2px solid #ff9800',
      borderRadius: '12px',
      margin: '16px 0',
      color: 'white'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎵</div>
      <h3 style={{ color: '#ff9800', marginBottom: '12px' }}>
        Playlist Loading Error
      </h3>
      <p style={{ 
        marginBottom: '20px', 
        opacity: '0.8',
        fontSize: '14px'
      }}>
        We couldn't load your playlists. This might be due to a network issue 
        or a temporary problem with Spotify's servers.
      </p>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={retry}
          style={{
            background: 'var(--moss-green)',
            border: '2px solid var(--fern-green)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Retry Loading
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'transparent',
            border: '2px solid var(--moss-green)',
            color: 'var(--moss-green)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔃 Refresh
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={playlistFallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PlaylistErrorBoundary;