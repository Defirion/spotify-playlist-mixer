// Utility functions for drag and drop functionality across modal components

/**
 * Creates a custom drag image for track dragging
 * @param {HTMLElement} element - The element being dragged
 * @param {string} backgroundColor - Background color for the drag image
 * @param {string} borderColor - Border color for the drag image
 * @returns {HTMLElement} - The drag image element
 */
export const createDragImage = (element, backgroundColor, borderColor) => {
  const dragElement = element.cloneNode(true);
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
 * @param {Object} track - The track to toggle
 * @param {Set} selectedTracks - Current set of selected track IDs
 * @param {Function} setSelectedTracks - Function to update selected tracks
 */
export const handleTrackSelection = (
  track,
  selectedTracks,
  setSelectedTracks
) => {
  const newSelected = new Set(selectedTracks);
  if (newSelected.has(track.id)) {
    newSelected.delete(track.id);
  } else {
    newSelected.add(track.id);
  }
  setSelectedTracks(newSelected);
};

/**
 * Common track quadrant calculation based on popularity
 * @param {Object} track - The track object
 * @returns {string|null} - The quadrant name or null
 */
export const getTrackQuadrant = track => {
  if (track.popularity === undefined) return null;

  if (track.popularity >= 80) return 'topHits';
  if (track.popularity >= 60) return 'popular';
  if (track.popularity >= 40) return 'moderate';
  return 'deepCuts';
};

/**
 * Common duration formatting
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = ms => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get popularity icon based on quadrant
 * @param {string} quadrant - The popularity quadrant
 * @returns {string} - The icon emoji
 */
export const getPopularityIcon = quadrant => {
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

/**
 * Get popularity display text and styling
 * @param {string} quadrant - The popularity quadrant
 * @param {number} popularity - The popularity score
 * @returns {Object} - Object with text, background, and color properties
 */
/**
 * @typedef {Object} PopularityStyle
 * @property {string} text - Display text with icon and popularity score
 * @property {string} background - Background color
 * @property {string} color - Text color
 */

/**
 * Get popularity display text and styling
 * @param {string|null} quadrant - The popularity quadrant
 * @param {number} popularity - The popularity score
 * @returns {PopularityStyle|null} - Object with text, background, and color properties
 */
export const getPopularityStyle = (quadrant, popularity) => {
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
 * @param {number|number[]} pattern - Vibration pattern (single number or array)
 */
export const provideHapticFeedback = pattern => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// Legacy touch drag state management utilities removed
// Touch handling is now managed by the useDraggable hook
