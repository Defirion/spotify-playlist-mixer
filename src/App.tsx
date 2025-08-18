import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AppShell from './AppShell';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { SpotifyPlaylist } from './types/spotify';
import {
  useAuth,
  usePlaylistSelection,
  useRatioConfig,
  useMixOptions,
  useUI,
  setUIError,
} from './store';
import styles from './App.module.css';

function MainApp() {
  const { accessToken, isAuthenticated, setAccessToken } = useAuth();
  const { selectedPlaylists, togglePlaylistSelection, clearAllPlaylists } =
    usePlaylistSelection();
  const { setRatioConfigBulk } = useRatioConfig();
  const { applyPresetOptions } = useMixOptions();
  const {
    error,
    mixedPlaylists,
    dismissError,
    dismissSuccessToast,
    addMixedPlaylist,
  } = useUI();
  const { mixOptions, updateMixOptions } = useMixOptions();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && !isAuthenticated) {
      const tokenParam = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'));
      if (tokenParam) {
        const token = tokenParam.split('=')[1];
        if (token) {
          setAccessToken(token);
          window.location.hash = '';
        }
      }
    }
  }, [setAccessToken, isAuthenticated]);

  const handlePlaylistSelection = (playlist: any) => {
    togglePlaylistSelection(playlist);
  };

  const handleClearAllPlaylists = () => {
    clearAllPlaylists();
  };

  const handleApplyPreset = ({
    ratioConfig: newRatioConfig,
    strategy,
    settings,
    presetName,
  }: any) => {
    setRatioConfigBulk(newRatioConfig);
    applyPresetOptions({ strategy, settings, presetName });
    if (error) {
      setUIError(null);
    }
  };

  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      accessToken={accessToken}
      selectedPlaylists={selectedPlaylists}
      error={error}
      mixedPlaylists={mixedPlaylists}
      mixOptions={mixOptions}
      updateMixOptions={updateMixOptions}
      onAuth={setAccessToken}
      onPlaylistSelect={handlePlaylistSelection}
      onClearAll={handleClearAllPlaylists}
      onApplyPreset={handleApplyPreset}
      onDismissError={dismissError}
      onDismissSuccess={() => dismissSuccessToast('')}
      onMixedPlaylist={addMixedPlaylist}
    />
  );
}

// intentionally unused helper container retained for manual testing / storybook
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RatioConfigContainer() {
  const { selectedPlaylists, togglePlaylistSelection } = usePlaylistSelection();
  const { ratioConfig, updateRatioConfig } = useRatioConfig();

  const handlePlaylistRemove = (playlistId: string) => {
    const playlist = selectedPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      togglePlaylistSelection(playlist);
    }
  };

  return (
    <RatioConfig
      selectedPlaylists={selectedPlaylists}
      ratioConfig={ratioConfig}
      onRatioUpdate={updateRatioConfig}
      onPlaylistRemove={handlePlaylistRemove}
    />
  );
}

// intentionally unused helper container retained for manual testing / storybook
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PlaylistMixerContainer() {
  const { accessToken } = useAuth();
  const { selectedPlaylists } = usePlaylistSelection();
  const { ratioConfig } = useRatioConfig();
  const { mixOptions, updateMixOptions } = useMixOptions();
  const { addMixedPlaylist } = useUI();

  const handleMixedPlaylist = (result: SpotifyPlaylist) => {
    addMixedPlaylist(result);
  };

  return (
    <PlaylistMixer
      accessToken={(accessToken ?? '') as string}
      selectedPlaylists={selectedPlaylists}
      ratioConfig={ratioConfig}
      mixOptions={mixOptions}
      updateMixOptions={updateMixOptions}
      onMixedPlaylist={handleMixedPlaylist}
      onError={err => setUIError(err)}
    />
  );
}

function App() {
  return (
    <Router>
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
