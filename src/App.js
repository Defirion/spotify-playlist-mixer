import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SpotifyAuth from './components/SpotifyAuth';
import PlaylistSelector from './components/PlaylistSelector';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PresetTemplates from './components/PresetTemplates';

import ToastError from './components/ToastError';
import ScrollToBottom from './components/ScrollToBottom';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function MainApp() {
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [ratioConfig, setRatioConfig] = useState({});
  const [mixedPlaylist, setMixedPlaylist] = useState(null);
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
        />
      )}



      {selectedPlaylists.length > 1 && (
        <PlaylistMixer
          accessToken={accessToken}
          selectedPlaylists={selectedPlaylists}
          ratioConfig={ratioConfig}
          mixOptions={mixOptions}
          onMixedPlaylist={setMixedPlaylist}
          onError={setError}
        />
      )}

      {mixedPlaylist && (
        <div className="card">
          <h3>🎉 Mixed Playlist Created!</h3>
          <p>
            Your new playlist "{mixedPlaylist.name}" has been created with {mixedPlaylist.tracks?.total || mixedPlaylist.tracks?.length || 0} songs
            {mixedPlaylist.duration && (
              <span> ({Math.floor(mixedPlaylist.duration / 60)}h {mixedPlaylist.duration % 60}m)</span>
            )}.
          </p>
          {mixedPlaylist.external_urls?.spotify && (
            <a href={mixedPlaylist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
              <button className="btn">Open in Spotify</button>
            </a>
          )}
        </div>
      )}

      <ScrollToBottom />
    </div>
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