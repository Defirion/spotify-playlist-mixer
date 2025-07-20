import React, { useState, useEffect } from 'react';
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
import { DragProvider, useDrag } from './contexts/DragContext';

function MainApp() {
  const { isDragging, isDropSuccessful, cancelDrag } = useDrag();
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [ratioConfig, setRatioConfig] = useState({});
  const [mixedPlaylists, setMixedPlaylists] = useState([]);
  const [error, setError] = useState(null);
  const [mixOptions, setMixOptions] = useState({
    totalSongs: 100,
    targetDuration: 240,
    useTimeLimit: false,
    playlistName: 'My Mixed Playlist',
    shuffleWithinGroups: true,
    popularityStrategy: 'mixed',
    recencyBoost: true
  });

  useEffect(() => {
    // Check for access token in URL hash (after Spotify redirect)
    const hash = window.location.hash;
    if (hash) {
      const tokenParam = hash.substring(1).split('&').find(elem => elem.startsWith('access_token'));
      if (tokenParam) {
        const token = tokenParam.split('=')[1];
        if (token) {
          setAccessToken(token);
          window.location.hash = '';
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleDragEnd = (e) => {
      // Only cancel drag for desktop dragend events, not touch events
      // Touch events should be handled by the specific components
      if (e.type === 'dragend' && isDragging && !isDropSuccessful) {
        cancelDrag();
      }
    };

    window.addEventListener('dragend', handleDragEnd);
    // Remove touchend listener - let components handle their own touch events
    // window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('dragend', handleDragEnd);
      // window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, isDropSuccessful, cancelDrag]);

  const handlePlaylistSelection = (playlist) => {
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

  const updateRatioConfig = (playlistId, config) => {
    setRatioConfig({
      ...ratioConfig,
      [playlistId]: config
    });
  };

  const handleApplyPreset = ({ ratioConfig: newRatioConfig, strategy, settings, presetName }) => {
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

  const handleDismissSuccess = (toastId) => {
    setMixedPlaylists(prev => prev.filter(playlist => playlist.toastId !== toastId));
  };

  const handleMixedPlaylist = (newPlaylist) => {
    // Add unique ID and timestamp for managing multiple toasts
    const playlistWithId = {
      ...newPlaylist,
      toastId: Date.now() + Math.random(),
      createdAt: new Date()
    };
    setMixedPlaylists(prev => [playlistWithId, ...prev]);
  };

  if (!accessToken) {
    return (
      <div className="container">
        <div className="header">
          <h1>🎵 Spotify Playlist Mixer</h1>
          <p>Create custom playlists with perfect ratios from your favorite genres</p>
        </div>
        <SpotifyAuth onAuth={setAccessToken} />
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

      <PlaylistSelector
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        onPlaylistSelect={handlePlaylistSelection}
        onError={setError}
      />

      <PresetTemplates
        selectedPlaylists={selectedPlaylists}
        onApplyPreset={handleApplyPreset}
      />

      {selectedPlaylists.length > 0 && (
        <RatioConfig
          selectedPlaylists={selectedPlaylists}
          ratioConfig={ratioConfig}
          onRatioUpdate={updateRatioConfig}
          onPlaylistRemove={(playlistId) => {
            const playlist = selectedPlaylists.find(p => p.id === playlistId);
            if (playlist) {
              handlePlaylistSelection(playlist);
            }
          }}
        />
      )}



      {selectedPlaylists.length > 1 && (
        <PlaylistMixer
          accessToken={accessToken}
          selectedPlaylists={selectedPlaylists}
          ratioConfig={ratioConfig}
          mixOptions={mixOptions}
          onMixedPlaylist={handleMixedPlaylist}
          onError={setError}
        />
      )}



      <ScrollToBottom />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DragProvider><MainApp /></DragProvider>} />
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
  );
}

export default App;