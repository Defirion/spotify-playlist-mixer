import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AppShell from './AppShell';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import {
  completeAuthorization,
  refreshAccessToken,
} from './services/spotifyAuth';
import {
  useAuth,
  usePlaylistSelection,
  useRatioConfig,
  useMixOptions,
  useUI,
  setUIError,
} from './store';
import { getSpotifyClientId } from './config';
import styles from './App.module.css';

export function MainApp() {
  const {
    accessToken,
    refreshToken,
    tokenExpiresAt,
    grantedScopes,
    isAuthenticated,
    setAccessToken,
    setTokens,
    clearAuth,
  } = useAuth();
  const { selectedPlaylists, togglePlaylistSelection, clearAllPlaylists } =
    usePlaylistSelection();
  const { setRatioConfigBulk, ratioConfig, updateRatioConfig } =
    useRatioConfig();
  const { applyPresetOptions } = useMixOptions();
  const {
    error,
    mixedPlaylists,
    dismissError,
    dismissSuccessToast,
    addMixedPlaylist,
  } = useUI();
  const { mixOptions, updateMixOptions } = useMixOptions();

  // Handle the redirect back from Spotify's Authorization Code (PKCE) flow:
  // the URL contains ?code=...&state=... (or ?error=... if the user denied).
  useEffect(() => {
    if (isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const authError = params.get('error');

    if (!code && !authError) return;

    // Remove the one-time code/state/error params from the address bar so a
    // reload doesn't retry a consumed authorization code.
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);

    if (authError) {
      setUIError(new Error(`Spotify authorization failed: ${authError}`));
      return;
    }

    const clientId = getSpotifyClientId();
    if (!clientId) {
      setUIError(new Error('Spotify Client ID is not configured'));
      return;
    }

    completeAuthorization({
      clientId,
      redirectUri: window.location.origin + '/',
      code: code as string,
      state,
    })
      .then(tokens => setTokens(tokens))
      .catch(err => setUIError(err));
  }, [setTokens, isAuthenticated]);

  // Proactively refresh the access token shortly before it expires so a
  // long mixing session doesn't start failing with 401s mid-flow.
  useEffect(() => {
    if (!refreshToken || !tokenExpiresAt) return;

    const clientId = getSpotifyClientId();
    if (!clientId) return;

    const refreshIn = Math.max(tokenExpiresAt - Date.now() - 60_000, 0);
    const timer = window.setTimeout(() => {
      refreshAccessToken(clientId, refreshToken, grantedScopes)
        .then(tokens => setTokens(tokens))
        .catch(() => {
          // Refresh failed (revoked/expired) — drop back to the connect screen.
          clearAuth();
        });
    }, refreshIn);

    return () => window.clearTimeout(timer);
  }, [
    refreshToken,
    tokenExpiresAt,
    grantedScopes,
    setTokens,
    clearAuth,
  ]);

  const handlePlaylistSelection = (playlist: any) => {
    togglePlaylistSelection(playlist);
  };

  const handleClearAllPlaylists = () => {
    clearAllPlaylists();
  };

  const handleApplyPreset = ({
    ratioConfig: newRatioConfig,
    settings,
    presetName,
  }: any) => {
    setRatioConfigBulk(newRatioConfig);
    applyPresetOptions({ settings, presetName });
    if (error) {
      setUIError(null);
    }
  };

  const handlePlaylistRemove = (playlistId: string) => {
    const playlist = selectedPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      // reuse toggle to remove from selection
      // togglePlaylistSelection will remove if already selected
      togglePlaylistSelection(playlist);
    }
  };

  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      accessToken={accessToken}
      selectedPlaylists={selectedPlaylists}
      error={error}
      ratioConfig={ratioConfig}
      mixedPlaylists={mixedPlaylists}
      mixOptions={mixOptions}
      updateMixOptions={updateMixOptions}
      onAuth={setAccessToken}
      onPlaylistSelect={handlePlaylistSelection}
      onRatioUpdate={updateRatioConfig}
      onPlaylistRemove={handlePlaylistRemove}
      onClearAll={handleClearAllPlaylists}
      onApplyPreset={handleApplyPreset}
      onDismissError={dismissError}
      onDismissSuccess={() => dismissSuccessToast('')}
      onMixedPlaylist={addMixedPlaylist}
      onError={err => setUIError(err)}
    />
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>

      <footer className={styles.footer}>
        <Link to="/privacy" className={styles.footerLink}>
          Privacy Policy
        </Link>
        |
        <Link to="/terms" className={styles.footerLink}>
          Terms of Service
        </Link>
        |
        <Link to="/" className={styles.footerLink}>
          Back to Mixer
        </Link>
      </footer>
    </Router>
  );
}

export default App;
