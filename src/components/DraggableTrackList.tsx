import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DraggableTrackListProps {
  tracks: string[];
  children: React.ReactNode;
}

function DraggableTrackList({ tracks, children }: DraggableTrackListProps) {
  return (
    <SortableContext items={tracks} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

export default DraggableTrackList;
