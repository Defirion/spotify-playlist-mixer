import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PlaylistForm from '../PlaylistForm';

test('a 60-minute input crosses the options boundary as 3600 seconds', () => {
  const onMixOptionsChange = vi.fn();
  render(
    <PlaylistForm
      selectedPlaylists={[]}
      onMixOptionsChange={onMixOptionsChange}
      mixOptions={{
        totalSongs: 100,
        targetDurationSeconds: 1800,
        useTimeLimit: true,
        useAllSongs: false,
        playlistName: 'Test',
        shuffleTracks: false,
        continueWhenPlaylistEmpty: true,
      }}
    />
  );
  const duration = screen.getByRole('spinbutton');
  expect(duration).toHaveValue(30);
  fireEvent.change(duration, { target: { value: '60' } });
  expect(onMixOptionsChange).toHaveBeenCalledWith({
    targetDurationSeconds: 3600,
  });
});
