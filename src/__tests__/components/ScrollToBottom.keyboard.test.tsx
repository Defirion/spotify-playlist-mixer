import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import ScrollToBottom from '../../components/ScrollToBottom';
import { createVisualViewportMock } from '../../test-utils/mocks/visualViewportMock';
import { mockVisualViewport, restoreVisualViewport } from '../../test-utils/mockVisualViewport';

describe('ScrollToBottom keyboard behavior', () => {
  it('moves above virtual keyboard by setting inline bottom when visualViewport shrinks', async () => {
  // capture real visualViewport for restore later
  const realInnerHeight = window.innerHeight;

    // make page taller than viewport so the arrow will show
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });

  // Mock visualViewport using the centralized helper so tests share the same setup
  const realVV = (window as any).visualViewport;
  const { vv, setHeight } = mockVisualViewport(800, 0);

    render(<ScrollToBottom />);

    const btn = screen.getByTitle('Scroll to see new content');
    expect(btn).toBeInTheDocument();

    // Record initial bottom value (may be empty if not overridden)
    const initialBottom = (btn as HTMLElement).style.bottom || '';

    // Simulate keyboard opening by shrinking visualViewport height
    await act(async () => {
      setHeight(350);
    });

    const newBottom = (btn as HTMLElement).style.bottom;
    // It should set a pixel bottom value and that value should be larger
    // than the initial (or change from empty -> px)
    expect(newBottom).toMatch(/px$/);
    const initialPx = initialBottom ? parseInt(initialBottom, 10) : -1;
    const newPx = parseInt(newBottom, 10);
    expect(newPx).toBeGreaterThan(initialPx);

  // restore
  if (realVV) (window as any).visualViewport = realVV;
  else restoreVisualViewport();
    Object.defineProperty(window, 'innerHeight', {
      value: realInnerHeight,
      configurable: true,
    });
  });
});
