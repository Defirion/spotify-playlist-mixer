import { jest } from '@jest/globals';

const mockSetRatioConfigBulk = jest.fn();

describe('migration utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('validateStoreState reports orphaned and missing configs', () => {
    const mockedState = {
      selectedPlaylists: [{ id: 'a' }],
      ratioConfig: { b: { weight: 1 } },
    } as any;

    jest.doMock('../../store/index', () => ({
      useAppStore: {
        getState: () => mockedState,
      },
    }));

    const { validateStoreState } = require('../../store/migration');

    const issues = validateStoreState();

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(
      issues.some((s: string) => s.includes('Orphaned ratio config'))
    ).toBe(true);
    expect(issues.some((s: string) => s.includes('Missing ratio config'))).toBe(
      true
    );
  });

  it('validateStoreState returns empty array when consistent', () => {
    const mockedState = {
      selectedPlaylists: [{ id: 'a' }],
      ratioConfig: { a: { weight: 1 } },
    } as any;

    jest.doMock('../../store/index', () => ({
      useAppStore: {
        getState: () => mockedState,
      },
    }));

    const { validateStoreState } = require('../../store/migration');

    const issues = validateStoreState();
    expect(issues).toEqual([]);
  });

  it('cleanupStoreState removes orphaned and adds missing configs', () => {
    const mockedState = {
      selectedPlaylists: [{ id: 'a' }, { id: 'c' }],
      ratioConfig: { a: { weight: 5 }, b: { weight: 1 } },
      setRatioConfigBulk: mockSetRatioConfigBulk,
    } as any;

    jest.doMock('../../store/index', () => ({
      useAppStore: {
        getState: () => mockedState,
      },
    }));

    const { cleanupStoreState } = require('../../store/migration');

    cleanupStoreState();

    expect(mockSetRatioConfigBulk).toHaveBeenCalled();
    const arg = mockSetRatioConfigBulk.mock.calls[0][0];
    expect(arg.a).toBeDefined();
    expect(arg.b).toBeUndefined(); // orphan removed
    expect(arg.c).toBeDefined(); // missing added with defaults
    expect(arg.c.weight).toBe(2);
  });
});
