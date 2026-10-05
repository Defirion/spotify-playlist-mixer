import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container">
      <div className="card">
        <h1>Privacy Policy</h1>
        <p>
          <strong>Last updated:</strong> October 5, 2026
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
            Mixing happens in your browser. Authentication, playlist loading,
            searches, and saving send requests directly to Spotify.
          </li>
        </ul>

        <h2>Data Storage</h2>
        <ul>
          <li>We do not store any personal information</li>
          <li>All playlist mixing happens locally in your browser</li>
          <li>
            Access and refresh tokens are kept in browser memory. The temporary
            PKCE verifier and authorization state use session storage during
            sign-in. Saved playlists remain in your Spotify account.
          </li>
        </ul>

        <p>
          Saved playlists are kept off your Spotify profile. This does not
          restrict access through their links. For private access, open the
          playlist in Spotify and choose “Make private”.
        </p>

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
          <li>
            Reloading the app clears its in-memory playlist and token data
          </li>
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
