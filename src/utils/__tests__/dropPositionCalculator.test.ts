import { calculateDropPosition } from '../dropPositionCalculator';

describe('calculateDropPosition', () => {
  it('should return safe default for invalid inputs', () => {
    // Silence console.warn for this test
    const warn = console.warn;
    (console.warn as any) = () => {};
    // @ts-ignore - intentional invalid input
    const res = calculateDropPosition(NaN, null as any, 0);
    expect(res.index).toBe(0);
    expect(res.isFirst).toBe(true);
    expect(res.isLast).toBe(true);
    expect(typeof res.y).toBe('number');
    (console.warn as any) = warn;
  });

  it('should handle empty container by returning first position', () => {
    const container = document.createElement('div');
    const res = calculateDropPosition(100, container, 3);
    expect(res.index).toBe(0);
    expect(res.isFirst).toBe(true);
    expect(res.isLast).toBe(true);
    expect(res.y).toBe(100);
  });

  it('should compute insertion index above or below midpoint', () => {
    const container = document.createElement('div');
    // Create three track elements with predictable bounding rects
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.setAttribute('data-track-index', String(i));
      // Add to DOM so getBoundingClientRect works
      container.appendChild(el);
    }

    // Mock getBoundingClientRect on each element to simulate vertical layout
    const elements = Array.from(
      container.querySelectorAll('[data-track-index]')
    ) as HTMLElement[];
    elements.forEach((el, idx) => {
      el.getBoundingClientRect = () =>
        ({
          top: idx * 50,
          height: 40,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
        }) as any;
    });

    // Point above first element center
    const aboveFirst = calculateDropPosition(10, container, 3);
    expect(aboveFirst.index).toBe(0);
    expect(aboveFirst.isFirst).toBe(true);

    // Point between first and second (below first midpoint)
    const between = calculateDropPosition(45, container, 3);
    // Should select first element's bottom half -> insert index 1
    expect(between.index).toBe(1);

    // Point near last element bottom should insert after last
    const afterLast = calculateDropPosition(200, container, 3);
    expect(afterLast.index).toBe(3);
    expect(afterLast.isLast).toBe(true);
  });

  it('handles negative clientY by clamping to first position', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('data-track-index', '0');
    el.getBoundingClientRect = () =>
      ({ top: 0, height: 40, left: 0, right: 0, bottom: 0, width: 0 }) as any;
    container.appendChild(el);
    const res = calculateDropPosition(-50, container, 1);
    expect(res.index).toBe(0);
    expect(res.isFirst).toBe(true);
  });
});
