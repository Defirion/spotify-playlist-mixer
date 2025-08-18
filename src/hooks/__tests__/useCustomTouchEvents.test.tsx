import React from 'react';
import { render, screen } from '@testing-library/react';
import { useCustomTouchEvents } from '../../hooks/useCustomTouchEvents';

function Harness() {
  const ref = React.useRef<HTMLDivElement>(null);
  useCustomTouchEvents({ containerRef: ref });
  return (
    <div data-testid="harness-touch" ref={ref}>
      ok
    </div>
  );
}

test('useCustomTouchEvents mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness-touch')).toBeTruthy();
});
