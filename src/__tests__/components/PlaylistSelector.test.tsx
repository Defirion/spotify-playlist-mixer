import React from 'react';
import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import PlaylistSelector from '../../components/PlaylistSelector';
import * as usePlaylistSearchModule from '../../hooks/usePlaylistSearch';
import * as useSpotifyUrlHandlerModule from '../../hooks/useSpotifyUrlHandler';
import * as normalizeErrorModule from '../../utils/normalizeError';

const mockOnSelect = jest.fn();
const mockOnClearAll = jest.fn();
const mockOnError = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('PlaylistSelector', () => {
  test('shows error when submitting empty input', async () => {
    render(
      <PlaylistSelector
        accessToken={null}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith(
        'Please enter a playlist URL or search term'
      )
    );
  });

  test('switches to url input type when paste looks like spotify link and adds via url handler', async () => {
    // mock hook behaviors
    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    const handleAdd = jest.fn(() => Promise.resolve());

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: (v: string) => v.includes('spotify'),
        isValidPlaylistUrl: (v: string) => v.includes('playlist'),
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(input, {
      target: { value: 'https://open.spotify.com/playlist/abc' },
    });

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeTruthy();
    expect(addButton.getAttribute('disabled')).toBeNull();

    fireEvent.click(addButton);

    await waitFor(() => expect(handleAdd).toHaveBeenCalled());
  });

  test('renders search results and allows clicking a result', async () => {
    const playlist = {
      id: 'p1',
      name: 'P1',
      owner: { display_name: 'me' },
      images: [],
      tracks: { total: 3 },
    };

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const result = screen.getByText('P1');
    fireEvent.click(result);

    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith(playlist));
  });

  test('shows max playlists warning when >=10 playlists selected', async () => {
    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    const selected = Array.from({ length: 10 }).map(
      (_, i) => ({ id: `p${i}` }) as any
    );

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={selected}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/Maximum of 10 playlists reached/i)).toBeTruthy();
  });

  test('displays 0 tracks for playlist without tracks.total and allows Enter on highlighted item', async () => {
    const playlist = {
      id: 'p0',
      name: 'NoTracks',
      owner: { display_name: 'me' },
      images: [],
      tracks: undefined,
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    const handleAdd = jest.fn(() => Promise.resolve());

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    // ensure the UI displays '0 tracks' when tracks.total is missing
    expect(screen.getByText(/0 tracks/i)).toBeTruthy();

    // simulate Enter key when highlighted result exists
    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // the highlighted branch should call handleAddPlaylistByUrl for the result
    await waitFor(() => expect(handleAdd).toHaveBeenCalled());
  });

  test('calls onError with normalized details when searchError is an object', async () => {
    const setQuery = jest.fn();
    const setShowResults = jest.fn();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery,
      results: [],
      loading: false,
      error: { msg: 'boom' },
      showResults: false,
      setShowResults,
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(normalizeErrorModule, 'getDisplayErrorWithLabel')
      .mockReturnValue({ details: 'normalized error' } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith('normalized error')
    );
  });

  test('focus shows results when input has text and inputType is search', async () => {
    const setShowResults = jest.fn();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults,
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(input, { target: { value: 'salsa' } });
    fireEvent.focus(input);

    expect(setShowResults).toHaveBeenCalledWith(true);
  });

  test('calls onError when submitting non-url term with no results', async () => {
    const setShowResults = jest.fn();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults,
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(input, { target: { value: 'some term' } });

    // Click the Search button
    const btn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith(
        'No playlists found for this search term'
      )
    );
  });

  test('calls onError unchanged when searchError is a string', async () => {
    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: 'simple string error',
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith('simple string error')
    );
  });

  test('ArrowDown then ArrowUp then Enter selects the first highlighted result', async () => {
    const p1 = {
      id: 'p1',
      name: 'One',
      owner: { display_name: 'A' },
      images: [],
      tracks: { total: 1 },
    } as any;
    const p2 = {
      id: 'p2',
      name: 'Two',
      owner: { display_name: 'B' },
      images: [],
      tracks: { total: 2 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [p1, p2],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    const handleAdd = jest.fn(() => Promise.resolve());

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    // go back up
    fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(handleAdd).toHaveBeenCalledWith('p1'));
  });

  test('renders Untitled Playlist when name missing and hide results on blur', async () => {
    jest.useFakeTimers();

    const playlist = {
      id: 'u1',
      name: undefined,
      owner: { display_name: 'X' },
      images: [],
      tracks: { total: 2 },
    } as any;

    const setShowResults = jest.fn();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults,
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/Untitled Playlist/)).toBeTruthy();

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.blur(input);

    // advance timers so the delayed setShowResults runs
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(setShowResults).toHaveBeenCalledWith(false);

    jest.useRealTimers();
  });

  test('ArrowDown then Enter selects the highlighted (second) search result', async () => {
    const p1 = {
      id: 'p1',
      name: 'One',
      owner: { display_name: 'A' },
      images: [],
      tracks: { total: 1 },
    } as any;
    const p2 = {
      id: 'p2',
      name: 'Two',
      owner: { display_name: 'B' },
      images: [],
      tracks: { total: 2 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [p1, p2],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    const handleAdd = jest.fn(() => Promise.resolve());

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    // ArrowDown should move highlighted to index 1
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(handleAdd).toHaveBeenCalledWith('p2'));
  });

  test('filters out invalid entries, shows Unknown owner and image/checkmark branches', async () => {
    const bad = null;
    const missingFields = {
      id: 'm1',
      name: '',
      owner: undefined,
      images: [],
      tracks: undefined,
    } as any;
    const withImage = {
      id: 'i1',
      name: 'Img',
      owner: { display_name: 'ImgOwner' },
      images: [{ url: 'http://x' }],
      tracks: { total: 5 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [bad, missingFields, withImage],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[{ id: 'm1' } as any]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    // The bad/null entry shouldn't render; the two valid ids should render
    expect(screen.getByText('Img')).toBeTruthy();
    // missing owner should show 'Unknown'
    expect(screen.getByText(/Unknown/)).toBeTruthy();
    // '0 tracks' for missing tracks
    expect(screen.getByText(/0 tracks/i)).toBeTruthy();
    // checkmark for already selected playlist m1
    expect(screen.getByText('✓')).toBeTruthy();

    // click the image item to trigger select
    const imgItem = screen.getByText('Img');
    fireEvent.click(imgItem);
    await waitFor(() => expect(mockOnSelect).toHaveBeenCalled());
  });

  test('Add button disabled when inputType is url but playlist url invalid', async () => {
    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => true,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(input, {
      target: { value: 'https://open.spotify.com/not-a-playlist' },
    });

    const addButton = screen.getByRole('button');
    expect(addButton.getAttribute('disabled')).not.toBeNull();
  });

  test('clicking a search result refocuses input using fallback when focus with options throws', async () => {
    jest.useFakeTimers();

    const playlist = {
      id: 'pf',
      name: 'FocusMe',
      owner: { display_name: 'me' },
      images: [],
      tracks: { total: 1 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    // Mock focus to throw when called with options, succeed when called without
    const focusMock = jest.fn(function (this: any, ...args: any[]) {
      if (args.length) throw new Error('no options support');
      // no-op
    });
    jest
      .spyOn(HTMLInputElement.prototype, 'focus')
      .mockImplementation(focusMock as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const item = screen.getByText('FocusMe');
    // find the button container for this item using role queries instead of DOM traversal
    const itemButton = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('FocusMe')) as HTMLElement | undefined;
    expect(itemButton).toBeTruthy();
    fireEvent.click(item);

    // Advance timers so the delayed focus runs
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Last call should be the fallback (no args)
    const calls = (focusMock as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1].length).toBe(0);

    (HTMLInputElement.prototype.focus as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  test('URL add shows loading overlay while pending and triggers autofocus via onPlaylistSelect', async () => {
    jest.useFakeTimers();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    // Capture the onPlaylistSelect passed into the hook and call it from the mock add
    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockImplementation((opts: any) => {
        return {
          isValidSpotifyLink: () => true,
          isValidPlaylistUrl: () => true,
          handleAddPlaylistByUrl: (input: string) =>
            new Promise<void>(resolve => {
              // simulate async add, then call the component's onPlaylistSelect callback
              setTimeout(() => {
                try {
                  opts.onPlaylistSelect({ id: 'added', name: 'Added' });
                } catch (e) {
                  // ignore
                }
                resolve();
              }, 50);
            }),
        } as any;
      });

    // Spy focus to observe fallback behavior (throw on options)
    const focusMock = jest.fn(function (this: any, ...args: any[]) {
      if (args.length) throw new Error('no options');
    });
    jest
      .spyOn(HTMLInputElement.prototype, 'focus')
      .mockImplementation(focusMock as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(input, {
      target: { value: 'https://open.spotify.com/playlist/xyz' },
    });

    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    // While the mock add is pending, LoadingOverlay should be present
    expect(screen.getByTestId('loading-overlay')).toBeTruthy();

    // Resolve the add
    act(() => {
      jest.advanceTimersByTime(50);
    });
    // Let promises settle
    await waitFor(() =>
      expect(mockOnSelect).toHaveBeenCalledWith({ id: 'added', name: 'Added' })
    );

    // The autofocus scheduled by onPlaylistSelect should run after its 100ms timeout
    act(() => {
      jest.advanceTimersByTime(100);
    });
    const calls = (focusMock as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);

    (HTMLInputElement.prototype.focus as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  test('ArrowDown from -1 then Enter selects the first result (prevIndex -1 branch)', async () => {
    const p1 = {
      id: 'p1',
      name: 'One',
      owner: { display_name: 'A' },
      images: [],
      tracks: { total: 1 },
    } as any;
    const p2 = {
      id: 'p2',
      name: 'Two',
      owner: { display_name: 'B' },
      images: [],
      tracks: { total: 2 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [p1, p2],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    const handleAdd = jest.fn(() => Promise.resolve());

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    // move highlighted index to -1 by simulating mouse leave on the first item
    const first = screen.getByText('One');
    fireEvent.mouseLeave(first);

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(handleAdd).toHaveBeenCalledWith('p1'));
  });

  test('input is auto-focused on mount using focus with options when supported', () => {
    // focus should be called with options { preventScroll: true }
    const focusMock = jest.fn();
    jest
      .spyOn(HTMLInputElement.prototype, 'focus')
      .mockImplementation(focusMock as any);

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    expect(focusMock).toHaveBeenCalled();
    // ensure it was called with options at least once
    const calledWithOptions = (focusMock as jest.Mock).mock.calls.some(
      c => c.length && typeof c[0] === 'object'
    );
    expect(calledWithOptions).toBeTruthy();

    (HTMLInputElement.prototype.focus as jest.Mock).mockRestore();
  });

  test('pressing Enter when there are no search results triggers handleInputSubmit (empty input path)', async () => {
    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [],
      loading: false,
      error: null,
      showResults: false,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith(
        'Please enter a playlist URL or search term'
      )
    );
  });

  test('when results show but no item highlighted, Enter calls handleInputSubmit (empty input path)', async () => {
    const p1 = {
      id: 'hp1',
      name: 'H1',
      owner: { display_name: 'H' },
      images: [],
      tracks: { total: 1 },
    } as any;

    const setShowResults = jest.fn();

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [p1],
      loading: false,
      error: null,
      showResults: true,
      setShowResults,
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const container = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('H1')) as HTMLElement;
    // set highlighted to -1 via mouseLeave
    fireEvent.mouseLeave(container);

    const input = screen.getByPlaceholderText(/Try:/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(mockOnError).toHaveBeenCalledWith(
        'Please enter a playlist URL or search term'
      )
    );
  });

  test('pressing Enter or Space on a search result triggers onPlaylistSelect', async () => {
    const playlist = {
      id: 'kb1',
      name: 'KeyBoard',
      owner: { display_name: 'kb' },
      images: [],
      tracks: { total: 4 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    // find the result button that contains our playlist text
    const buttons = screen.getAllByRole('button');
    const resultButton = buttons.find(b =>
      b.textContent?.includes('KeyBoard')
    ) as HTMLElement;
    expect(resultButton).toBeTruthy();

    fireEvent.keyDown(resultButton, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith(playlist));

    // Reset mock and try Space key
    mockOnSelect.mockReset();
    fireEvent.keyDown(resultButton, { key: ' ', code: 'Space' });
    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith(playlist));
  });

  test('Enter on input with highlighted result sets loading true then false when promise resolves', async () => {
    const p1 = {
      id: 'p1',
      name: 'LoadOne',
      owner: { display_name: 'A' },
      images: [],
      tracks: { total: 1 },
    } as any;

    let resolveAdd: () => void;
    const addPromise = new Promise<void>(res => {
      resolveAdd = res;
    });

    const handleAdd = jest.fn(() => addPromise);

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [p1],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: handleAdd,
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText(/Try:/i);
    // Enter should pick highlighted index 0 and call handleAdd
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // loading overlay should appear (setLoading true)
    expect(screen.getByTestId('loading-overlay')).toBeTruthy();

    // resolve the add promise and wait for loading to clear
    resolveAdd!();
    await waitFor(() =>
      expect(screen.queryByTestId('loading-overlay')).toBeNull()
    );
  });

  test('mouseEnter then mouseLeave and Enter/Space on result div triggers onPlaylistSelect', async () => {
    const playlist = {
      id: 'mm1',
      name: 'HoverMe',
      owner: { display_name: 'hover' },
      images: [],
      tracks: { total: 2 },
    } as any;

    jest.spyOn(usePlaylistSearchModule, 'usePlaylistSearch').mockReturnValue({
      setQuery: jest.fn(),
      results: [playlist],
      loading: false,
      error: null,
      showResults: true,
      setShowResults: jest.fn(),
      clearResults: jest.fn(),
    } as any);

    jest
      .spyOn(useSpotifyUrlHandlerModule, 'useSpotifyUrlHandler')
      .mockReturnValue({
        isValidSpotifyLink: () => false,
        isValidPlaylistUrl: () => false,
        handleAddPlaylistByUrl: jest.fn(),
      } as any);

    render(
      <PlaylistSelector
        accessToken={'token'}
        selectedPlaylists={[]}
        onPlaylistSelect={mockOnSelect}
        onClearAll={mockOnClearAll}
        onError={mockOnError}
      />
    );

    // result is inside a role=button container; find it via role queries to avoid node access
    const container = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('HoverMe')) as HTMLElement;
    expect(container).toBeTruthy();

    fireEvent.mouseEnter(container);
    fireEvent.mouseLeave(container);

    fireEvent.keyDown(container, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith(playlist));

    mockOnSelect.mockReset();
    fireEvent.keyDown(container, { key: ' ', code: 'Space' });
    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith(playlist));
  });
});
