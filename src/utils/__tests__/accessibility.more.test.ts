// Tests that exercise module-level initialization paths and assertive announcements
export {};

beforeEach(() => {
  // reset DOM and module cache between tests
  document.body.innerHTML = '';
  // default to complete unless a test overrides
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: 'complete',
  });
});

test('module auto-initializes immediately when document.readyState is complete', async () => {
  vi.resetModules();
  // ensure readyState complete
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: 'complete',
  });

  // require the module fresh so auto-init runs
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await import('../accessibility');

  // initialization should have appended nodes
  expect(document.getElementById('sr-live-region-polite')).toBeTruthy();
  expect(document.getElementById('sr-live-region-assertive')).toBeTruthy();
  expect(document.getElementById('drag-instructions')).toBeTruthy();
});

test('module attaches DOMContentLoaded listener when readyState loading and handles event', async () => {
  vi.resetModules();
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: 'loading',
  });

  // require the module fresh to let it attach the listener
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await import('../accessibility');

  // nodes should not exist yet
  expect(document.getElementById('sr-live-region-polite')).toBeFalsy();

  // dispatch DOMContentLoaded which should trigger initialization
  const evt = new Event('DOMContentLoaded');
  document.dispatchEvent(evt);

  expect(document.getElementById('sr-live-region-polite')).toBeTruthy();
  expect(document.getElementById('drag-instructions')).toBeTruthy();
});

test('announceToScreenReader with assertive priority updates assertive region after timeout', async () => {
  vi.useFakeTimers();
  // import module normally and initialize
  vi.resetModules();
  const { initializeAccessibility, announceToScreenReader } =
    await import('../accessibility');
  initializeAccessibility();

  const assertive = document.getElementById(
    'sr-live-region-assertive'
  ) as HTMLElement;
  expect(assertive).toBeTruthy();

  // set some existing text
  assertive.textContent = 'old';
  announceToScreenReader('urgent', 'assertive');

  // immediate clear occurs
  expect(assertive.textContent).toBe('');

  // advance timers to when message should be applied
  vi.advanceTimersByTime(20);
  expect(assertive.textContent).toBe('urgent');
  vi.useRealTimers();
});
