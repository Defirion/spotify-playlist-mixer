import { createUISlice } from '../uiSlice';

describe('uiSlice actions', () => {
  test('addMixedPlaylist adds a toast and dismissSuccessToast removes it', () => {
    // minimal fake set function that captures state changes
    let state: any = { error: null, mixedPlaylists: [] };
    const set = (fn: any) => {
      state = fn(state);
    };

    const get = () => state;
    const slice = createUISlice(set as any, get as any, {} as any);
    const playlist = { id: 'p1', name: 'P1' } as any;
    slice.addMixedPlaylist(playlist);
    expect(state.mixedPlaylists.length).toBe(1);
    const toastId = state.mixedPlaylists[0].toastId;
    // dismiss the toast
    slice.dismissSuccessToast(toastId);
    expect(state.mixedPlaylists.length).toBe(0);
  });

  test('setError and dismissError behave correctly', () => {
    let state: any = { error: null, mixedPlaylists: [] };
    const set = (fn: any) => {
      state = fn(state);
    };
    const get = () => state;
    const slice = createUISlice(set as any, get as any, {} as any);
    const err = { message: 'boom' } as any;
    slice.setError(err);
    expect(state.error).toBe(err);
    slice.dismissError();
    expect(state.error).toBeNull();
  });
});
