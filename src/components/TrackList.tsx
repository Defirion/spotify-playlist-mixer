import React from 'react';
import { SpotifyTrack } from '../types/spotify';
import SortableWrapper from './SortableWrapper';
import TrackItem from './ui/TrackItem';
import DraggableTrackList from './DraggableTrackList';

function TrackList({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <div className="track-list">
      {tracks.map(track => (
        <SortableWrapper key={track.id} id={track.id}>
          <TrackItem track={track} />
        </SortableWrapper>
      ))}
    </div>
  );
}

function TrackListContainer({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <DraggableTrackList tracks={tracks.map(t => t.id)}>
      <TrackList tracks={tracks} />
    </DraggableTrackList>
  );
}

export default TrackList;
export { TrackListContainer };
