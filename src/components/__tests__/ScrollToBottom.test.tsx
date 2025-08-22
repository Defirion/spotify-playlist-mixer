import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ScrollToBottom from '../ScrollToBottom';

describe('ScrollToBottom', () => {
  const originalInnerHeight = window.innerHeight;
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    document.documentElement,
    'scrollHeight'
  );
  const originalVisualViewport = (window as any).visualViewport;

  beforeEach(() => {
    // reset document height and scroll
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 800,
      configurable: true,
    });
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    // restore
    if (originalScrollHeight)
      Object.defineProperty(
        document.documentElement,
        'scrollHeight',
        originalScrollHeight
      );
    (window.scrollTo as any).mockRestore?.();
    // restore innerHeight
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      configurable: true,
    });
    // restore visualViewport
    if (originalVisualViewport !== undefined) {
      (window as any).visualViewport = originalVisualViewport;
    } else {
      try {
        delete (window as any).visualViewport;
      } catch (e) {
        (window as any).visualViewport = undefined;
      }
    }
  });

  it('does not render when contentBelowFold <= 100', () => {
    // document height 800, window innerHeight set so contentBelowFold = 50
    Object.defineProperty(window, 'innerHeight', {
      value: 700,
      configurable: true,
    });
    window.pageYOffset = 50;

    render(<ScrollToBottom />);
    expect(
      screen.queryByRole('button', { name: /Scroll to see new content/i })
    ).not.toBeInTheDocument();
  });

  it('renders when contentBelowFold > 100 and scrolls on click', async () => {
    // Make document height larger to have content below fold
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 600,
      configurable: true,
    });
    window.pageYOffset = 100;

    render(<ScrollToBottom />);
    const btn = await screen.findByTitle('Scroll to see new content');
    expect(btn).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(btn);
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('adjusts bottom style when visualViewport indicates keyboard height', async () => {
    // Simulate a visualViewport with reduced height
    // Provide a fake visualViewport on window
    (window as any).visualViewport = {
      height: 300,
      offsetTop: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    window.pageYOffset = 100;

    render(<ScrollToBottom />);
    render(<ScrollToBottom />);
    // fire a resize event so updateForKeyboard runs (component listens on window resize)
    window.dispatchEvent(new Event('resize'));
    const all = screen.getAllByTitle('Scroll to see new content');
    const btn = all[all.length - 1];
    // Since visualViewport reduced innerHeight, component should set bottom inline style
    await waitFor(() => expect(btn.style.bottom).not.toBe(''));
  });

  it('uses fallback keyboard detection when visualViewport is not available', async () => {
    // ensure no visualViewport
    try {
      delete (window as any).visualViewport;
    } catch (e) {
      (window as any).visualViewport = undefined;
    }

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    // initial innerHeight - set a large value so prevInnerHeight initializes
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });
    window.pageYOffset = 50;

    render(<ScrollToBottom />);

    // simulate keyboard by shrinking innerHeight by more than 100px
    Object.defineProperty(window, 'innerHeight', {
      value: 750,
      configurable: true,
    });
    // dispatch resize so updateForKeyboard runs
    window.dispatchEvent(new Event('resize'));

    const btn = await screen.findByTitle('Scroll to see new content');
    // bottom style should be set (not empty) due to fallback keyboard detection
    await waitFor(() => expect(btn.style.bottom).not.toBe(''));
  });

  it('calls window.scrollTo with expected args when clicked', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2500,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 600,
      configurable: true,
    });
    window.pageYOffset = 100;

    render(<ScrollToBottom />);
    const btn = await screen.findByTitle('Scroll to see new content');

    const user = userEvent.setup();
    await user.click(btn);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 2500,
      behavior: 'smooth',
    });
  });
});
