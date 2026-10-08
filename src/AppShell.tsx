import { ComponentProps } from 'react';
import SpotifyAuth from './components/SpotifyAuth';
import RatioConfig from './components/RatioConfig';
import PlaylistMixer from './components/PlaylistMixer';
import PresetTemplates from './components/PresetTemplates';
import PlaylistPicker from './components/features/mixer/PlaylistPicker';
import ToastError from './components/ToastError';
import SuccessToast from './components/SuccessToast';
import SpotifyDiagnostics from './components/SpotifyDiagnostics';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { DEFAULT_MIX_OPTIONS } from './store/slices/mixingSlice';
import {
  MixOptions,
  RatioConfig as Config,
  RatioConfigItem,
  SpotifyPlaylist,
  PresetApplyData,
} from './types';
import styles from './Console.module.css';
import hardware from './components/ui/Hardware.module.css';

type AppShellProps = {
  isAuthenticated: boolean;
  accessToken?: string | null;
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig?: Config;
  error?: ComponentProps<typeof ToastError>['error'];
  mixedPlaylists?: ComponentProps<typeof SuccessToast>['mixedPlaylists'];
  mixOptions?: MixOptions;
  updateMixOptions?: (updates: Partial<MixOptions>) => void;
  onRatioUpdate?: (playlistId: string, config: RatioConfigItem) => void;
  onPlaylistRemove?: (playlistId: string) => void;
  onAuth?: (token: string) => void;
  onSignOut?: () => void;
  onRefreshSpotifyConnection?: () => Promise<void>;
  onPlaylistSelect?: (playlist: SpotifyPlaylist) => void;
  onClearAll?: () => void;
  onApplyPreset?: (preset: PresetApplyData) => void;
  onDismissError?: () => void;
  onDismissSuccess?: (id: string) => void;
  onMixedPlaylist?: (playlist: SpotifyPlaylist) => void;
  onError?: (error: unknown) => void;
};

const noop = () => {};

export default function AppShell({
  isAuthenticated,
  accessToken,
  selectedPlaylists,
  ratioConfig = {},
  error,
  mixedPlaylists,
  mixOptions = DEFAULT_MIX_OPTIONS,
  updateMixOptions = noop,
  onRatioUpdate = noop,
  onPlaylistRemove,
  onAuth,
  onSignOut,
  onRefreshSpotifyConnection,
  onPlaylistSelect = noop,
  onClearAll = noop,
  onApplyPreset = noop,
  onDismissError = noop,
  onDismissSuccess = noop,
  onMixedPlaylist,
  onError = noop,
}: AppShellProps) {
  return (
    <ErrorBoundary>
      <div className={styles.page}>
        <div className={styles.device}>
          {['tl', 'tr', 'bl', 'br'].map(corner => (
            <i
              key={corner}
              className={`${styles.screw} ${styles[corner]}`}
              aria-hidden="true"
            />
          ))}
          <header className={styles.top}>
            <h1>Playlist Mixer</h1>
            {isAuthenticated && (
              <>
                {onSignOut && (
                  <button
                    className={styles.link}
                    type="button"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                )}
                <div className={styles.sourceActions}>
                  <span
                    className={hardware.lcd}
                    aria-label={`${selectedPlaylists.length} of 10 playlists`}
                  >
                    {selectedPlaylists.length}/10
                  </span>
                  <button
                    className={hardware.hw}
                    type="button"
                    onClick={onClearAll}
                    disabled={!selectedPlaylists.length}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </header>
          <ToastError error={error} onDismiss={onDismissError} />
          <SuccessToast
            mixedPlaylists={mixedPlaylists ?? null}
            onDismiss={onDismissSuccess}
          />
          <main>
            {isAuthenticated ? (
              <PlaylistMixer
                accessToken={accessToken || ''}
                selectedPlaylists={selectedPlaylists}
                ratioConfig={ratioConfig}
                mixOptions={mixOptions}
                updateMixOptions={updateMixOptions}
                onRatioUpdate={onRatioUpdate}
                onMixedPlaylist={onMixedPlaylist}
                onError={onError}
                channels={
                  <ErrorBoundary>
                    <RatioConfig
                      selectedPlaylists={selectedPlaylists}
                      ratioConfig={ratioConfig}
                      onRatioUpdate={onRatioUpdate}
                      onPlaylistRemove={onPlaylistRemove}
                      addPlaylist={
                        <PlaylistPicker
                          accessToken={accessToken || null}
                          selectedPlaylists={selectedPlaylists}
                          onPlaylistSelect={onPlaylistSelect}
                          onError={onError}
                        />
                      }
                    />
                  </ErrorBoundary>
                }
                presets={
                  <PresetTemplates
                    selectedPlaylists={selectedPlaylists}
                    onApplyPreset={onApplyPreset}
                    mixOptions={mixOptions}
                    ratioConfig={ratioConfig}
                  />
                }
              />
            ) : (
              <SpotifyAuth onAuth={onAuth} onError={onError} />
            )}
          </main>
          {isAuthenticated && accessToken && (
            <details className={styles.diagnostics}>
              <summary>Spotify connection</summary>
              <SpotifyDiagnostics
                accessToken={accessToken}
                onRefreshConnection={onRefreshSpotifyConnection}
              />
            </details>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
