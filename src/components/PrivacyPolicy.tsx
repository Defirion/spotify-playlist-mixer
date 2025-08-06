import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container">
      <div className="card">
        <h1>Privacy Policy</h1>
        <p>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <h2>Information We Collect</h2>
        <p>Our Spotify Playlist Mixer app collects minimal information:</p>
        <ul>
          <li>
            <strong>Spotify Authentication:</strong> We use Spotify's OAuth to
            access your playlists
          </li>
          <li>
            <strong>Playlist Data:</strong> We temporarily access playlist
            information to create mixed playlists
          </li>
          <li>
            <strong>No Personal Storage:</strong> We do not store any personal
            data on our servers
          </li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>
            Access your Spotify playlists to create custom mixed playlists
          </li>
          <li>
            Create new playlists in your Spotify account based on your
            preferences
          </li>
          <li>
            All processing happens in your browser - no data sent to external
            servers
          </li>
        </ul>

        <h2>Data Storage</h2>
        <ul>
          <li>We do not store any personal information</li>
          <li>All playlist mixing happens locally in your browser</li>
          <li>
            Your Spotify access token is temporary and handled by Spotify's
            secure OAuth flow
          </li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>This app uses:</p>
        <ul>
          <li>
            <strong>Spotify Web API:</strong> To access and modify your
            playlists (governed by Spotify's Privacy Policy)
          </li>
          <li>
            <strong>Netlify:</strong> For hosting (governed by Netlify's Privacy
            Policy)
          </li>
        </ul>

        <h2>Your Rights</h2>
        <ul>
          <li>
            You can revoke app access anytime in your Spotify account settings
          </li>
          <li>You control all playlist creation and modification</li>
          <li>No data retention - everything is processed in real-time</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about this privacy policy? The app is open source and
          processes everything locally in your browser.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
