import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTrackSelection } from '../useTrackSelection';

function Harness() {
  useTrackSelection({ availableTracks: [], onAddTracks: () => {} });
  return <div data-testid="harness">ok</div>;
}

test('useTrackSelection mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness')).toBeTruthy();
});
