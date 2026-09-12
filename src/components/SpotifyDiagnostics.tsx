import React, { useCallback, useState } from 'react';
import { getDefaultMarket, getSpotifyApi } from '../utils/spotify';
import {
  beginAuthorization,
  DEFAULT_SCOPES,
} from '../services/spotifyAuth';
import { getSpotifyClientId } from '../config';
import { useAppStore } from '../store';
import styles from './SpotifyDiagnostics.module.css';

type ProbeResult = {
  name: string;
  status: number | null;
  ok: boolean;
  detail?: string;
};

const getResponseDetail = (response: any): string | undefined => {
  const data = response?.data;
  const spotifyError = data?.error;

  if (typeof spotifyError === 'string' && spotifyError.trim()) {
    return spotifyError.trim();
  }

  if (spotifyError?.reason || spotifyError?.message) {
    return [spotifyError.reason, spotifyError.message]
      .filter(Boolean)
      .join(': ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  return undefined;
};

const runProbe = async (
  api: ReturnType<typeof getSpotifyApi>,
  name: string,
  url: string
): Promise<ProbeResult> => {
  try {
    await api.get(url);
    return { name, status: 200, ok: true };
  } catch (error) {
    const response = (error as any)?.response;
    return {
      name,
      status: typeof response?.status === 'number' ? response.status : null,
      ok: false,
      detail: getResponseDetail(response),
    };
  }
};

interface SpotifyDiagnosticsProps {
  accessToken: string;
}

/**
 * User-triggered, token-safe checks for distinguishing Spotify auth,
 * playlist access, and catalog-search failures in Development Mode.
 */
const SpotifyDiagnostics: React.FC<SpotifyDiagnosticsProps> = ({
  accessToken,
}) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const grantedScopes = useAppStore(state => state.grantedScopes);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setCheckedAt(null);

    const api = getSpotifyApi(accessToken);
    const searchParams = new URLSearchParams({
      q: 'salsa',
      type: 'playlist',
      limit: '1',
    });
    const market = getDefaultMarket();
    if (market) searchParams.set('market', market);

    const probes = [
      ['Current user (/me)', '/me'],
      ['Owned playlists (/me/playlists)', '/me/playlists?limit=1'],
      ['Playlist search (/search)', `/search?${searchParams.toString()}`],
    ] as const;

    const nextResults: ProbeResult[] = [];
    for (const [name, url] of probes) {
      nextResults.push(await runProbe(api, name, url));
    }

    setResults(nextResults);
    setCheckedAt(new Date().toISOString());
    setRunning(false);
  }, [accessToken]);

  const reconnectWithFreshApproval = useCallback(async () => {
    setReconnectError(null);
    try {
      const clientId = getSpotifyClientId();
      if (!clientId) {
        throw new Error('Spotify Client ID is not configured');
      }

      const authUrl = await beginAuthorization({
        clientId,
        redirectUri: window.location.origin + '/',
        scopes: DEFAULT_SCOPES,
        showDialog: true,
      });
      window.location.href = authUrl;
    } catch (error) {
      setReconnectError(
        error instanceof Error
          ? error.message
          : 'Could not start fresh Spotify authorization'
      );
    }
  }, []);

  return (
    <details className={styles.container}>
      <summary className={styles.summary}>Spotify diagnostics</summary>
      <p className={styles.description}>
        Checks the authenticated account, playlist access, and catalog search.
        Only the UTC run time, granted scope names, statuses, and Spotify error
        details are shown.
      </p>
      <p className={styles.description}>
        Granted scopes:{' '}
        {grantedScopes.length > 0
          ? [...grantedScopes].sort().join(', ')
          : 'not reported for this token'}
      </p>
      <button
        type="button"
        className="btn"
        onClick={runDiagnostics}
        disabled={running}
      >
        {running ? 'Running diagnostics...' : 'Run diagnostics'}
      </button>{' '}
      <button
        type="button"
        className="btn"
        onClick={reconnectWithFreshApproval}
        disabled={running}
      >
        Reconnect with fresh Spotify approval
      </button>
      {reconnectError && <p className={styles.failure}>{reconnectError}</p>}
      {results && (
        <div aria-live="polite">
          {checkedAt && (
            <p className={styles.checkedAt}>Checked at {checkedAt} UTC</p>
          )}
          <ul className={styles.results}>
            {results.map(result => (
              <li
                key={result.name}
                className={result.ok ? styles.success : styles.failure}
              >
                <span>{result.ok ? '✓' : '✕'}</span>{' '}
                <strong>{result.name}</strong> —{' '}
                {result.status ?? 'No response'}
                {result.detail ? ` — ${result.detail}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
};

export default SpotifyDiagnostics;
