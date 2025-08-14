// Utility functions for drag and drop functionality across modal components

import { SpotifyTrack } from '../types/spotify';

/**
 * Creates a custom drag image for track dragging
 */
export const createDragImage = (
  element: HTMLElement,
  backgroundColor: string,
  borderColor: string
): HTMLElement => {
  const dragElement = element.cloneNode(true) as HTMLElement;
  dragElement.style.width = '400px';
  dragElement.style.opacity = '0.8';
  dragElement.style.transform = 'rotate(2deg)';
  dragElement.style.backgroundColor = backgroundColor;
  dragElement.style.border = `2px solid ${borderColor}`;
  dragElement.style.borderRadius = '8px';
  dragElement.style.position = 'absolute';
  dragElement.style.top = '-1000px';
  document.body.appendChild(dragElement);

  return dragElement;
};

/**
 * Common track selection logic
 */
export const handleTrackSelection = (
  track: SpotifyTrack,
  selectedTracks: Set<string>,
  setSelectedTracks: (tracks: Set<string>) => void
): void => {
  const newSelected = new Set(selectedTracks);
  if (newSelected.has(track.id)) {
    newSelected.delete(track.id);
  } else {
    newSelected.add(track.id);
  }
  setSelectedTracks(newSelected);
};

export type PopularityQuadrant =
  | 'topHits'
  | 'popular'
  | 'moderate'
  | 'deepCuts';

/**
 * Common track quadrant calculation based on popularity
 */
export const getTrackQuadrant = (
  track: SpotifyTrack
): PopularityQuadrant | null => {
  if (track.popularity === undefined) return null;

  if (track.popularity >= 80) return 'topHits';
  if (track.popularity >= 60) return 'popular';
  if (track.popularity >= 40) return 'moderate';
  return 'deepCuts';
};

/**
 * Common duration formatting
 */
export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get popularity icon based on quadrant
 */
export const getPopularityIcon = (quadrant: PopularityQuadrant): string => {
  switch (quadrant) {
    case 'topHits':
      return '🔥';
    case 'popular':
      return '⭐';
    case 'moderate':
      return '📻';
    case 'deepCuts':
      return '💎';
    default:
      return '';
  }
};

export interface PopularityStyle {
  text: string;
  background: string;
  color: string;
}

/**
 * Get popularity display text and styling
 */
export const getPopularityStyle = (
  quadrant: PopularityQuadrant | null,
  popularity: number
): PopularityStyle | null => {
  const styles = {
    topHits: {
      text: `🔥 ${popularity}`,
      background: 'rgba(255, 87, 34, 0.2)',
      color: '#FF5722',
    },
    popular: {
      text: `⭐ ${popularity}`,
      background: 'rgba(255, 193, 7, 0.2)',
      color: '#FF8F00',
    },
    moderate: {
      text: `📻 ${popularity}`,
      background: 'rgba(0, 188, 212, 0.2)',
      color: '#00BCD4',
    },
    deepCuts: {
      text: `💎 ${popularity}`,
      background: 'rgba(233, 30, 99, 0.2)',
      color: '#E91E63',
    },
  };

  if (!quadrant) return null;

  return (
    styles[quadrant] || {
      text: '',
      background: 'transparent',
      color: 'inherit',
    }
  );
};

/**
 * Provides haptic feedback if available
 */
export const provideHapticFeedback = (pattern: number | number[]): void => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// Legacy touch drag state management utilities removed
// Touch handling is now managed by the useDraggable hook
