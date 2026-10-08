import { ReactNode, useEffect, useRef, useState } from 'react';
import { closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useMixGeneration } from '../hooks/useMixGeneration';
import { useMixPreview } from '../hooks/useMixPreview';
import { useMixWarnings } from '../hooks/useMixWarnings';
import usePreviewDrag from '../hooks/usePreviewDrag';
import DndProvider from './DndProvider';
import MixerPanel, { MixerSettingsProps } from './features/mixer/MixerPanel';
import MixPreview from './features/mixer/MixPreview';
import ExampleOrder from './features/mixer/ExampleOrder';
import ExhaustionWarning from './features/mixer/ExhaustionWarning';
import ErrorBoundary from './ui/ErrorBoundary';
import { SpotifyPlaylist } from '../types';
import styles from './PlaylistMixer.module.css';
import channel from './RatioConfig.module.css';

interface PlaylistMixerProps extends MixerSettingsProps {
  accessToken: string;
  onMixedPlaylist?: (result: SpotifyPlaylist) => void;
  onError?: (error: string) => void;
  channels?: ReactNode;
}

export default function PlaylistMixer({
  accessToken,
  selectedPlaylists,
  ratioConfig,
  mixOptions,
  updateMixOptions,
  onRatioUpdate,
  onMixedPlaylist,
  onError,
  channels,
  presets,
}: PlaylistMixerProps) {
  const mixGeneration = useMixGeneration(accessToken, { onError });
  const mixPreview = useMixPreview(accessToken, { onError });
  const { exceedsLimit, ratioImbalance } = useMixWarnings(
    selectedPlaylists,
    ratioConfig,
    mixOptions
  );
  const [stale, setStale] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const signature = JSON.stringify({
    sources: selectedPlaylists.map(playlist => playlist.id),
    ratioConfig,
    totalSongs: mixOptions.totalSongs,
    targetDurationSeconds: mixOptions.targetDurationSeconds,
    useTimeLimit: mixOptions.useTimeLimit,
    useAllSongs: mixOptions.useAllSongs,
    shuffleTracks: mixOptions.shuffleTracks,
    continueWhenPlaylistEmpty: mixOptions.continueWhenPlaylistEmpty,
  });
  const currentSignature = useRef(signature);
  const previousSignature = useRef(signature);
  const previousSourceCount = useRef(selectedPlaylists.length);
  currentSignature.current = signature;
  const {
    state: { preview, loading: previewLoading },
    clearPreview,
  } = mixPreview;
  const drag = usePreviewDrag(
    mixPreview.getPreviewTracks,
    mixPreview.updateTrackOrder
  );

  useEffect(() => {
    if (signature !== previousSignature.current) {
      if (!selectedPlaylists.length && previousSourceCount.current > 0) {
        clearPreview();
        setStale(false);
      } else if (preview || previewLoading) setStale(true);
      previousSignature.current = signature;
    }
    previousSourceCount.current = selectedPlaylists.length;
  }, [
    signature,
    preview,
    selectedPlaylists.length,
    clearPreview,
    previewLoading,
  ]);

  const generatePreview = async () => {
    const requestedSignature = signature;
    const result = await mixPreview.generatePreview(
      selectedPlaylists,
      ratioConfig,
      mixOptions
    );
    if (result) setStale(requestedSignature !== currentSignature.current);
  };
  const createPlaylist = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const requestedSignature = signature;
      let tracks = mixPreview.getPreviewTracks();
      if (preview && stale) {
        const fresh = await mixPreview.generatePreview(
          selectedPlaylists,
          ratioConfig,
          mixOptions
        );
        if (!fresh || requestedSignature !== currentSignature.current) return;
        tracks = fresh.tracks;
        setStale(false);
      } else if (!preview) {
        tracks = await mixGeneration.generateMix(
          selectedPlaylists,
          ratioConfig,
          mixOptions
        );
        if (requestedSignature !== currentSignature.current) return;
      }
      if (process.env.DEBUG_PLAYLIST_MIXER === '1')
        console.log('Creating preview playlist', { count: tracks.length });
      const result = await mixGeneration.createPlaylist(
        mixOptions.playlistName,
        tracks
      );
      onMixedPlaylist?.(result);
    } catch (error) {
      console.error('Playlist creation error:', error);
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  return (
    <DndProvider
      collisionDetection={closestCenter}
      autoScroll={{
        canScroll: element => element !== document.scrollingElement,
      }}
      {...drag}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className={styles.desk}>
        <div className={styles.left}>
          <div className={channel.trough}>
            {channels}
            <ExampleOrder
              selectedPlaylists={selectedPlaylists}
              ratioConfig={ratioConfig}
              mixOptions={mixOptions}
            />
          </div>
          <ExhaustionWarning
            warning={ratioImbalance}
            mixOptions={mixOptions}
            onMixOptionsChange={updateMixOptions}
            onRatioUpdate={onRatioUpdate}
          />
          {exceedsLimit && (
            <p className={styles.note} role="status">
              Not enough content: {exceedsLimit.requestedFormatted} requested;{' '}
              {exceedsLimit.availableFormatted} available.
            </p>
          )}
        </div>
        <MixerPanel
          selectedPlaylists={selectedPlaylists}
          ratioConfig={ratioConfig}
          mixOptions={mixOptions}
          updateMixOptions={updateMixOptions}
          onRatioUpdate={onRatioUpdate}
          presets={presets}
          songs={preview?.tracks.length || 0}
          duration={preview?.totalDuration || 0}
          hasPreview={!!preview}
          stale={stale}
          loading={creating || mixGeneration.state.loading}
          previewLoading={previewLoading}
          generatePreview={generatePreview}
          createPlaylist={createPlaylist}
        />
      </div>
      <ErrorBoundary>
        <MixPreview
          tracks={preview?.tracks || []}
          stats={preview?.stats || {}}
          totalDuration={preview?.totalDuration || 0}
          loading={previewLoading}
          onTrackOrderChange={mixPreview.updateTrackOrder}
          accessToken={accessToken}
          selectedPlaylists={selectedPlaylists}
          stale={stale}
          hasPreview={!!preview}
        />
      </ErrorBoundary>
    </DndProvider>
  );
}
