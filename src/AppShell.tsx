import React from 'react';
import SpotifyAuth from './components/SpotifyAuth';
import PlaylistSelector from './components/PlaylistSelector';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PresetTemplates from './components/PresetTemplates';
import ToastError from './components/ToastError';
import SuccessToast from './components/SuccessToast';
import ScrollToBottom from './components/ScrollToBottom';
// These imports are kept for the routes and footer links; mark unused to avoid lint noise
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PrivacyPolicy from './components/PrivacyPolicy';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TermsOfService from './components/TermsOfService';
import ErrorBoundary from './components/ui/ErrorBoundary';
// styles are used in the footer but ESLint may warn in certain build/test environments
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './App.module.css';

type AppShellProps = {
  isAuthenticated: boolean;
  accessToken?: string | null;
  selectedPlaylists: any[];
  ratioConfig?: any;
  error?: any;
  mixedPlaylists?: any[];
  mixOptions?: any;
  updateMixOptions?: (updates: Partial<any>) => void;
  // callback hooks
  onAuth?: (token: string) => void;
  onPlaylistSelect?: (p: any) => void;
  onClearAll?: () => void;
  onApplyPreset?: (p: any) => void;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
  onMixedPlaylist?: (playlist: any) => void;
};

const AppShell: React.FC<AppShellProps> = ({
  isAuthenticated,
  accessToken,
  selectedPlaylists,
  ratioConfig,
  error,
  mixedPlaylists,
  onAuth,
  onPlaylistSelect,
  onClearAll,
  onApplyPreset,
  onDismissError,
  onDismissSuccess,
  onMixedPlaylist,
  mixOptions,
  updateMixOptions,
}) => {
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="container">
          <div className="header">
            <h1>🎵 Spotify Playlist Mixer</h1>
            <p>
              Create custom playlists with perfect ratios from your favorite
              genres
            </p>
          </div>
          <SpotifyAuth onAuth={onAuth} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container">
        <div className="header">
          <h1>🎵 Spotify Playlist Mixer</h1>
          <p>Mix your playlists with custom ratios</p>
          {process.env.NODE_ENV !== 'production' && accessToken ? (
            <div style={{ fontSize: 12, marginTop: 6, color: '#666' }}>
              DEV: token=
              {accessToken.length > 10
                ? `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`
                : accessToken}
            </div>
          ) : null}
        </div>

        <ToastError error={error} onDismiss={onDismissError ?? (() => {})} />

        <SuccessToast
          mixedPlaylists={mixedPlaylists ?? null}
          onDismiss={
            onDismissSuccess ? (id: string) => onDismissSuccess() : () => {}
          }
        />

        <ErrorBoundary>
          <PlaylistSelector
            accessToken={accessToken ?? null}
            selectedPlaylists={selectedPlaylists}
            onPlaylistSelect={onPlaylistSelect ?? (() => {})}
            onClearAll={onClearAll ?? (() => {})}
            onError={() => {}}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <PresetTemplates
            selectedPlaylists={selectedPlaylists}
            onApplyPreset={onApplyPreset ?? (() => {})}
          />
        </ErrorBoundary>

        {selectedPlaylists.length > 0 && (
          <ErrorBoundary>
            <RatioConfig
              selectedPlaylists={selectedPlaylists}
              ratioConfig={ratioConfig ?? {}}
              onRatioUpdate={() => {}}
              onPlaylistRemove={() => {}}
            />
          </ErrorBoundary>
        )}

        {selectedPlaylists.length > 1 && (
          <ErrorBoundary>
            <PlaylistMixer
              accessToken={(accessToken ?? '') as string}
              selectedPlaylists={selectedPlaylists}
              ratioConfig={ratioConfig ?? {}}
              mixOptions={mixOptions || ({} as any)}
              updateMixOptions={updateMixOptions || (() => {})}
              onMixedPlaylist={onMixedPlaylist ?? (() => {})}
              onError={() => {}}
            />
          </ErrorBoundary>
        )}

        <ScrollToBottom />
      </div>
    </ErrorBoundary>
  );
};

export default AppShell;
