import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Components
import SpotifyAuth from './components/SpotifyAuth';
import PlaylistSelector from './components/PlaylistSelector';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PresetTemplates from './components/PresetTemplates';
import ToastError from './components/ToastError';
import SuccessToast from './components/SuccessToast';
import ScrollToBottom from './components/ScrollToBottom';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Context
import { DragProvider } from './components/DragContext';

// Store hooks
import {
  useAuth,
  usePlaylistSelection,
  useRatioConfig,
  useMixOptions,
  useUI,
} from './store';

// Types
import { PlaylistMixResult } from './types/mixer';

// Styles
import styles from './App.module.css';

function MainApp() {
  // Use individual selector hooks to avoid infinite re-renders
  const { accessToken, isAuthenticated, setAccessToken } = useAuth();
  const { selectedPlaylists, togglePlaylistSelection, clearAllPlaylists } =
    usePlaylistSelection();
  const { setRatioConfigBulk } = useRatioConfig();
  const { applyPresetOptions } = useMixOptions();
  const { error, mixedPlaylists, setError, dismissError, dismissSuccessToast } =
    useUI();

  // Handle Spotify OAuth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
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
  }, [setAccessToken]);

  // Simplified playlist selection handler
  const handlePlaylistSelection = (playlist: any) => {
    togglePlaylistSelection(playlist);
  };

  // Simplified clear all handler
  const handleClearAllPlaylists = () => {
    clearAllPlaylists();
  };

  // Simplified preset application handler
  const handleApplyPreset = ({
    ratioConfig: newRatioConfig,
    strategy,
    settings,
    presetName,
  }: any) => {
    setRatioConfigBulk(newRatioConfig);
    applyPresetOptions({ strategy, settings, presetName });
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="container">
          <div className="header">
            <h1>🎵 Spotify Playlist Mixer</h1>
            <p>
              Create custom playlists with perfect ratios from your favorite
              genres
            </p>
          </div>
          <SpotifyAuth onAuth={setAccessToken} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container">
        <div className="header">
          <h1>🎵 Spotify Playlist Mixer</h1>
          <p>Mix your playlists with custom ratios</p>
        </div>

        <ToastError error={error} onDismiss={dismissError} />

        <SuccessToast
          mixedPlaylists={mixedPlaylists}
          onDismiss={dismissSuccessToast}
        />

        <ErrorBoundary>
          <PlaylistSelector
            accessToken={accessToken}
            selectedPlaylists={selectedPlaylists}
            onPlaylistSelect={handlePlaylistSelection}
            onClearAll={handleClearAllPlaylists}
            onError={setError}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <PresetTemplates
            selectedPlaylists={selectedPlaylists}
            onApplyPreset={handleApplyPreset}
          />
        </ErrorBoundary>

        {selectedPlaylists.length > 0 && (
          <ErrorBoundary>
            <RatioConfigContainer />
          </ErrorBoundary>
        )}

        {selectedPlaylists.length > 1 && (
          <ErrorBoundary>
            <PlaylistMixerContainer />
          </ErrorBoundary>
        )}

        <ScrollToBottom />
      </div>
    </ErrorBoundary>
  );
}

// Separate container components to isolate store dependencies
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

function PlaylistMixerContainer() {
  const { accessToken } = useAuth();
  const { selectedPlaylists } = usePlaylistSelection();
  const { ratioConfig } = useRatioConfig();
  const { mixOptions, updateMixOptions } = useMixOptions();
  const { addMixedPlaylist, setError } = useUI();

  const handleMixedPlaylist = (result: PlaylistMixResult) => {
    // Convert PlaylistMixResult to SpotifyPlaylist format for the toast
    const playlistForToast = {
      id: `mixed-${Date.now()}`,
      name: mixOptions.playlistName,
      description: `Mixed playlist with ${result.tracks.length} tracks`,
      images: [],
      tracks: { total: result.tracks.length, href: '' },
      owner: {
        id: 'user',
        display_name: 'You',
        external_urls: { spotify: '' },
      },
      public: false,
      collaborative: false,
      uri: `spotify:playlist:mixed-${Date.now()}`,
      external_urls: { spotify: '' },
    };
    addMixedPlaylist(playlistForToast);
  };

  return (
    <PlaylistMixer
      accessToken={accessToken!}
      selectedPlaylists={selectedPlaylists}
      ratioConfig={ratioConfig}
      mixOptions={mixOptions}
      updateMixOptions={updateMixOptions}
      onMixedPlaylist={handleMixedPlaylist}
      onError={setError}
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <DragProvider>
                <MainApp />
              </DragProvider>
            }
          />
          <Route
            path="/privacy"
            element={
              <ErrorBoundary>
                <PrivacyPolicy />
              </ErrorBoundary>
            }
          />
          <Route
            path="/terms"
            element={
              <ErrorBoundary>
                <TermsOfService />
              </ErrorBoundary>
            }
          />
        </Routes>

        {/* Footer with links */}
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
    </ErrorBoundary>
  );
}

export default App;
