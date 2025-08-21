import {
  announceToScreenReader,
  createInstructionsElement,
  getDragDropInstructions,
  initializeAccessibility,
  focusManagement,
  prefersReducedMotion,
  isUsingScreenReader,
} from '../accessibility';

describe('accessibility utilities', () => {
  beforeEach(() => {
    // Ensure clean DOM for each test
    document.body.innerHTML = '';
  });

  it('createInstructionsElement returns an element with expected content', () => {
    const el = createInstructionsElement('Test instructions');
    expect(el.id).toBe('drag-instructions');
    expect(el.textContent).toBe('Test instructions');
  });

  it('initializeAccessibility creates live regions and instructions', () => {
    initializeAccessibility();
    const polite = document.getElementById('sr-live-region-polite');
    const assertive = document.getElementById('sr-live-region-assertive');
    const instructions = document.getElementById('drag-instructions');

    expect(polite).toBeTruthy();
    expect(assertive).toBeTruthy();
    expect(instructions).toBeTruthy();
  });

  it('announceToScreenReader sets region text after a small delay', () => {
    jest.useFakeTimers();
    initializeAccessibility();
    announceToScreenReader('Hello world', 'polite');
    const polite = document.getElementById(
      'sr-live-region-polite'
    ) as HTMLElement;
    // initially cleared
    expect(polite.textContent).toBe('');
    jest.advanceTimersByTime(20);
    expect(polite.textContent).toBe('Hello world');
    jest.useRealTimers();
  });

  it('re-initializes live region if DOM nodes were removed', () => {
    initializeAccessibility();
    const polite1 = document.getElementById('sr-live-region-polite');
    expect(polite1).toBeTruthy();
    // remove the nodes to simulate DOM reset
    polite1?.remove();
    const assertive1 = document.getElementById('sr-live-region-assertive');
    assertive1?.remove();

    // call initialize again and expect nodes recreated
    initializeAccessibility();
    const polite2 = document.getElementById('sr-live-region-polite');
    const assertive2 = document.getElementById('sr-live-region-assertive');
    expect(polite2).toBeTruthy();
    expect(assertive2).toBeTruthy();
    // ensure new nodes are not the same references
    expect(polite2).not.toBe(polite1);
  });

  it('focusManagement.getFocusableElements returns elements and trapFocus cycles focus', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    btn1.textContent = 'One';
    btn2.textContent = 'Two';
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const elems = focusManagement.getFocusableElements(container);
    expect(elems.length).toBeGreaterThanOrEqual(2);

    // set focus to first and simulate Shift+Tab to move to last
    btn1.focus();
    const evt = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    // spy on preventDefault
    const pdSpy = jest.spyOn(evt, 'preventDefault');
    focusManagement.trapFocus(evt as any, container);
    // after trapping, focus should be on last element
    expect(pdSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn2);
  });

  it('moveFocusInContainer moves focus forward and wraps', () => {
    const container = document.createElement('div');
    const a = document.createElement('button');
    const b = document.createElement('button');
    const c = document.createElement('button');
    container.appendChild(a);
    container.appendChild(b);
    container.appendChild(c);
    document.body.appendChild(container);

    a.focus();
    focusManagement.moveFocusInContainer(container, 1);
    expect(document.activeElement).toBe(b);

    // move past end wraps to first
    focusManagement.moveFocusInContainer(container, 2);
    expect(document.activeElement).toBe(a);
  });

  it('prefersReducedMotion returns false when matchMedia missing and true when matches', () => {
    // no matchMedia
    // @ts-ignore
    delete (window as any).matchMedia;
    expect(prefersReducedMotion()).toBe(false);

    // provide matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('isUsingScreenReader detects based on userAgent, speechSynthesis and body class', () => {
    // default false
    // @ts-ignore
    Object.defineProperty(window, 'navigator', {
      configurable: true,
      value: { userAgent: 'Mozilla' },
    });
    document.body.classList.remove('screen-reader-mode');
    // @ts-ignore
    (window as any).speechSynthesis = { speaking: false };
    expect(isUsingScreenReader()).toBe(false);

    // userAgent contains NVDA
    // @ts-ignore
    Object.defineProperty(window, 'navigator', {
      configurable: true,
      value: { userAgent: 'NVDA' },
    });
    expect(isUsingScreenReader()).toBe(true);

    // reset and test speechSynthesis
    Object.defineProperty(window, 'navigator', {
      configurable: true,
      value: { userAgent: 'Mozilla' },
    });
    (window as any).speechSynthesis = { speaking: true };
    expect(isUsingScreenReader()).toBe(true);

    // body class
    (window as any).speechSynthesis = { speaking: false };
    document.body.classList.add('screen-reader-mode');
    expect(isUsingScreenReader()).toBe(true);
  });

  it('getDragDropInstructions returns a non-empty string', () => {
    const s = getDragDropInstructions();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(10);
  });
});
