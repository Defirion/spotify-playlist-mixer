import React from 'react';
import styles from './TermsOfService.module.css';

const TermsOfService: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.lastUpdated}>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Acceptance of Terms</h2>
          <p className={styles.paragraph}>
            By using the Spotify Playlist Mixer app, you agree to these terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Description of Service</h2>
          <p className={styles.paragraph}>
            Spotify Playlist Mixer is a web application that:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              Accesses your Spotify playlists with your permission
            </li>
            <li className={styles.listItem}>
              Creates custom mixed playlists based on your preferences
            </li>
            <li className={styles.listItem}>
              Operates entirely in your browser using Spotify's official API
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>User Responsibilities</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              You must have a valid Spotify account
            </li>
            <li className={styles.listItem}>
              You are responsible for your Spotify account security
            </li>
            <li className={styles.listItem}>
              You control what playlists are accessed and created
            </li>
            <li className={styles.listItem}>
              You can revoke app access anytime in your Spotify settings
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitations</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              This app requires an active internet connection
            </li>
            <li className={styles.listItem}>
              Functionality depends on Spotify's API availability
            </li>
            <li className={styles.listItem}>
              Some playlists may not be accessible due to privacy settings
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Disclaimer</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              This service is provided "as-is" without warranties
            </li>
            <li className={styles.listItem}>
              We are not liable for any issues with your Spotify account
            </li>
            <li className={styles.listItem}>
              The app is a third-party tool, not affiliated with Spotify
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Modifications</h2>
          <p className={styles.paragraph}>
            We may update these terms. Continued use constitutes acceptance of
            changes.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Termination</h2>
          <p className={styles.paragraph}>
            You may stop using the service anytime by revoking access in your
            Spotify account settings.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
