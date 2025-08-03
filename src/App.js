import React, { useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
import { DragProvider, useDrag } from './components/DragContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

import styles from './App.module.css';

// Custom hooks for state management
import { useAppState } from './hooks/useAppState';
import { useMixOptions } from './hooks/useMixOptions';
import { usePlaylistSelection } from './hooks/usePlaylistSelection';
import { useRatioConfig } from './hooks/useRatioConfig';

function MainApp() {
  const { isDragging, cancelDrag } = useDrag();

  // Use custom hooks for state management
  const {
    accessToken,
    error,
    mixedPlaylists,
    setAccessToken,
    setError,
    dismissError,
    addMixedPlaylist,
    dismissSuccessToast,
  } = useAppState();

  const { mixOptions, applyPresetOptions } = useMixOptions();

  const { selectedPlaylists, togglePlaylistSelection, clearAllPlaylists } =
    usePlaylistSelection();

  const {
    ratioConfig,
    updateRatioConfig,
    addPlaylistToRatioConfig,
    removeRatioConfig,
    setRatioConfigBulk,
  } = useRatioConfig();

  useEffect(() => {
    // Check for access token in URL hash (after Spotify redirect)
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

  // Drag end handling is now managed by useDraggable hook in individual components

  const handlePlaylistSelection = useCallback(
    playlist => {
      const isSelected = selectedPlaylists.find(p => p.id === playlist.id);

      if (isSelected) {
        // Remove playlist and its ratio config
        togglePlaylistSelection(playlist);
        removeRatioConfig(playlist.id);
      } else {
        // Add playlist and initialize ratio config
        togglePlaylistSelection(playlist);
        addPlaylistToRatioConfig(playlist.id);
      }
    },
    [
      selectedPlaylists,
      togglePlaylistSelection,
      removeRatioConfig,
      addPlaylistToRatioConfig,
    ]
  );

  const handleClearAllPlaylists = useCallback(() => {
    clearAllPlaylists();
    setRatioConfigBulk({});
  }, [clearAllPlaylists, setRatioConfigBulk]);

  const handleApplyPreset = useCallback(
    ({ ratioConfig: newRatioConfig, strategy, settings, presetName }) => {
      setRatioConfigBulk(newRatioConfig);
      applyPresetOptions({ strategy, settings, presetName });
      setError(null);
    },
    [setRatioConfigBulk, applyPresetOptions, setError]
  );

  if (!accessToken) {
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
            <RatioConfig
              selectedPlaylists={selectedPlaylists}
              ratioConfig={ratioConfig}
              onRatioUpdate={updateRatioConfig}
              onPlaylistRemove={playlistId => {
                const playlist = selectedPlaylists.find(
                  p => p.id === playlistId
                );
                if (playlist) {
                  handlePlaylistSelection(playlist);
                }
              }}
            />
          </ErrorBoundary>
        )}

        {selectedPlaylists.length > 1 && (
          <ErrorBoundary>
            <PlaylistMixer
              accessToken={accessToken}
              selectedPlaylists={selectedPlaylists}
              ratioConfig={ratioConfig}
              mixOptions={mixOptions}
              onMixedPlaylist={addMixedPlaylist}
              onError={setError}
            />
          </ErrorBoundary>
        )}

        <ScrollToBottom />
      </div>
    </ErrorBoundary>
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
