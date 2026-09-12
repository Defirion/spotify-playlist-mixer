import {
  formatDuration,
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
