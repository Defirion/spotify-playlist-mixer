import React, { useState, useEffect } from 'react';
import SpotifyAuth from './components/SpotifyAuth';
import PlaylistSelector from './components/PlaylistSelector';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import { getSpotifyApi } from './utils/spotify';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [ratioConfig, setRatioConfig] = useState({});
  const [mixedPlaylist, setMixedPlaylist] = useState(null);
  const [error, setError] = useState(null);

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

      {error && <div className="error">{error}</div>}

      <PlaylistSelector
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        onPlaylistSelect={handlePlaylistSelection}
        onError={setError}
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
    </div>
  );
}

export default App;