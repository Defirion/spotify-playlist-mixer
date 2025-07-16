import React from 'react';
import { SPOTIFY_CLIENT_ID } from '../config';

const SpotifyAuth = ({ onAuth }) => {
  const CLIENT_ID = SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = window.location.origin;
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
        <p><strong>Setup Required:</strong></p>
        <p>1. Create a Spotify app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#1db954' }}>developer.spotify.com</a></p>
        <p>2. Add "{window.location.origin}" as a redirect URI</p>
        <p>3. Replace CLIENT_ID in SpotifyAuth.js with your app's client ID</p>
      </div>
    </div>
  );
};

export default SpotifyAuth;