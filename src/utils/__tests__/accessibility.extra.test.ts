import {
  announceToScreenReader,
  initializeAccessibility,
  focusManagement,
  prefersReducedMotion,
  getDragDropInstructions,
} from '../accessibility';

describe('accessibility extra behaviors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('initializeAccessibility is idempotent when regions already attached', () => {
    initializeAccessibility();
    const politeNodes1 = document.querySelectorAll('#sr-live-region-polite');
    expect(politeNodes1.length).toBe(1);

    // calling again should not create duplicates
    initializeAccessibility();
    const politeNodes2 = document.querySelectorAll('#sr-live-region-polite');
    expect(politeNodes2.length).toBe(1);
  });

  test('announceToScreenReader ignores empty message and does not clear region', () => {
    initializeAccessibility();
    const polite = document.getElementById(
      'sr-live-region-polite'
    ) as HTMLElement;
    polite.textContent = 'keep';
    announceToScreenReader('', 'polite');
    // should return immediately and not clear
    expect(polite.textContent).toBe('keep');
  });

  test('prefersReducedMotion returns false if matchMedia throws', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => {
        throw new Error('nope');
      },
    });

    expect(prefersReducedMotion()).toBe(false);
  });

  test('trapFocus falls back to no-options focus when focus(options) throws', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    container.appendChild(first);
    container.appendChild(last);
    document.body.appendChild(container);

    // ensure first is active
    first.focus();

    // make last.focus throw when called with options, succeed with no-arg
    const originalLastFocus = last.focus.bind(last);
    // @ts-ignore
    last.focus = function (arg?: any) {
      if (arg && typeof arg === 'object') {
        throw new Error('options-throw');
      }
      return originalLastFocus();
    };

    const evt = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const pdSpy = vi.spyOn(evt, 'preventDefault');

    focusManagement.trapFocus(evt as any, container);

    expect(pdSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });

  test('moveFocusInContainer falls back when focus(options) throws and wraps correctly', () => {
    const container = document.createElement('div');
    const a = document.createElement('button');
    const b = document.createElement('button');
    const c = document.createElement('button');
    container.appendChild(a);
    container.appendChild(b);
    container.appendChild(c);
    document.body.appendChild(container);

    // set active element to b
    b.focus();

    // make c.focus throw when called with options and succeed with no-arg
    const origC = c.focus.bind(c);
    // @ts-ignore
    c.focus = function (arg?: any) {
      if (arg && typeof arg === 'object') throw new Error('boom');
      return origC();
    };

    // move forward 1 -> should try to focus c and succeed via fallback
    focusManagement.moveFocusInContainer(container, 1);
    expect(document.activeElement).toBe(c);

    // set active to an element not in container and ensure move focuses first element
    const outside = document.createElement('button');
    outside.focus();
    focusManagement.moveFocusInContainer(container, 1);
    expect(document.activeElement).toBe(a);
  });

  test('getDragDropInstructions returns stable instruction text', () => {
    const s = getDragDropInstructions();
    expect(typeof s).toBe('string');
    expect(s.toLowerCase()).toContain('press');
  });
});
