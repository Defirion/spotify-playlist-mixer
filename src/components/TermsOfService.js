import React from 'react';

const TermsOfService = () => {
  return (
    <div className="container">
      <div className="card">
        <h1>Terms of Service</h1>
        <p>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <h2>Acceptance of Terms</h2>
        <p>
          By using the Spotify Playlist Mixer app, you agree to these terms.
        </p>

        <h2>Description of Service</h2>
        <p>Spotify Playlist Mixer is a web application that:</p>
        <ul>
          <li>Accesses your Spotify playlists with your permission</li>
          <li>Creates custom mixed playlists based on your preferences</li>
          <li>
            Operates entirely in your browser using Spotify's official API
          </li>
        </ul>

        <h2>User Responsibilities</h2>
        <ul>
          <li>You must have a valid Spotify account</li>
          <li>You are responsible for your Spotify account security</li>
          <li>You control what playlists are accessed and created</li>
          <li>You can revoke app access anytime in your Spotify settings</li>
        </ul>

        <h2>Limitations</h2>
        <ul>
          <li>This app requires an active internet connection</li>
          <li>Functionality depends on Spotify's API availability</li>
          <li>Some playlists may not be accessible due to privacy settings</li>
        </ul>

        <h2>Disclaimer</h2>
        <ul>
          <li>This service is provided "as-is" without warranties</li>
          <li>We are not liable for any issues with your Spotify account</li>
          <li>The app is a third-party tool, not affiliated with Spotify</li>
        </ul>

        <h2>Modifications</h2>
        <p>
          We may update these terms. Continued use constitutes acceptance of
          changes.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the service anytime by revoking access in your
          Spotify account settings.
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;
