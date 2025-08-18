import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMixWarnings } from '../useMixWarnings';

function Harness() {
  const emptyPlaylists: any[] = [];
  const ratioConfig = {} as any;
  const mixOptions = {
    useTimeLimit: false,
    targetDuration: 0,
    useAllSongs: false,
    totalSongs: 0,
    continueWhenPlaylistEmpty: false,
  } as any;

  useMixWarnings(emptyPlaylists, ratioConfig, mixOptions);
  return <div data-testid="harness">ok</div>;
}

test('useMixWarnings mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness')).toBeTruthy();
});
