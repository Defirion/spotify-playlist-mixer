import {
  formatDuration,
  getTrackQuadrant,
  getPopularityStyle,
  generateTrackInstanceId,
  getTrackDragId,
  createMixedTrackInstance,
  ensureTrackInstanceId,
} from '../trackUtils';

describe('trackUtils', () => {
  describe('formatDuration', () => {
    it('should format milliseconds to MM:SS', () => {
      expect(formatDuration(90000)).toBe('1:30');
      expect(formatDuration(61000)).toBe('1:01');
      expect(formatDuration(0)).toBe('0:00');
    });
  });

  describe('getTrackQuadrant', () => {
    it('should return default quadrant for falsy input', () => {
      // @ts-ignore
      expect(getTrackQuadrant(null)).toBe('low-energy-low-valence');
    });

    it('should determine quadrant based on popularity and name length', () => {
      const trackA: any = { popularity: 60, name: 'Short Name' };
      expect(getTrackQuadrant(trackA)).toBe('high-energy-low-valence');

      const trackB: any = {
        popularity: 70,
        name: 'This is a very long track name indeed',
      };
      expect(getTrackQuadrant(trackB)).toBe('high-energy-high-valence');

      const trackC: any = {
        popularity: 30,
        name: 'Long-ish name maybe more than twenty',
      };
      expect(getTrackQuadrant(trackC)).toBe('low-energy-high-valence');
    });
  });

  describe('getPopularityStyle', () => {
    it('should return styles for quadrants and include popularity text', () => {
      const s1 = getPopularityStyle('high-energy-high-valence', 80);
      expect(s1.background).toBe('#4CAF50');
      expect(s1.text).toBe('80%');

      const s2 = getPopularityStyle('low-energy-low-valence');
      expect(s2.background).toBe('#9E9E9E');
      expect(s2.text).toBe('');
    });
  });

  describe('instance id utilities', () => {
    it('generateTrackInstanceId should produce different values', () => {
      const a = generateTrackInstanceId();
      const b = generateTrackInstanceId();
      expect(a).not.toBe(b);
      expect(a.startsWith('track_')).toBe(true);
    });

    it('getTrackDragId should prefer instanceId over id', () => {
      const t1: any = { id: 'spotify1', instanceId: 'inst1' };
      expect(getTrackDragId(t1)).toBe('inst1');
      const t2: any = { id: 'spotify2' };
      expect(getTrackDragId(t2)).toBe('spotify2');
    });

    it('createMixedTrackInstance and ensureTrackInstanceId should set instanceId', () => {
      const track: any = { id: 's1', uri: 'u1', name: 'N', duration_ms: 1000 };
      const mixed = createMixedTrackInstance(track, 'p1');
      expect(mixed.sourcePlaylist).toBe('p1');
      expect(typeof mixed.instanceId).toBe('string');

      const ensured = ensureTrackInstanceId({
        ...mixed,
        instanceId: undefined,
      } as any);
      expect(typeof ensured.instanceId).toBe('string');
    });
  });
});
