import React from 'react';

const ErrorHandler = ({ error, onDismiss, onRetry }) => {
  if (!error) return null;

  const getErrorDetails = error => {
    // Parse different types of errors and provide helpful messages
    const errorStr = error.toLowerCase();

    if (errorStr.includes('invalid_client') || errorStr.includes('client')) {
      return {
        title: '🔑 Spotify Connection Issue',
        message: "There's a problem with the Spotify app configuration.",
        suggestions: [
          'Try refreshing the page and connecting again',
          "Make sure you're using a valid Spotify account",
          'Check if the app is temporarily down',
        ],
        canRetry: true,
      };
    }

    if (errorStr.includes('redirect') || errorStr.includes('uri')) {
      return {
        title: '🔄 Redirect Error',
        message: "There's an issue with the authentication redirect.",
        suggestions: [
          'Try clearing your browser cache',
          "Make sure you're accessing the site with the correct URL",
          'Try using an incognito/private browser window',
        ],
        canRetry: true,
      };
    }

    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return {
        title: '🌐 Network Error',
        message: "Unable to connect to Spotify's servers.",
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          "Spotify's API might be temporarily unavailable",
        ],
        canRetry: true,
      };
    }

    if (errorStr.includes('playlist not found') || errorStr.includes('404')) {
      return {
        title: '📋 Playlist Not Found',
        message: "The playlist URL you entered couldn't be found.",
        suggestions: [
          'Make sure the playlist is public or you have access to it',
          'Double-check the playlist URL',
          'Try copying the URL directly from Spotify',
        ],
        canRetry: false,
      };
    }

    if (errorStr.includes('access denied') || errorStr.includes('403')) {
      return {
        title: '🚫 Access Denied',
        message: "You don't have permission to access this playlist.",
        suggestions: [
          'Make sure the playlist is public',
          "If it's your playlist, try making it public temporarily",
          'Ask the playlist owner to make it public',
        ],
        canRetry: false,
      };
    }

    if (errorStr.includes('rate limit') || errorStr.includes('429')) {
      return {
        title: '⏱️ Too Many Requests',
        message: "You're making requests too quickly.",
        suggestions: [
          'Wait a minute before trying again',
          'Try creating smaller playlists',
          'Spotify has temporary rate limits to prevent abuse',
        ],
        canRetry: true,
      };
    }

    if (errorStr.includes('no tracks') || errorStr.includes('empty')) {
      return {
        title: '🎵 No Songs Found',
        message: "The selected playlists don't have enough songs to mix.",
        suggestions: [
          'Make sure your playlists have songs in them',
          'Try adding more playlists',
          'Check if the playlists are accessible',
        ],
        canRetry: false,
      };
    }

    // Generic error
    return {
      title: '⚠️ Something Went Wrong',
      message: 'An unexpected error occurred.',
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Try again in a few moments',
      ],
      canRetry: true,
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div
      className="card"
      style={{
        border: '2px solid var(--fern-green)',
        background: 'rgba(79, 119, 45, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'var(--moss-green)', margin: '0 0 12px 0' }}>
            {errorDetails.title}
          </h3>

          <p style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>
            {errorDetails.message}
          </p>

          <div style={{ marginBottom: '20px' }}>
            <strong style={{ color: 'var(--moss-green)' }}>💡 Try this:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              {errorDetails.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  style={{ marginBottom: '4px', lineHeight: '1.4' }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {errorDetails.canRetry && onRetry && (
              <button
                className="btn"
                onClick={onRetry}
                style={{ background: 'var(--moss-green)' }}
              >
                🔄 Try Again
              </button>
            )}

            <button
              className="btn"
              onClick={onDismiss}
              style={{
                background: 'var(--hunter-green)',
                border: '1px solid var(--fern-green)',
              }}
            >
              ✕ Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--moss-green)',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px',
            marginLeft: '12px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Technical details (collapsed by default) */}
      <details style={{ marginTop: '16px', opacity: '0.7' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
          🔧 Technical Details
        </summary>
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'var(--dark-green)',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {error}
        </div>
      </details>
    </div>
  );
};

export default ErrorHandler;
