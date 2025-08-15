import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDragSensors } from '../hooks/useDragSensors';

interface DraggableTrackListProps {
  tracks: string[];
  onReorder: (activeId: string, overId: string) => void;
  children: React.ReactNode;
}

function DraggableTrackList({
  tracks,
  onReorder,
  children,
}: DraggableTrackListProps) {
  const sensors = useDragSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      onReorder(active.id as string, over!.id as string);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tracks} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export default DraggableTrackList;
