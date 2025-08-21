import {
  announceToScreenReader,
  getDragDropInstructions,
  createInstructionsElement,
  focusManagement,
  prefersReducedMotion,
  isUsingScreenReader,
  initializeAccessibility,
} from '../accessibility';

describe('accessibility utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // reset any body classes
    document.body.className = '';
    // mock matchMedia if not present
    if (typeof window.matchMedia !== 'function') {
      // @ts-ignore
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
    }
  });

  test('getDragDropInstructions returns instructional string', () => {
    const text = getDragDropInstructions();
    expect(typeof text).toBe('string');
    expect(text.toLowerCase()).toContain('reorder');
  });

  test('createInstructionsElement hides element off-screen', () => {
    const el = createInstructionsElement('Example');
    expect(el.id).toBe('drag-instructions');
    expect(el.textContent).toBe('Example');
    expect(el.style.left).toBe('-10000px');
  });

  test('initializeAccessibility appends instructions once', () => {
    initializeAccessibility();
    initializeAccessibility();
    const els = document.querySelectorAll('#drag-instructions');
    expect(els.length).toBe(1);
  });

  test('announceToScreenReader creates live regions and sets text (async)', async () => {
    announceToScreenReader('Hello world', 'polite');
    const polite = await waitForElement('#sr-live-region-polite', 250);
    expect(polite.getAttribute('aria-live')).toBe('polite');
    await new Promise(r => setTimeout(r, 25));
    expect(polite.textContent).toBe('Hello world');
  });

  test('focusManagement.getFocusableElements returns query results', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button id="a">A</button><button id="b">B</button>`;
    const list = focusManagement.getFocusableElements(container);
    expect(list.length).toBe(2);
  });

  test('focusManagement.moveFocusInContainer cycles focus', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button id="a">A</button><button id="b">B</button>`;
    document.body.appendChild(container);
    (container.querySelector('#a') as HTMLButtonElement).focus();
    focusManagement.moveFocusInContainer(container, 1);
    expect(document.activeElement).toBe(container.querySelector('#b'));
    focusManagement.moveFocusInContainer(container, 1);
    expect(document.activeElement).toBe(container.querySelector('#a'));
  });

  test('prefersReducedMotion returns boolean', () => {
    const value = prefersReducedMotion();
    expect(typeof value).toBe('boolean');
  });

  test('isUsingScreenReader detects body class toggle', () => {
    expect(isUsingScreenReader()).toBe(false);
    document.body.classList.add('screen-reader-mode');
    expect(isUsingScreenReader()).toBe(true);
  });
});

function waitForElement(selector: string, timeout = 100): Promise<HTMLElement> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return resolve(el);
      if (Date.now() - start > timeout)
        return reject(new Error('Timeout waiting for ' + selector));
      setTimeout(check, 5);
    };
    check();
  });
}
