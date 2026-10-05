import React from 'react';
import SpotifyAuth from './components/SpotifyAuth';
import PlaylistSelector from './components/PlaylistSelector';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PresetTemplates from './components/PresetTemplates';
import ToastError from './components/ToastError';
import SuccessToast from './components/SuccessToast';
import SpotifyDiagnostics from './components/SpotifyDiagnostics';
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
  onRatioUpdate?: (playlistId: string, config: any) => void;
  onPlaylistRemove?: (playlistId: string) => void;
  // callback hooks
  onAuth?: (token: string) => void;
  onRefreshSpotifyConnection?: () => Promise<void>;
  onPlaylistSelect?: (p: any) => void;
  onClearAll?: () => void;
  onApplyPreset?: (p: any) => void;
  onDismissError?: () => void;
  onDismissSuccess?: (id: string) => void;
  onMixedPlaylist?: (playlist: any) => void;
  onError?: (error: unknown) => void;
};

const AppShell: React.FC<AppShellProps> = ({
  isAuthenticated,
  accessToken,
  selectedPlaylists,
  ratioConfig,
  error,
  mixedPlaylists,
  onAuth,
  onRefreshSpotifyConnection,
  onPlaylistSelect,
  onClearAll,
  onApplyPreset,
  onDismissError,
  onDismissSuccess,
  onMixedPlaylist,
  onError,
  onRatioUpdate,
  onPlaylistRemove,
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
        </div>

        {accessToken && (
          <SpotifyDiagnostics
            accessToken={accessToken}
            onRefreshConnection={onRefreshSpotifyConnection}
          />
        )}

        <ToastError error={error} onDismiss={onDismissError ?? (() => {})} />

        <SuccessToast
          mixedPlaylists={mixedPlaylists ?? null}
          onDismiss={onDismissSuccess || (() => {})}
        />

        <ErrorBoundary>
          <PlaylistSelector
            accessToken={accessToken ?? null}
            selectedPlaylists={selectedPlaylists}
            onPlaylistSelect={onPlaylistSelect ?? (() => {})}
            onClearAll={onClearAll ?? (() => {})}
            onError={onError ?? (() => {})}
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
              onRatioUpdate={onRatioUpdate ?? (() => {})}
              onPlaylistRemove={onPlaylistRemove ?? (() => {})}
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
              onRatioUpdate={onRatioUpdate}
              onMixedPlaylist={onMixedPlaylist ?? (() => {})}
              onError={onError ?? (() => {})}
            />
          </ErrorBoundary>
        )}

        <ScrollToBottom />
      </div>
    </ErrorBoundary>
  );
};

export default AppShell;
