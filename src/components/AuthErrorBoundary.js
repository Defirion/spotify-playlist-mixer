import React from 'react';
import ErrorBoundary from './ErrorBoundary';

const AuthErrorBoundary = ({ children, onError, onRetryAuth }) => {
  const authFallback = (error, errorInfo, retry) => (
    <div style={{
      padding: '24px',
      textAlign: 'center',
      background: 'var(--hunter-green)',
      border: '2px solid #f44336',
      borderRadius: '12px',
      margin: '16px 0',
      color: 'white'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔐</div>
      <h3 style={{ color: '#f44336', marginBottom: '12px' }}>
        Authentication Error
      </h3>
      <p style={{ 
        marginBottom: '20px', 
        opacity: '0.8',
        fontSize: '14px'
      }}>
        There was a problem with your Spotify authentication. Your session may have 
        expired or there was an issue connecting to Spotify.
      </p>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            // Clear auth data and retry authentication
            if (window.localStorage) {
              window.localStorage.removeItem('spotify_token');
              window.localStorage.removeItem('spotify_refresh_token');
            }
            if (onRetryAuth) {
              onRetryAuth();
            } else {
              window.location.href = '/';
            }
          }}
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
          🔑 Re-authenticate
        </button>
        
        <button
          onClick={retry}
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
          🔄 Try Again
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={authFallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AuthErrorBoundary;