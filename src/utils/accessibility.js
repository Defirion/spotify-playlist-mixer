/**
 * Accessibility utilities for screen reader announcements and ARIA management
 */

// Create a live region for screen reader announcements
let liveRegion = null;

/**
 * Initialize the live region for screen reader announcements
 */
const initializeLiveRegion = () => {
  if (liveRegion || typeof document === 'undefined') {
    return;
  }

  // Create polite live region
  const politeRegion = document.createElement('div');
  politeRegion.id = 'sr-live-region-polite';
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'true');
  politeRegion.style.position = 'absolute';
  politeRegion.style.left = '-10000px';
  politeRegion.style.width = '1px';
  politeRegion.style.height = '1px';
  politeRegion.style.overflow = 'hidden';

  // Create assertive live region
  const assertiveRegion = document.createElement('div');
  assertiveRegion.id = 'sr-live-region-assertive';
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-atomic', 'true');
  assertiveRegion.style.position = 'absolute';
  assertiveRegion.style.left = '-10000px';
  assertiveRegion.style.width = '1px';
  assertiveRegion.style.height = '1px';
  assertiveRegion.style.overflow = 'hidden';

  document.body.appendChild(politeRegion);
  document.body.appendChild(assertiveRegion);

  liveRegion = {
    polite: politeRegion,
    assertive: assertiveRegion,
  };
};

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  if (!message || typeof document === 'undefined') {
    return;
  }

  // Initialize live region if not already done
  if (!liveRegion) {
    initializeLiveRegion();
  }

  const region = liveRegion[priority] || liveRegion.polite;

  // Clear the region first to ensure the message is announced
  region.textContent = '';

  // Use a small delay to ensure screen readers pick up the change
  setTimeout(() => {
    region.textContent = message;
  }, 10);
};

/**
 * Generate ARIA label for drag-and-drop items
 * @param {Object} track - The track object
 * @param {number} index - The item index
 * @param {number} total - Total number of items
 * @param {boolean} isDragging - Whether the item is being dragged
 * @param {boolean} isSelected - Whether the item is selected for dragging
 * @returns {string} ARIA label
 */
export const generateTrackAriaLabel = (
  track,
  index,
  total,
  isDragging = false,
  isSelected = false
) => {
  const trackName = track.name || 'Unknown track';
  const artistName = track.artists?.[0]?.name || 'Unknown artist';
  const position = `${index + 1} of ${total}`;

  let label = `${trackName} by ${artistName}, ${position}`;

  if (isSelected && isDragging) {
    label +=
      ', selected for moving. Use arrow keys to choose new position, spacebar to drop, or escape to cancel.';
  } else if (isDragging) {
    label += ', available drop target';
  } else {
    label += ', press spacebar to select for moving';
  }

  return label;
};

/**
 * Generate ARIA description for drag-and-drop instructions
 * @returns {string} Instructions text
 */
export const getDragDropInstructions = () => {
  return 'To reorder tracks: press spacebar to select a track, use arrow keys to move it to a new position, then press spacebar again to drop it. Press escape to cancel.';
};

/**
 * Create hidden instructions element for screen readers
 * @param {string} instructions - The instructions text
 * @returns {HTMLElement} The instructions element
 */
export const createInstructionsElement = (
  instructions = getDragDropInstructions()
) => {
  const element = document.createElement('div');
  element.id = 'drag-instructions';
  element.textContent = instructions;
  element.style.position = 'absolute';
  element.style.left = '-10000px';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.overflow = 'hidden';

  return element;
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - The container element
   * @returns {NodeList} List of focusable elements
   */
  getFocusableElements: container => {
    if (!container) return [];

    return container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="option"]'
    );
  },

  /**
   * Trap focus within a container (for modals)
   * @param {KeyboardEvent} event - The keyboard event
   * @param {HTMLElement} container - The container element
   */
  trapFocus: (event, container) => {
    if (event.key !== 'Tab') return;

    const focusableElements = focusManagement.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  },

  /**
   * Move focus to the next/previous focusable element
   * @param {HTMLElement} container - The container element
   * @param {number} direction - 1 for next, -1 for previous
   */
  moveFocusInContainer: (container, direction = 1) => {
    const focusableElements = Array.from(
      focusManagement.getFocusableElements(container)
    );
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) {
      nextIndex = focusableElements.length - 1;
    } else if (nextIndex >= focusableElements.length) {
      nextIndex = 0;
    }

    focusableElements[nextIndex]?.focus();
  },
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if user is using a screen reader
 * @returns {boolean} True if screen reader is likely being used
 */
export const isUsingScreenReader = () => {
  if (typeof window === 'undefined') return false;

  // Check for common screen reader indicators
  return (
    window.navigator.userAgent.includes('NVDA') ||
    window.navigator.userAgent.includes('JAWS') ||
    window.speechSynthesis?.speaking ||
    document.body.classList.contains('screen-reader-mode')
  );
};

/**
 * Initialize accessibility features
 */
export const initializeAccessibility = () => {
  initializeLiveRegion();

  // Add drag-drop instructions to the page
  if (
    typeof document !== 'undefined' &&
    !document.getElementById('drag-instructions')
  ) {
    const instructions = createInstructionsElement();
    document.body.appendChild(instructions);
  }
};

// Auto-initialize when module is loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAccessibility);
  } else {
    initializeAccessibility();
  }
}
