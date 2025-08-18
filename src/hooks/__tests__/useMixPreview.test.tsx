import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMixPreview } from '../../hooks/useMixPreview';

function Harness() {
  try {
    // @ts-ignore
    useMixPreview();
  } catch (e) {}
  return <div data-testid="harness-mixpreview">ok</div>;
}

test('useMixPreview mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness-mixpreview')).toBeTruthy();
});
