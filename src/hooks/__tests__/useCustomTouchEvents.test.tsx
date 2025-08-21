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
  test('calls onTouchDragOver when externalDragOver dispatched', () => {
    const onOver = jest.fn();
    render(<Harness onOver={onOver} onDrop={() => {}} />);
    const container = screen.getByTestId('container');

    const event = new CustomEvent('externalDragOver', {
      detail: { clientX: 10, clientY: 20, draggedItem: { type: 'track' } },
    });

    container.dispatchEvent(event);
    expect(onOver).toHaveBeenCalledWith(event.detail);
  });

  test('calls onTouchDrop and warns when draggedItem missing', () => {
    const onDrop = jest.fn();
    render(<Harness onOver={() => {}} onDrop={onDrop} />);
    const container = screen.getByTestId('container');

    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

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
});
