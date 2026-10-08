import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistForm from '../features/mixer/PlaylistForm';

const makePlaylist = (id: string) => ({
  id,
  name: `P ${id}`,
  images: [],
  tracks: { total: 5 },
  owner: { id: 'u' },
});

const defaultMixOptions = {
  totalSongs: 5,
  targetDurationSeconds: 300,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'My Mix',
  shuffleTracks: true,
  continueWhenPlaylistEmpty: false,
};

describe('PlaylistForm controls', () => {
  it('reports playlist name changes and toggles', () => {
    const onMixOptionsChange = vi.fn();

    render(
      <PlaylistForm
        mixOptions={defaultMixOptions as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1'), makePlaylist('2')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    // change playlist name
    const input = screen.getByPlaceholderText(/mix name/i);
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      playlistName: 'New Name',
    });

    // click Use All Songs toggle
    const useAllBtn = screen.getByRole('button', { name: /^all$/i });
    fireEvent.click(useAllBtn);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      useAllSongs: true,
      useTimeLimit: false,
    });

    // click Set Duration toggle
    const setDurationBtn = screen.getByRole('button', {
      name: /^time$/i,
    });
    fireEvent.click(setDurationBtn);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      useAllSongs: false,
      useTimeLimit: true,
    });
  });
});
