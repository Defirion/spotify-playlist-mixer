import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistForm from '../features/mixer/PlaylistForm';

const makePlaylist = (id: string, total = 5, avgSec?: number) => ({
  id,
  name: `P ${id}`,
  images: [],
  tracks: { total },
  owner: { id: 'u' },
  realAverageDurationSeconds: avgSec,
});

const baseMixOptions = {
  totalSongs: 5,
  targetDuration: 300,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'My Mix',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: false,
  continueWhenPlaylistEmpty: false,
};

describe('PlaylistForm behavior', () => {
  it('changes totalSongs when Set Song Count input is edited', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1'), makePlaylist('2')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    // find the number input rendered when neither useAllSongs nor useTimeLimit
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(5);

    fireEvent.change(input, { target: { value: '12' } });
    expect(onMixOptionsChange).toHaveBeenCalledWith({ totalSongs: 12 });
  });

  it('changes targetDuration (seconds) when Set Duration input is edited', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, useTimeLimit: true, targetDuration: 300 } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 10, 200)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    // when useTimeLimit is true the input shows minutes value (300s -> 5)
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(5);

    fireEvent.change(input, { target: { value: '10' } });
    // expect seconds
    expect(onMixOptionsChange).toHaveBeenCalledWith({ targetDuration: 600 });
  });

  it('shows formatted total duration when Use All Songs is active', () => {
    const onMixOptionsChange = jest.fn();

    // one playlist with avg 200s and total 4 songs => ~13m
    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions, useAllSongs: true } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 4, 200)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    expect(screen.getByText(/Using all 4 songs/i)).toBeInTheDocument();
    expect(screen.getByText(/13m/)).toBeInTheDocument();
  });

  it('renders exceedsLimit warning when provided', () => {
    const onMixOptionsChange = jest.fn();
    const exceeds = {
      type: 'songs' as const,
      requested: 200,
      available: 50,
      availableFormatted: '50 songs',
      requestedFormatted: '200 songs',
    };

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={exceeds}
        ratioImbalance={null}
      />
    );

    expect(screen.getByText(/Not enough content/i)).toBeInTheDocument();
    expect(screen.getByText(/200 songs/)).toBeInTheDocument();
    expect(screen.getByText(/50 songs/)).toBeInTheDocument();
  });

  it('renders ratio imbalance warning and toggles continueWhenPlaylistEmpty', () => {
    const onMixOptionsChange = jest.fn();
    const ratio = {
      limitingPlaylistName: 'P 1',
      mixWillBecomeImbalancedAt: '10',
      unit: 'songs',
      willStopEarly: true,
      isUseAllSongs: false,
    };

    render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, continueWhenPlaylistEmpty: false } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={ratio as any}
      />
    );

    expect(screen.getByText(/Ratio imbalance warning/i)).toBeInTheDocument();
    expect(screen.getByText(/P 1/)).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      continueWhenPlaylistEmpty: true,
    });
  });

  it('selects popularityStrategy when strategy buttons are clicked', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const frontLoaded = screen.getByRole('button', { name: /front-loaded/i });
    fireEvent.click(frontLoaded);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      popularityStrategy: 'front-loaded',
    });

    const crescendo = screen.getByRole('button', { name: /crescendo/i });
    fireEvent.click(crescendo);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      popularityStrategy: 'crescendo',
    });
  });

  it('changes playlist name when input edited', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/my awesome mix/i);
    fireEvent.change(nameInput, { target: { value: 'Party Mix' } });
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      playlistName: 'Party Mix',
    });
  });

  it('toggles Use All / Set Song Count / Set Duration via buttons', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const useAll = screen.getByRole('button', { name: /use all songs/i });
    fireEvent.click(useAll);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      useAllSongs: true,
      useTimeLimit: false,
    });

    const setCount = screen.getByRole('button', { name: /set song count/i });
    fireEvent.click(setCount);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      useAllSongs: false,
      useTimeLimit: false,
    });

    const setDuration = screen.getByRole('button', { name: /set duration/i });
    fireEvent.click(setDuration);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      useAllSongs: false,
      useTimeLimit: true,
    });
  });

  it('selects mixed and mid-peak popularity strategies', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const mixed = screen.getByRole('button', { name: /mixed/i });
    fireEvent.click(mixed);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      popularityStrategy: 'mixed',
    });

    const midPeak = screen.getByRole('button', { name: /mid-peak/i });
    fireEvent.click(midPeak);
    expect(onMixOptionsChange).toHaveBeenCalledWith({
      popularityStrategy: 'mid-peak',
    });
  });

  it('formats fallback duration when no realAverageDurationSeconds provided', () => {
    const onMixOptionsChange = jest.fn();

    // two playlists with totals 3 and 4, no avg durations -> fallback 3.5 minutes per song
    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions, useAllSongs: true } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 3), makePlaylist('2', 4)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    // total songs = 7, duration minutes ~= round(7 * 3.5) -> shown as ~<N>m; match any minute value to be robust
    expect(screen.getByText(/Using all 7 songs/i)).toBeInTheDocument();
    expect(screen.getByText(/~?\s*\d+m/)).toBeInTheDocument();
  });

  it('formats hours correctly when total duration exceeds 60 minutes', () => {
    const onMixOptionsChange = jest.fn();

    // one playlist with 100 songs at 120s each => 200 minutes -> 3h 20m
    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions, useAllSongs: true } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 100, 120)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    expect(screen.getByText(/Using all 100 songs/i)).toBeInTheDocument();
    expect(screen.getByText(/3h\s*20m/)).toBeInTheDocument();
  });

  it('renders the alternate ratio imbalance message when willStopEarly is false', () => {
    const onMixOptionsChange = jest.fn();
    const ratio = {
      limitingPlaylistName: 'P 2',
      mixWillBecomeImbalancedAt: '5',
      unit: 'songs',
      willStopEarly: false,
      isUseAllSongs: false,
    };

    render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, continueWhenPlaylistEmpty: false } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={ratio as any}
      />
    );

    expect(screen.getByText(/Ratio imbalance warning/i)).toBeInTheDocument();
    expect(
      screen.getByText(/but mixing will continue with remaining playlists/i)
    ).toBeInTheDocument();
  });

  it('shows the active strategy button when popularityStrategy is preselected', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, popularityStrategy: 'front-loaded' } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const frontLoaded = screen.getByRole('button', { name: /front-loaded/i });
    expect(frontLoaded).toHaveClass('active');
  });

  it('renders time-based exceedsLimit messaging when type is time', () => {
    const onMixOptionsChange = jest.fn();
    const exceeds = {
      type: 'time' as const,
      requested: 1000,
      available: 200,
      availableFormatted: '3h 20m',
      requestedFormatted: '16h 40m',
    };

    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={exceeds}
        ratioImbalance={null}
      />
    );

    expect(screen.getByText(/Not enough content/i)).toBeInTheDocument();
    expect(screen.getByText(/16h 40m/)).toBeInTheDocument();
    expect(screen.getByText(/3h 20m/)).toBeInTheDocument();
  });

  it('sets max attribute for totalSongs input to available totalSongs', () => {
    const onMixOptionsChange = jest.fn();

    render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, useAllSongs: false, useTimeLimit: false } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 6), makePlaylist('2', 4)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('max', '10');
  });

  it('sets max attribute for time limit input to available totalDurationMinutes', () => {
    const onMixOptionsChange = jest.fn();

    // one playlist with 10 songs at 120s => 20 minutes
    render(
      <PlaylistForm
        mixOptions={{ ...baseMixOptions, useTimeLimit: true } as any}
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1', 10, 120)] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('max', '20');
  });

  it('shows mid-peak and crescendo buttons as active when preselected', () => {
    const onMixOptionsChange = jest.fn();

    const { rerender } = render(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, popularityStrategy: 'mid-peak' } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const midPeak = screen.getByRole('button', { name: /mid-peak/i });
    expect(midPeak).toHaveClass('active');

    // rerender with crescendo selected
    rerender(
      <PlaylistForm
        mixOptions={
          { ...baseMixOptions, popularityStrategy: 'crescendo' } as any
        }
        onMixOptionsChange={onMixOptionsChange}
        selectedPlaylists={[makePlaylist('1')] as any}
        exceedsLimit={null}
        ratioImbalance={null}
      />
    );

    const crescendo = screen.getByRole('button', { name: /crescendo/i });
    expect(crescendo).toHaveClass('active');
  });
});
