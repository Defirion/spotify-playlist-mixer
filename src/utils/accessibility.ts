/**
 * Accessibility utilities for screen reader announcements and ARIA management
 */

import { SpotifyTrack } from '../types/spotify';

// Live region interface
interface LiveRegion {
  polite: HTMLElement;
  assertive: HTMLElement;
}

// Create a live region for screen reader announcements
let liveRegion: LiveRegion | null = null;

/**
 * Initialize the live region for screen reader announcements
 */
const initializeLiveRegion = (): void => {
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
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  if (!message || typeof document === 'undefined') {
    return;
  }

  // Initialize live region if not already done
  if (!liveRegion) {
    initializeLiveRegion();
  }

  if (!liveRegion) {
    console.warn('Failed to initialize live region for accessibility');
    return;
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
 */
export const generateTrackAriaLabel = (
  track: SpotifyTrack,
  index: number,
  total: number,
  isDragging: boolean = false,
  isSelected: boolean = false
): string => {
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
 */
export const getDragDropInstructions = (): string => {
  return 'To reorder tracks: press spacebar to select a track, use arrow keys to move it to a new position, then press spacebar again to drop it. Press escape to cancel.';
};

/**
 * Create hidden instructions element for screen readers
 */
export const createInstructionsElement = (
  instructions: string = getDragDropInstructions()
): HTMLElement => {
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
   */
  getFocusableElements: (
    container: HTMLElement | null
  ): NodeListOf<Element> => {
    if (!container) return document.querySelectorAll('');

    return container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="option"]'
    );
  },

  /**
   * Trap focus within a container (for modals)
   */
  trapFocus: (event: KeyboardEvent, container: HTMLElement): void => {
    if (event.key !== 'Tab') return;

    const focusableElements = focusManagement.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

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
   */
  moveFocusInContainer: (
    container: HTMLElement,
    direction: number = 1
  ): void => {
    const focusableElements = Array.from(
      focusManagement.getFocusableElements(container)
    ) as HTMLElement[];
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );
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
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if user is using a screen reader
 */
export const isUsingScreenReader = (): boolean => {
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
export const initializeAccessibility = (): void => {
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
