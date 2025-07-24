import React from 'react';
import { render, screen } from '@testing-library/react';
import TrackList from '../TrackList';

// Mock data generator for performance testing
const generateLargeMockTracks = count => {
  return Array.from({ length: count }, (_, index) => ({
    id: `track-${index}`,
    name: `Track ${index}`,
    artists: [{ name: `Artist ${index}` }],
    album: {
      name: `Album ${index}`,
      images: [{ url: 'https://example.com/image.jpg' }],
    },
    duration_ms: 180000 + index * 1000, // Varying durations
    popularity: Math.floor(Math.random() * 100),
    uri: `spotify:track:${index}`,
    external_urls: { spotify: `https://open.spotify.com/track/${index}` },
  }));
};

describe('TrackList Performance Tests', () => {
  it('should handle 1000+ tracks with virtualization efficiently', () => {
    const largeTracks = generateLargeMockTracks(1000);
    const startTime = performance.now();

    render(
      <TrackList
        tracks={largeTracks}
        virtualized={true}
        itemHeight={64}
        containerHeight={400}
        overscan={5}
        showPopularity={true}
        showDuration={true}
        showAlbumArt={true}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with 1000 tracks
    expect(renderTime).toBeLessThan(100); // Less than 100ms

    // Should only render visible items, not all 1000
    const trackItems = screen.getAllByRole('listitem', { hidden: true });
    expect(trackItems.length).toBeLessThan(50); // Much less than 1000
  });

  it('should handle 5000+ tracks with virtualization', () => {
    const massiveTracks = generateLargeMockTracks(5000);
    const startTime = performance.now();

    render(
      <TrackList
        tracks={massiveTracks}
        virtualized={true}
        itemHeight={64}
        containerHeight={600}
        overscan={3}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should still render quickly with 5000 tracks
    expect(renderTime).toBeLessThan(200); // Less than 200ms

    // Should only render visible items
    const trackItems = screen.getAllByRole('listitem', { hidden: true });
    expect(trackItems.length).toBeLessThan(100);
  });

  it('should render all items when virtualization is disabled (small lists)', () => {
    const smallTracks = generateLargeMockTracks(50);

    render(
      <TrackList
        tracks={smallTracks}
        virtualized={false}
        showPopularity={true}
        showDuration={true}
      />
    );

    // Should render all items when not virtualized
    const trackItems = screen.getAllByRole('listitem', { hidden: true });
    expect(trackItems.length).toBe(50);
  });

  it('should automatically enable virtualization for lists over 100 items', () => {
    const mediumTracks = generateLargeMockTracks(150);

    const { container } = render(
      <TrackList
        tracks={mediumTracks}
        virtualized={true} // Explicitly enabled for 100+ items
        itemHeight={64}
        containerHeight={400}
      />
    );

    // Should have virtualization container styles
    const trackListContainer = container.querySelector('.track-list');
    expect(trackListContainer).toHaveStyle({
      height: '400px',
      overflowY: 'auto',
      position: 'relative',
    });

    // Should only render visible items
    const trackItems = screen.getAllByRole('listitem', { hidden: true });
    expect(trackItems.length).toBeLessThan(150);
  });

  it('should maintain performance with frequent updates', () => {
    let tracks = generateLargeMockTracks(1000);

    const { rerender } = render(
      <TrackList
        tracks={tracks}
        virtualized={true}
        itemHeight={64}
        containerHeight={400}
      />
    );

    // Simulate multiple updates
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();

      // Add some tracks
      tracks = [...tracks, ...generateLargeMockTracks(100)];

      rerender(
        <TrackList
          tracks={tracks}
          virtualized={true}
          itemHeight={64}
          containerHeight={400}
        />
      );

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Each update should be fast
      expect(updateTime).toBeLessThan(50);
    }
  });
});
