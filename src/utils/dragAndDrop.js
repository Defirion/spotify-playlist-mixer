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
 * Handles the drag start event for modal tracks
 * @param {Event} e - The drag event
 * @param {Object} track - The track being dragged
 * @param {string} trackType - Type of track ('modal-track' or 'search-track')
 * @param {Function} setIsDragging - Function to set dragging state
 * @param {Function} onDragTrack - Optional callback when drag starts
 * @param {Object} dragImageColors - Colors for the drag image { background, border }
 */
export const handleModalDragStart = (e, track, trackType, setIsDragging, onDragTrack, dragImageColors) => {
  setIsDragging(true);
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: trackType,
    track: track
  }));
  
  // Create a custom drag image
  const dragElement = createDragImage(
    e.currentTarget, 
    dragImageColors.background, 
    dragImageColors.border
  );
  
  e.dataTransfer.setDragImage(dragElement, 200, 30);
  
  // Clean up the drag image after a short delay
  setTimeout(() => {
    if (document.body.contains(dragElement)) {
      document.body.removeChild(dragElement);
    }
  }, 100);
  
  if (onDragTrack) {
    onDragTrack(track);
  }
};

/**
 * Handles the drag end event for modal tracks
 * @param {Function} setIsDragging - Function to set dragging state
 * @param {Function} onClose - Function to close the modal
 */
export const handleModalDragEnd = (setIsDragging, onClose) => {
  setIsDragging(false);
  onClose();
};

/**
 * Common track selection logic
 * @param {Object} track - The track to toggle
 * @param {Set} selectedTracks - Current set of selected track IDs
 * @param {Function} setSelectedTracks - Function to update selected tracks
 */
export const handleTrackSelection = (track, selectedTracks, setSelectedTracks) => {
  const newSelected = new Set(selectedTracks);
  if (newSelected.has(track.id)) {
    newSelected.delete(track.id);
  } else {
    newSelected.add(track.id);
  }
  setSelectedTracks(newSelected);
};

/**
 * Common backdrop click handler
 * @param {Event} e - The click event
 * @param {Function} onClose - Function to close the modal
 */
export const handleBackdropClick = (e, onClose) => {
  if (e.target === e.currentTarget) {
    onClose();
  }
};

/**
 * Common track quadrant calculation based on popularity
 * @param {Object} track - The track object
 * @returns {string|null} - The quadrant name or null
 */
export const getTrackQuadrant = (track) => {
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
export const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get popularity icon based on quadrant
 * @param {string} quadrant - The popularity quadrant
 * @returns {string} - The icon emoji
 */
export const getPopularityIcon = (quadrant) => {
  switch (quadrant) {
    case 'topHits': return '🔥';
    case 'popular': return '⭐';
    case 'moderate': return '📻';
    case 'deepCuts': return '💎';
    default: return '';
  }
};

/**
 * Get popularity display text and styling
 * @param {string} quadrant - The popularity quadrant
 * @param {number} popularity - The popularity score
 * @returns {Object} - Object with text, background, and color properties
 */
export const getPopularityStyle = (quadrant, popularity) => {
  const styles = {
    topHits: {
      text: `🔥 ${popularity}`,
      background: 'rgba(255, 87, 34, 0.2)',
      color: '#FF5722'
    },
    popular: {
      text: `⭐ ${popularity}`,
      background: 'rgba(255, 193, 7, 0.2)',
      color: '#FF8F00'
    },
    moderate: {
      text: `📻 ${popularity}`,
      background: 'rgba(0, 188, 212, 0.2)',
      color: '#00BCD4'
    },
    deepCuts: {
      text: `💎 ${popularity}`,
      background: 'rgba(233, 30, 99, 0.2)',
      color: '#E91E63'
    }
  };
  
  return styles[quadrant] || { text: '', background: 'transparent', color: 'inherit' };
};