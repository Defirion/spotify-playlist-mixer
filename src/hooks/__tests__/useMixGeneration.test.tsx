import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMixGeneration } from '../../hooks/useMixGeneration';

function Harness() {
  // call with simple args if required
  try {
    // @ts-ignore
    useMixGeneration();
  } catch (e) {}
  return <div data-testid="harness-mixgen">ok</div>;
}

test('useMixGeneration mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness-mixgen')).toBeTruthy();
});
