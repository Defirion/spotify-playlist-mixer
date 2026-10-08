import React from 'react';
import {
  useSortable,
  defaultAnimateLayoutChanges,
  AnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortableWrapper.module.css';

interface SortableWrapperProps {
  id: string;
  children: React.ReactNode;
  data?: any;
  handleLabel?: string;
}

// Custom animation function that ensures animations work for both reordering and adding items
const customAnimateLayoutChanges: AnimateLayoutChanges = args => {
  const { isSorting, items, previousItems } = args;

  // Always animate if we're currently sorting (reordering)
  if (isSorting) {
    return defaultAnimateLayoutChanges(args);
  }

  // Always animate if this is a new item (wasn't in previous items)
  const wasInPreviousItems = previousItems.includes(args.id);
  if (!wasInPreviousItems) {
    return true; // Animate new items being added
  }

  // Always animate if items were added/removed (length changed)
  if (items.length !== previousItems.length) {
    return true;
  }

  // Use default behavior for other cases
  return defaultAnimateLayoutChanges(args);
};

function SortableWrapper({
  id,
  children,
  data,
  handleLabel,
}: SortableWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data,
    animateLayoutChanges: customAnimateLayoutChanges,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!handleLabel ? attributes : {})}
      {...(!handleLabel ? listeners : {})}
      className={`sortable-wrapper ${handleLabel ? styles.row : ''}`}
      data-testid="sortable-wrapper"
      data-dragging={isDragging}
    >
      {handleLabel && (
        <button
          type="button"
          className={styles.grip}
          {...attributes}
          {...listeners}
          aria-label={handleLabel}
        >
          ⠿
        </button>
      )}
      {children}
    </div>
  );
}

export default SortableWrapper;
