import React from 'react';
import { SpotifyAuthProps } from '../types/components';
import { beginAuthorization, DEFAULT_SCOPES } from '../services/spotifyAuth';
import { getSpotifyClientId } from '../config';
import styles from './SpotifyAuth.module.css';

const SpotifyAuth: React.FC<SpotifyAuthProps> = props => {
  const { onError, redirectUri, scopes, clientId, className, testId } = props;
  const CLIENT_ID = clientId || getSpotifyClientId();
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
    <div
      className={`${styles.connect} ${className || ''}`.trim()}
      data-testid={testId}
    >
      <h2 className={styles.title}>Mix playlists by ratio.</h2>
      <p className={styles.description}>
        Pick playlists, set the blend, save to Spotify.
      </p>
      <div className={styles.buttonContainer}>
        <button
          className={`btn ${styles.connectButton}`}
          onClick={handleLogin}
          type="button"
        >
          Connect Spotify
        </button>
      </div>
    </div>
  );
};

export default SpotifyAuth;
