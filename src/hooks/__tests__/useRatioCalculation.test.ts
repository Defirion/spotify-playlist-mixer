import { renderHook } from '@testing-library/react';
import { useRatioCalculation } from '../useRatioCalculation';
import { SpotifyPlaylist } from '../../types/spotify';
import { RatioConfig, WeightType } from '../../types/mixer';

// Mock playlist data
const mockPlaylist1: SpotifyPlaylist = {
  id: '1',
  name: 'Playlist 1',
  description: 'Test playlist 1',
  images: [{ url: 'test1.jpg', height: 300, width: 300 }],
  tracks: { total: 50 },
  owner: { id: 'user1', display_name: 'User 1' },
  public: true,
  uri: 'spotify:playlist:1',
  realAverageDurationSeconds: 180, // 3 minutes
  tracksWithDuration: 50,
};

const mockPlaylist2: SpotifyPlaylist = {
  id: '2',
  name: 'Playlist 2',
  description: 'Test playlist 2',
  images: [{ url: 'test2.jpg', height: 300, width: 300 }],
  tracks: { total: 30 },
  owner: { id: 'user2', display_name: 'User 2' },
  public: true,
  uri: 'spotify:playlist:2',
  realAverageDurationSeconds: 240, // 4 minutes
  tracksWithDuration: 30,
};

const mockRatioConfig: RatioConfig = {
  '1': { min: 1, max: 2, weight: 3, weightType: 'frequency' },
  '2': { min: 2, max: 3, weight: 2, weightType: 'frequency' },
};

describe('useRatioCalculation', () => {
  it('calculates total weight correctly', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1, mockPlaylist2], mockRatioConfig, 'frequency')
    );

    expect(result.current.getTotalWeight()).toBe(5); // 3 + 2
  });

  it('calculates playlist percentage correctly', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1, mockPlaylist2], mockRatioConfig, 'frequency')
    );

    expect(result.current.getPlaylistPercentage('1')).toBe(60); // 3/5 * 100
    expect(result.current.getPlaylistPercentage('2')).toBe(40); // 2/5 * 100
  });

  it('formats duration from seconds correctly', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1], mockRatioConfig, 'frequency')
    );

    expect(result.current.formatDurationFromSeconds(180)).toBe('3:00');
    expect(result.current.formatDurationFromSeconds(125)).toBe('2:05');
    expect(result.current.formatDurationFromSeconds(0)).toBeNull();
  });

  it('generates example mix data for frequency mode', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1, mockPlaylist2], mockRatioConfig, 'frequency')
    );

    const { exampleMixData } = result.current;

    expect(exampleMixData.exampleTitle).toBe('Example Mix (per 100 songs):');
    expect(exampleMixData.playlistExamples).toHaveLength(2);
    
    const playlist1Example = exampleMixData.playlistExamples.find(p => p.id === '1');
    expect(playlist1Example?.displayText).toContain('~60 songs (60%)');
    expect(playlist1Example?.groupText).toBe('1-2 at a time');
    expect(playlist1Example?.weightTypeText).toBe('same song count');
  });

  it('generates example mix data for time mode', () => {
    const timeRatioConfig: RatioConfig = {
      '1': { min: 1, max: 2, weight: 3, weightType: 'time' },
      '2': { min: 2, max: 3, weight: 2, weightType: 'time' },
    };

    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1, mockPlaylist2], timeRatioConfig, 'time')
    );

    const { exampleMixData } = result.current;

    expect(exampleMixData.exampleTitle).toBe('Example Mix (per 60 minutes):');
    
    const playlist1Example = exampleMixData.playlistExamples.find(p => p.id === '1');
    expect(playlist1Example?.displayText).toContain('36.0 min, 60%');
    expect(playlist1Example?.weightTypeText).toBe('same play time');
  });

  it('handles playlists without duration data', () => {
    const playlistWithoutDuration: SpotifyPlaylist = {
      ...mockPlaylist1,
      realAverageDurationSeconds: undefined,
    };

    const { result } = renderHook(() =>
      useRatioCalculation([playlistWithoutDuration], mockRatioConfig, 'time')
    );

    const { exampleMixData } = result.current;
    const playlistExample = exampleMixData.playlistExamples[0];
    
    // When there's no duration data, it should fall back to song count calculation
    // With weight 3 out of total 3, it should be 100%
    expect(playlistExample.displayText).toContain('~60 songs (100%)'); // 60 minutes * 100% = 60 songs
    expect(playlistExample.displayText).not.toContain('min');
  });

  it('handles empty playlists array', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([], {}, 'frequency')
    );

    expect(result.current.getTotalWeight()).toBe(0);
    expect(result.current.exampleMixData.playlistExamples).toHaveLength(0);
  });

  it('handles missing ratio config', () => {
    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1], {}, 'frequency')
    );

    expect(result.current.getTotalWeight()).toBe(1); // Default weight
    expect(result.current.getPlaylistPercentage('1')).toBe(100);
  });

  it('handles single song groups correctly', () => {
    const singleSongConfig: RatioConfig = {
      '1': { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    };

    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1], singleSongConfig, 'frequency')
    );

    const { exampleMixData } = result.current;
    const playlistExample = exampleMixData.playlistExamples[0];
    
    expect(playlistExample.groupText).toBe('1 at a time');
  });

  it('handles multiple song groups correctly', () => {
    const multiSongConfig: RatioConfig = {
      '1': { min: 3, max: 3, weight: 1, weightType: 'frequency' },
    };

    const { result } = renderHook(() =>
      useRatioCalculation([mockPlaylist1], multiSongConfig, 'frequency')
    );

    const { exampleMixData } = result.current;
    const playlistExample = exampleMixData.playlistExamples[0];
    
    expect(playlistExample.groupText).toBe('3 at a time');
  });

  it('recalculates when dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ playlists, config, method }) =>
        useRatioCalculation(playlists, config, method),
      {
        initialProps: {
          playlists: [mockPlaylist1],
          config: mockRatioConfig,
          method: 'frequency' as WeightType,
        },
      }
    );

    const initialTotal = result.current.getTotalWeight();
    expect(initialTotal).toBe(3);

    // Update config
    const newConfig: RatioConfig = {
      '1': { min: 1, max: 2, weight: 5, weightType: 'frequency' },
    };

    rerender({
      playlists: [mockPlaylist1],
      config: newConfig,
      method: 'frequency' as WeightType,
    });

    expect(result.current.getTotalWeight()).toBe(5);
  });
});