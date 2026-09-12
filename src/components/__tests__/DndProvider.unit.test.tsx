import React from 'react';
import { render, screen } from '@testing-library/react';

import DndProvider from '../DndProvider';

// Spy on the real haptics helper so we can assert that vibrate gets called.
// Use require here so we can create the spy before the component is imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as haptics from '../../utils/haptics';

// Mock the hook used by DndProvider to provide predictable sensors
vi.mock('../../hooks/useDragSensors', () => ({
  useDragSensors: () => [],
}));
const vibrateSpy = vi.spyOn(haptics, 'vibrate').mockImplementation(() => {});
// Provide a minimal explicit mock for @dnd-kit/core so useDndMonitor is deterministic
vi.mock('@dnd-kit/core', () => {
  return {
    DndContext: ({ children }: any) => (
      <div data-testid="dnd-context">{children}</div>
    ),
    useDndMonitor: vi.fn().mockImplementation((cfg: any) => {
      // intentionally do not persist cfg here; tests can inspect the mock.calls
      // Simulate an immediate drag start to exercise the haptics callback
      try {
        if (cfg && typeof cfg.onDragStart === 'function') {
          cfg.onDragStart({} as any);
        }
      } catch (e) {
        // ignore
      }
      return undefined;
    }),
  };
});

describe('DndProvider', () => {
  it('renders DndContext and mounts HapticsMonitor without crashing', () => {
    render(
      <DndProvider>
        <div>child</div>
      </DndProvider>
    );

    expect(screen.getByTestId('dnd-context')).toBeDefined();
  });

  it('calls vibrate on drag start via HapticsMonitor', async () => {
    render(
      <DndProvider>
        <div>child</div>
      </DndProvider>
    );

    // Retrieve the mocked core to inspect useDndMonitor calls
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = await import('@dnd-kit/core');
    expect(core.useDndMonitor).toHaveBeenCalled();

    // Extract the config object passed to useDndMonitor and invoke onDragStart
    const cfg = vi.mocked(core.useDndMonitor).mock.calls[0][0];
    if (cfg && typeof cfg.onDragStart === 'function') {
      cfg.onDragStart({} as any);
    }

    // Assert vibrate was called on the haptics helper (use the spy created above)
    expect(vibrateSpy).toHaveBeenCalled();
  });
});
