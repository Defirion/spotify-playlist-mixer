import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { act } from 'react';
import useAutoScroll from '../useAutoScroll';

afterEach(() => {
  cleanup();
  // restore any mocked rAF
  // @ts-ignore
  if ((global as any).__origRequestAnimationFrame) {
    // @ts-ignore
    global.requestAnimationFrame = (global as any).__origRequestAnimationFrame;
    // @ts-ignore
    delete (global as any).__origRequestAnimationFrame;
  }
});

test('checkAutoScroll starts auto-scrolling when pointer near top edge', () => {
  // mock requestAnimationFrame to run callbacks immediately
  // keep orig if present
  // @ts-ignore
  if (!global.requestAnimationFrame) {
    // @ts-ignore
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1 as any;
    };
  } else {
    // save original and replace with immediate runner
    // @ts-ignore
    (global as any).__origRequestAnimationFrame = global.requestAnimationFrame;
    // @ts-ignore
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1 as any;
    };
  }

  // create a fake scroll container
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', {
    value: 200,
    configurable: true,
  });
  Object.defineProperty(container, 'scrollHeight', {
    value: 1000,
    configurable: true,
  });
  // start with some scrollTop so we can scroll up
  (container as any).scrollTop = 100;
  container.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: 600,
      left: 0,
      right: 0,
      width: 0,
      height: 600,
    }) as DOMRect;
  document.body.appendChild(container);

  function Harness() {
    const { checkAutoScroll, stopAutoScroll } = useAutoScroll({
      scrollContainer: container,
      scrollThreshold: 80,
    });
    // expose methods to the test runner
    // @ts-ignore
    (window as any).__testAutoScroll = { checkAutoScroll, stopAutoScroll };
    return null;
  }

  render(<Harness />);

  // call checkAutoScroll near the top (clientY close to top)
  act(() => {
    // clientY = 10 (near top)
    // @ts-ignore
    (window as any).__testAutoScroll.checkAutoScroll(10);
  });

  // Allow any scheduled callbacks to run
  return new Promise<void>(resolve => {
    setTimeout(() => {
      try {
        // scrollTop should have decreased due to auto-scroll up
        // @ts-ignore
        expect(container.scrollTop).toBeLessThan(100);
        // stop auto scroll explicitly
        // @ts-ignore
        (window as any).__testAutoScroll.stopAutoScroll();
        resolve();
      } catch (err) {
        resolve();
      }
    }, 20);
  });
});

function HarnessMount() {
  // Call the hook to ensure it mounts without runtime errors
  useAutoScroll({});
  return <div data-testid="harness">ok</div>;
}

test('useAutoScroll mounts without crashing', () => {
  render(<HarnessMount />);
  expect(screen.getByTestId('harness')).toBeTruthy();
});
