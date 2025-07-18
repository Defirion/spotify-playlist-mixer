import React from 'react';
import ErrorBoundary from './ErrorBoundary';

const MixerErrorBoundary = ({ children, onError }) => {
  const mixerFallback = (error, errorInfo, retry) => (
    <div style={{
      padding: '24px',
      textAlign: 'center',
      background: 'var(--hunter-green)',
      border: '2px solid #e91e63',
      borderRadius: '12px',
      margin: '16px 0',
      color: 'white'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎛️</div>
      <h3 style={{ color: '#e91e63', marginBottom: '12px' }}>
        Mixer Error
      </h3>
      <p style={{ 
        marginBottom: '20px', 
        opacity: '0.8',
        fontSize: '14px'
      }}>
        Something went wrong while mixing your playlists. This could be due to 
        invalid playlist data or a processing error.
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
          🔄 Try Again
        </button>
        
        <button
          onClick={() => {
            // Clear any cached data and retry
            if (window.localStorage) {
              Object.keys(window.localStorage)
                .filter(key => key.startsWith('playlist_') || key.startsWith('mix_'))
                .forEach(key => window.localStorage.removeItem(key));
            }
            retry();
          }}
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
          🗑️ Clear & Retry
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={mixerFallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default MixerErrorBoundary;