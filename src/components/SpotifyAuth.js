import React from 'react';

const SpotifyAuth = ({ onAuth }) => {
  const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = window.location.origin + '/';
  const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

  const handleLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}`;

    window.location.href = authUrl;
  };

  return (
    <div className="card">
      <h2>Connect to Spotify</h2>
      <p>To get started, you'll need to connect your Spotify account.</p>
      <div style={{ marginTop: '20px' }}>
        <button className="btn" onClick={handleLogin}>
          Connect Spotify Account
        </button>
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', opacity: '0.8' }}>
        <p><strong>Ready to use!</strong></p>
        <p>Click the button above to connect your Spotify account and start mixing playlists.</p>
      </div>
    </div>
  );
};

export default SpotifyAuth;