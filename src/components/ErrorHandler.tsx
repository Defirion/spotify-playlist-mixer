import React from 'react';
import ApiErrorDisplay from './ui/ApiErrorDisplay';
import { ApiError } from '../services/apiErrorHandler';
import { ErrorHandlerProps, ErrorDetails } from '../types/components';
import styles from './ErrorHandler.module.css';

/**
 * ErrorHandler component for displaying user-friendly error messages
 * Handles both ApiError instances and generic errors with fallback logic
 */
const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onDismiss,
  onRetry,
  className,
  testId,
}) => {
  if (!error) return null;

  // If it's an ApiError, use the enhanced display component
  if (error instanceof ApiError) {
    return (
      <ApiErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
        showDetails={process.env.NODE_ENV === 'development'}
        className={className}
        testId={testId}
      />
    );
  }

  // Fall back to legacy error handling for non-API errors
  const getErrorDetails = (error: Error | string): ErrorDetails => {
    const errorStr = (
      typeof error === 'string' ? error : error.message
    ).toLowerCase();

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
  const errorString = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={`${styles.errorContainer} ${className || ''}`}
      data-testid={testId}
    >
      <div className={styles.errorHeader}>
        <div className={styles.errorContent}>
          <h3 className={styles.errorTitle}>{errorDetails.title}</h3>

          <p className={styles.errorMessage}>{errorDetails.message}</p>

          <div className={styles.suggestionsContainer}>
            <strong className={styles.suggestionsTitle}>💡 Try this:</strong>
            <ul className={styles.suggestionsList}>
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className={styles.suggestionItem}>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.actionsContainer}>
            {errorDetails.canRetry && onRetry && (
              <button
                className={styles.retryButton}
                onClick={onRetry}
                type="button"
                aria-label="Try again"
              >
                🔄 Try Again
              </button>
            )}

            {onDismiss && (
              <button
                className={styles.dismissButton}
                onClick={onDismiss}
                type="button"
                aria-label="Dismiss error"
              >
                ✕ Dismiss
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={styles.closeButton}
            type="button"
            aria-label="Close error message"
          >
            ✕
          </button>
        )}
      </div>

      {/* Technical details (collapsed by default) */}
      <details className={styles.technicalDetails}>
        <summary className={styles.technicalSummary}>
          🔧 Technical Details
        </summary>
        <div className={styles.technicalContent}>{errorString}</div>
      </details>
    </div>
  );
};

export default ErrorHandler;
