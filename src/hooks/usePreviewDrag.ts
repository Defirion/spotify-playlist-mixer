import { useEffect, useRef } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { MixedTrack } from '../types';
import { getTrackDragId } from '../utils/trackUtils';

export default function usePreviewDrag(
  getTracks: () => MixedTrack[],
  update: (tracks: MixedTrack[]) => void
) {
  const optimistic = useRef<MixedTrack | null>(null);
  const scrollingElement = () =>
    document.scrollingElement || document.documentElement;
  useEffect(
    () => () => {
      scrollingElement().classList.remove('dnd-dragging');
    },
    []
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    scrollingElement().classList.add('dnd-dragging');
    const data = active.data.current;
    if (data?.context === 'modal' && data.track) {
      optimistic.current = {
        ...data.track,
        sourcePlaylist: data.track.sourcePlaylist || 'unknown',
        instanceId: data.track.instanceId || active.id,
      };
      update([...getTracks(), optimistic.current!]);
    }
  };
  const onDragCancel = () => {
    scrollingElement().classList.remove('dnd-dragging');
    if (optimistic.current) {
      const id = getTrackDragId(optimistic.current);
      update(getTracks().filter(track => getTrackDragId(track) !== id));
      optimistic.current = null;
    }
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    scrollingElement().classList.remove('dnd-dragging');
    if (!over) {
      onDragCancel();
      return;
    }
    const tracks = getTracks();
    const external = active.data.current?.context === 'modal';
    const track = active.data.current?.track;
    if (external && (!track || !optimistic.current)) return;
    const id = external ? getTrackDragId(optimistic.current!) : active.id;
    const from = tracks.findIndex(item => getTrackDragId(item) === id);
    const to = tracks.findIndex(item => getTrackDragId(item) === over.id);
    if (process.env.DEBUG_PLAYLIST_MIXER === '1')
      console.log('Preview reorder', { from, to });
    if (from >= 0 && to >= 0 && from !== to)
      update(arrayMove(tracks, from, to));
    if (external) {
      window.dispatchEvent(
        new CustomEvent('trackDraggedToPreview', {
          detail: { trackId: track.id },
        })
      );
      optimistic.current = null;
    }
  };
  return { onDragStart, onDragEnd, onDragCancel };
}
