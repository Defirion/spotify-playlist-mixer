import { calculateTotalDuration, validateTrack } from '../mixerUtils';

describe('calculateTotalDuration', () => {
  it('returns 0 for null input', () => {
    expect(calculateTotalDuration(null as any)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(calculateTotalDuration(undefined as any)).toBe(0);
  });

  it('returns 0 for non-array input', () => {
    expect(calculateTotalDuration('not an array' as any)).toBe(0);
    expect(calculateTotalDuration(123 as any)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalDuration([])).toBe(0);
  });

  it('sums valid duration_ms values', () => {
    const tracks = [
      { duration_ms: 1000 },
      { duration_ms: 2000 },
      { duration_ms: 3000 },
    ];
    expect(calculateTotalDuration(tracks as any)).toBe(6000);
  });

  it('ignores tracks without duration_ms', () => {
    const tracks = [
      { duration_ms: 1000 },
      { name: 'no duration' },
      { duration_ms: 2000 },
    ];
    expect(calculateTotalDuration(tracks as any)).toBe(3000);
  });

  it('ignores tracks with invalid duration_ms', () => {
    const tracks = [
      { duration_ms: 1000 },
      { duration_ms: 'invalid' },
      { duration_ms: null },
      { duration_ms: 2000 },
    ];
    expect(calculateTotalDuration(tracks as any)).toBe(3000);
  });

  it('handles null/undefined tracks in array', () => {
    const tracks = [
      { duration_ms: 1000 },
      null,
      undefined,
      { duration_ms: 2000 },
    ];
    expect(calculateTotalDuration(tracks as any)).toBe(3000);
  });
});

describe('validateTrack', () => {
  it('returns false for null input', () => {
    expect(validateTrack(null as any)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(validateTrack(undefined as any)).toBe(false);
  });

  it('returns false for non-object input', () => {
    expect(validateTrack('string' as any)).toBe(false);
    expect(validateTrack(123 as any)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(validateTrack({} as any)).toBe(false);
  });

  it('returns false when missing id', () => {
    expect(validateTrack({ uri: 'uri', name: 'name' } as any)).toBe(false);
  });

  it('returns false when missing uri', () => {
    expect(validateTrack({ id: 'id', name: 'name' } as any)).toBe(false);
  });

  it('returns false when missing name', () => {
    expect(validateTrack({ id: 'id', uri: 'uri' } as any)).toBe(false);
  });

  it('returns false for empty string values', () => {
    expect(validateTrack({ id: '', uri: 'uri', name: 'name' } as any)).toBe(
      false
    );
    expect(validateTrack({ id: 'id', uri: '', name: 'name' } as any)).toBe(
      false
    );
    expect(validateTrack({ id: 'id', uri: 'uri', name: '' } as any)).toBe(
      false
    );
  });

  it('returns true for valid track with all required fields', () => {
    expect(
      validateTrack({
        id: 'track1',
        uri: 'spotify:track:1',
        name: 'Song Name',
      } as any)
    ).toBe(true);
  });

  it('returns true for valid track with extra fields', () => {
    expect(
      validateTrack({
        id: 'track1',
        uri: 'spotify:track:1',
        name: 'Song Name',
        artist: 'Artist Name',
        duration_ms: 180000,
      } as any)
    ).toBe(true);
  });
});
