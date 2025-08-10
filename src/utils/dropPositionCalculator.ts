export interface DropPosition {
  index: number;
  isTopHalf: boolean;
  isFirst: boolean;
  isLast: boolean;
  y: number;
}

/**
 * Calculate the drop position based on mouse/touch coordinates and track elements
 */
export const calculateDropPosition = (
  clientY: number,
  containerElement: HTMLElement,
  tracksLength: number
): DropPosition => {
  // Validate inputs
  if (!containerElement || typeof clientY !== 'number' || isNaN(clientY)) {
    console.warn('[dropPositionCalculator] Invalid inputs:', {
      containerElement: !!containerElement,
      clientY,
      tracksLength,
    });
    return {
      index: 0,
      isTopHalf: true,
      isFirst: true,
      isLast: true,
      y: clientY || 0,
    };
  }

  const trackElements = Array.from(
    containerElement.querySelectorAll('[data-track-index]')
  ) as HTMLElement[];

  // Handle empty list case
  if (trackElements.length === 0) {
    return {
      index: 0,
      isTopHalf: true,
      isFirst: true,
      isLast: true,
      y: clientY,
    };
  }

  // Find the closest track element
  let closestElement: HTMLElement | null = null;
  let closestDistance = Infinity;
  let closestIndex = 0;

  for (const element of trackElements) {
    const rect = element.getBoundingClientRect();
    const elementCenter = rect.top + rect.height / 2;
    const distance = Math.abs(clientY - elementCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestElement = element;
      closestIndex = parseInt(element.getAttribute('data-track-index') || '0');
    }
  }

  if (!closestElement) {
    // Fallback to end of list
    return {
      index: tracksLength,
      isTopHalf: false,
      isFirst: false,
      isLast: true,
      y: clientY,
    };
  }

  const rect = closestElement.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const isTopHalf = clientY < midpoint;

  // Calculate insertion index
  let insertIndex = isTopHalf ? closestIndex : closestIndex + 1;

  // Handle boundary cases
  const isFirst = insertIndex === 0;
  const isLast = insertIndex >= tracksLength;

  // Clamp index to valid range
  insertIndex = Math.max(0, Math.min(insertIndex, tracksLength));

  return {
    index: insertIndex,
    isTopHalf,
    isFirst,
    isLast,
    y: clientY,
  };
};
