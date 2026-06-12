import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import { useCustomTouchEvents } from '../../hooks/useCustomTouchEvents';

function Harness({ onOver, onDrop }: any) {
  const ref = useRef<HTMLDivElement>(null);
  useCustomTouchEvents({
    containerRef: ref,
    onTouchDragOver: onOver,
    onTouchDrop: onDrop,
  });
  return <div data-testid="container" ref={ref} />;
}

describe('useCustomTouchEvents', () => {
  let spyWarn: import('vitest').MockInstance | undefined;
  let spyLog: import('vitest').MockInstance | undefined;

  beforeEach(() => {
    spyWarn = undefined;
    spyLog = undefined;
  });

  afterEach(() => {
    spyWarn?.mockRestore?.();
    spyLog?.mockRestore?.();
    vi.restoreAllMocks();
  });

  test('calls onTouchDragOver when externalDragOver dispatched', () => {
    const onOver = vi.fn();
    render(<Harness onOver={onOver} onDrop={() => {}} />);
    const container = screen.getByTestId('container');

    const event = new CustomEvent('externalDragOver', {
      detail: { clientX: 10, clientY: 20, draggedItem: { type: 'track' } },
    });

    container.dispatchEvent(event);
    expect(onOver).toHaveBeenCalledWith(event.detail);
  });

  test('calls onTouchDrop and warns when draggedItem missing', () => {
    const onDrop = vi.fn();
    render(<Harness onOver={() => {}} onDrop={onDrop} />);
    const container = screen.getByTestId('container');

    spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Event without draggedItem should trigger the warning branch and not call onDrop
    const eventNoItem = new CustomEvent('internalDrop', {
      detail: { clientX: 0, clientY: 0 },
    });
    container.dispatchEvent(eventNoItem);
    expect(spyWarn).toHaveBeenCalled();

    // Event with draggedItem should call onDrop
    const eventWithItem = new CustomEvent('internalDrop', {
      detail: { clientX: 1, clientY: 2, draggedItem: { type: 'track' } },
    });

    container.dispatchEvent(eventWithItem);
    expect(onDrop).toHaveBeenCalledWith(eventWithItem.detail);

    spyWarn.mockRestore();
  });

  test('handles null container ref gracefully', () => {
    const NullRefHarness = () => {
      const nullRef = { current: null };
      useCustomTouchEvents({
        containerRef: nullRef,
        onTouchDragOver: vi.fn(),
        onTouchDrop: vi.fn(),
      });
      return <div data-testid="null-container" />;
    };

    // Should not throw when container ref is null
    expect(() => {
      render(<NullRefHarness />);
    }).not.toThrow();
  });

  test('logs debug information in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const onOver = vi.fn();
      const onDrop = vi.fn();
      render(<Harness onOver={onOver} onDrop={onDrop} />);
      const container = screen.getByTestId('container');

      // Test drag over logging
      const dragEvent = new CustomEvent('externalDragOver', {
        detail: { clientX: 10, clientY: 20, draggedItem: { type: 'track' } },
      });
      container.dispatchEvent(dragEvent);

      expect(spyLog).toHaveBeenCalledWith(
        '[CustomTouchEvents] Touch drag over:',
        expect.objectContaining({
          clientY: 20,
          draggedItem: 'track',
          eventType: 'externalDragOver',
        })
      );

      // Test drop logging
      const dropEvent = new CustomEvent('internalDrop', {
        detail: { clientX: 30, clientY: 40, draggedItem: { type: 'playlist' } },
      });
      container.dispatchEvent(dropEvent);

      expect(spyLog).toHaveBeenCalledWith(
        '[CustomTouchEvents] Touch drop event received:',
        expect.objectContaining({
          clientY: 40,
          draggedItem: 'playlist',
        })
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      // actual restore happens in afterEach
    }
  });
});
