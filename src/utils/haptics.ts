export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (isVibrationSupported()) {
      // debug: log vibration calls to help trace unexpected/delayed haptics
      try {
        // eslint-disable-next-line no-console
        const hr =
          typeof performance !== 'undefined' &&
          typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
        console.debug('[haptics] vibrate called', {
          pattern,
          time: new Date().toISOString(),
          hr,
        });
      } catch (e) {
        // ignore logging errors
      }
      (navigator as any).vibrate(pattern);
    }
  } catch (e) {
    // swallow vibration errors
  }
}
