import React, { useState } from 'react';
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

// Error Boundaries
import ErrorBoundary from './components/ErrorBoundary';
import AuthErrorBoundary from './components/AuthErrorBoundary';
import PlaylistErrorBoundary from './components/PlaylistErrorBoundary';
import MixerErrorBoundary from './components/MixerErrorBoundary';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { MixerProvider } from './context/MixerContext';

// Services
import { AuthService } from './services/AuthService';
import { SpotifyService } from './services/SpotifyService';
import { PlaylistMixerService } from './services/PlaylistMixerService';
import { StorageService } from './services/StorageService';

// Configuration
import { SPOTIFY_CLIENT_ID } from './config';

// Create service instances
const storageService = new StorageService();
const authService = new AuthService(
  storageService,
  SPOTIFY_CLIENT_ID,
  window.location.origin,
  ['playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-public', 'playlist-modify-private']
);
const spotifyService = new SpotifyService(authService);
const playlistMixerService = new PlaylistMixerService();

function MainApp() {
  return (
    <AuthProvider authService={authService}>
      <PlaylistProvider spotifyService={spotifyService}>
        <MixerProvider playlistMixerService={playlistMixerService} spotifyService={spotifyService}>
          <MainAppContent />
        </MixerProvider>
      </PlaylistProvider>
    </AuthProvider>
  );
}

function MainAppContent() {
  const { state: authState } = useAuth();
  const [selectedPlaylists, setSelectedPlaylists] = useState<any[]>([]);
  const [ratioConfig, setRatioConfig] = useState<any>({});
  const [mixedPlaylists, setMixedPlaylists] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mixOptions, setMixOptions] = useState({
    totalSongs: 100,
    targetDuration: 240,
    useTimeLimit: false,
    playlistName: 'My Mixed Playlist',
    shuffleWithinGroups: true,
    popularityStrategy: 'mixed',
    recencyBoost: true
  });

  const handlePlaylistSelection = (playlist: any) => {
    if (selectedPlaylists.find(p => p.id === playlist.id)) {
      setSelectedPlaylists(selectedPlaylists.filter(p => p.id !== playlist.id));
      const newRatioConfig = { ...ratioConfig };
      delete newRatioConfig[playlist.id];
      setRatioConfig(newRatioConfig);
    } else {
      setSelectedPlaylists([...selectedPlaylists, playlist]);
      setRatioConfig({
        ...ratioConfig,
        [playlist.id]: { min: 1, max: 2, weight: 2, weightType: 'frequency' }
      });
    }
  };

  const updateRatioConfig = (playlistId: string, config: any) => {
    setRatioConfig({
      ...ratioConfig,
      [playlistId]: config
    });
  };

  const handleApplyPreset = ({ ratioConfig: newRatioConfig, strategy, settings, presetName }: any) => {
    setRatioConfig(newRatioConfig);
    setMixOptions(prev => ({
      ...prev,
      popularityStrategy: strategy,
      recencyBoost: settings.recencyBoost,
      shuffleWithinGroups: settings.shuffleWithinGroups,
      useTimeLimit: settings.useTimeLimit || false,
      targetDuration: settings.targetDuration || prev.targetDuration,
      playlistName: `${presetName} Mix`
    }));
    setError(null);
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleDismissSuccess = (toastId: number) => {
    setMixedPlaylists(prev => prev.filter(playlist => playlist.toastId !== toastId));
  };

  const handleMixedPlaylist = (newPlaylist: any) => {
    // Add unique ID and timestamp for managing multiple toasts
    const playlistWithId = {
      ...newPlaylist,
      toastId: Date.now() + Math.random(),
      createdAt: new Date()
    };
    setMixedPlaylists(prev => [playlistWithId, ...prev]);
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="container">
        <div className="header">
          <h1>🎵 Spotify Playlist Mixer</h1>
          <p>Create custom playlists with perfect ratios from your favorite genres</p>
        </div>
        <AuthErrorBoundary onError={setError} onRetryAuth={() => {}}>
          <SpotifyAuth />
        </AuthErrorBoundary>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🎵 Spotify Playlist Mixer</h1>
        <p>Mix your playlists with custom ratios</p>
      </div>

      <ToastError 
        error={error} 
        onDismiss={handleDismissError}
      />

      <SuccessToast 
        mixedPlaylists={mixedPlaylists}
        onDismiss={handleDismissSuccess}
      />

      <PlaylistErrorBoundary onError={setError}>
        <PlaylistSelector
          onError={setError}
        />
      </PlaylistErrorBoundary>

      <PresetTemplates
        selectedPlaylists={selectedPlaylists}
        onApplyPreset={handleApplyPreset}
      />

      {selectedPlaylists.length > 0 && (
        <RatioConfig
          selectedPlaylists={selectedPlaylists}
          ratioConfig={ratioConfig}
          onRatioUpdate={updateRatioConfig}
          onPlaylistRemove={(playlistId: string) => {
            const playlist = selectedPlaylists.find(p => p.id === playlistId);
            if (playlist) {
              handlePlaylistSelection(playlist);
            }
          }}
        />
      )}

      {selectedPlaylists.length > 1 && (
        <MixerErrorBoundary onError={setError}>
          <PlaylistMixer
            accessToken={authState.token}
            selectedPlaylists={selectedPlaylists}
            ratioConfig={ratioConfig}
            mixOptions={mixOptions}
            onMixedPlaylist={handleMixedPlaylist}
            onError={setError}
          />
        </MixerErrorBoundary>
      )}

      <ScrollToBottom />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
        
        {/* Footer with links */}
        <footer style={{ 
          textAlign: 'center', 
          padding: '20px', 
          marginTop: '40px',
          borderTop: '1px solid var(--fern-green)',
          opacity: '0.7'
        }}>
          <Link to="/privacy" style={{ color: 'var(--moss-green)', margin: '0 10px' }}>
            Privacy Policy
          </Link>
          |
          <Link to="/terms" style={{ color: 'var(--moss-green)', margin: '0 10px' }}>
            Terms of Service
          </Link>
          |
          <Link to="/" style={{ color: 'var(--moss-green)', margin: '0 10px' }}>
            Back to Mixer
          </Link>
        </footer>
      </Router>
    </ErrorBoundary>
  );
}

export default App;