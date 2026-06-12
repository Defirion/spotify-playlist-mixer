import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock hooks used by DndProvider
vi.mock('../../hooks/useDragSensors', () => ({
  useDragSensors: () => [],
}));

const mockVibrate = vi.fn();

vi.mock('../../utils/haptics', () => ({
  vibrate: (ms: number) => {
    // call the jest mock via global lookup to avoid referencing out-of-scope var
    return (global as any).mockVibrate?.(ms);
  },
}));
// expose to mock factory
(global as any).mockVibrate = mockVibrate;

// Mock dnd-kit monitor hook so we can trigger onDragStart
vi.mock('@dnd-kit/core', async () => {
  const original = await vi.importActual('@dnd-kit/core');
  return {
    ...original,
    DndContext: ({ children }: any) => <div>{children}</div>,
    useDndMonitor: (opts: any) => {
      // Immediately call onDragStart to simulate event
      if (opts && typeof opts.onDragStart === 'function') {
        opts.onDragStart({});
      }
      return {};
    },
  };
});

describe('DndProvider', () => {
  test('renders children and triggers vibrate on drag start', async () => {
    const DndProvider = (await import('../../components/DndProvider')).default;
    render(
      <DndProvider>
        <div data-testid="child">child</div>
      </DndProvider>
    );

    expect(screen.getByTestId('child')).toBeTruthy();
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });
});
