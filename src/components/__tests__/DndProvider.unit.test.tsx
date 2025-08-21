import React from 'react';
import { render, screen } from '@testing-library/react';

import DndProvider from '../DndProvider';

// Mock the hook used by DndProvider to provide predictable sensors
jest.mock('../../hooks/useDragSensors', () => ({
  useDragSensors: () => [],
}));

// Spy on the real haptics helper so we can assert that vibrate gets called.
// Use require here so we can create the spy before the component is imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const haptics = require('../../utils/haptics');
const vibrateSpy = jest.spyOn(haptics, 'vibrate').mockImplementation(() => {});
// Provide a minimal explicit mock for @dnd-kit/core so useDndMonitor is deterministic
jest.mock('@dnd-kit/core', () => {
  return {
    DndContext: ({ children }: any) => (
      <div data-testid="dnd-context">{children}</div>
    ),
    useDndMonitor: jest.fn().mockImplementation((cfg: any) => {
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

  it('calls vibrate on drag start via HapticsMonitor', () => {
    render(
      <DndProvider>
        <div>child</div>
      </DndProvider>
    );

    // Retrieve the mocked core to inspect useDndMonitor calls
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('@dnd-kit/core');
    expect(core.useDndMonitor).toHaveBeenCalled();

    // Extract the config object passed to useDndMonitor and invoke onDragStart
    const cfg = core.useDndMonitor.mock.calls[0][0];
    if (cfg && typeof cfg.onDragStart === 'function') {
      cfg.onDragStart({} as any);
    }

    // Assert vibrate was called on the haptics helper (use the spy created above)
    expect(vibrateSpy).toHaveBeenCalled();
  });
});
