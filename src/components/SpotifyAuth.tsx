import React from 'react';
import { SpotifyAuthProps } from '../types/components';
import { beginAuthorization, DEFAULT_SCOPES } from '../services/spotifyAuth';
import styles from './SpotifyAuth.module.css';

const SpotifyAuth: React.FC<SpotifyAuthProps> = props => {
  const { onError, redirectUri, scopes, clientId, className, testId } = props;
  const CLIENT_ID = clientId || process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = redirectUri || window.location.origin + '/';
  const SCOPES = scopes || DEFAULT_SCOPES;

  const handleLogin = async (): Promise<void> => {
    try {
      if (!CLIENT_ID || CLIENT_ID.trim() === '') {
        const error = new Error('Spotify Client ID is not configured');
        onError?.(error);
        return;
      }

      const authUrl = await beginAuthorization({
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scopes: SCOPES,
      });

      window.location.href = authUrl;
    } catch (error) {
      onError?.(
        error instanceof Error ? error : new Error('Authentication failed')
      );
    }
  };

  return (
    <div className={`card ${className || ''}`.trim()} data-testid={testId}>
      <h2 className={styles.title}>Connect to Spotify</h2>
      <p className={styles.description}>
        To get started, you'll need to connect your Spotify account.
      </p>
      <div className={styles.buttonContainer}>
        <button
          className={`btn ${styles.connectButton}`}
          onClick={handleLogin}
          type="button"
        >
          Connect Spotify Account
        </button>
      </div>
      <div className={styles.infoContainer}>
        <p className={styles.infoTitle}>
          <strong>Ready to use!</strong>
        </p>
        <p className={styles.infoText}>
          Click the button above to connect your Spotify account and start
          mixing playlists.
        </p>
      </div>
    </div>
  );
};

export default SpotifyAuth;
