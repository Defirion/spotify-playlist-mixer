import React from 'react';
import { useAuth } from '../context/AuthContext';

const SpotifyAuth: React.FC = () => {
  const { state, login, clearError } = useAuth();

  const handleLogin = async () => {
    try {
      clearError();
      await login();
    } catch (error) {
      // Error is handled by the AuthContext
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="card">
      <h2>Connect to Spotify</h2>
      <p>To get started, you'll need to connect your Spotify account.</p>
      
      {state.error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#ffe6e6', 
          borderRadius: '4px' 
        }}>
          <strong>Error:</strong> {state.error}
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button 
          className="btn" 
          onClick={handleLogin}
          disabled={state.isLoading}
        >
          {state.isLoading ? 'Connecting...' : 'Connect Spotify Account'}
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