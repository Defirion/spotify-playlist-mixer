import React from 'react';
import { render, screen } from '@testing-library/react';
import { useScrollDebugger } from '../../hooks/useScrollDebugger';

function Harness() {
  const ref = React.useRef<HTMLDivElement>(null);
  useScrollDebugger({ containerRef: ref, tracks: [] });
  return (
    <div data-testid="harness-scroll" ref={ref}>
      ok
    </div>
  );
}

test('useScrollDebugger mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness-scroll')).toBeTruthy();
});
