import { announceToScreenReader, focusManagement } from '../accessibility';

describe('accessibility edge-case branches', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  test('announceToScreenReader warns when initialization fails', () => {
    // make appendChild throw so initializeLiveRegion cannot complete and liveRegion remains null
    const appendMock = vi
      .spyOn(document.body, 'appendChild' as any)
      .mockImplementation(() => {
        throw new Error('append failed');
      });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // calling announce should not throw, but should trigger warn
    expect(() => announceToScreenReader('test', 'polite')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to initialize live region for accessibility'
    );

    appendMock.mockRestore();
    warnSpy.mockRestore();
  });

  test('trapFocus handles Tab (not Shift) and falls back when first.focus(options) throws', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    container.appendChild(first);
    container.appendChild(last);
    document.body.appendChild(container);

    // set focus to last
    last.focus();

    // make first.focus throw when called with options to hit the catch branch
    const origFirstFocus = first.focus.bind(first);
    // @ts-ignore
    first.focus = function (arg?: any) {
      if (arg && typeof arg === 'object') throw new Error('boom');
      return origFirstFocus();
    };

    const evt = new KeyboardEvent('keydown', { key: 'Tab' });
    const pdSpy = vi.spyOn(evt, 'preventDefault');

    focusManagement.trapFocus(evt as any, container);

    expect(pdSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  test('moveFocusInContainer with direction -1 wraps to last and falls back when focus(options) throws', () => {
    const container = document.createElement('div');
    const a = document.createElement('button');
    const b = document.createElement('button');
    const c = document.createElement('button');
    container.appendChild(a);
    container.appendChild(b);
    container.appendChild(c);
    document.body.appendChild(container);

    // focus first
    a.focus();

    // make last focus throw when called with options
    const origC = c.focus.bind(c);
    // @ts-ignore
    c.focus = function (arg?: any) {
      if (arg && typeof arg === 'object') throw new Error('no-options');
      return origC();
    };

    // move backward by -1 should wrap to last
    focusManagement.moveFocusInContainer(container, -1);
    expect(document.activeElement).toBe(c);
  });
});
