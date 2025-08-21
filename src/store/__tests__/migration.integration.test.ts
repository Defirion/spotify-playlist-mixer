import * as store from '../../store/index';
import { cleanupStoreState, validateStoreState } from '../../store/migration';

describe('migration integration helpers', () => {
  it('cleanupStoreState calls setRatioConfigBulk with cleaned config', () => {
    const mockState: any = {
      selectedPlaylists: [{ id: 'pA' }],
      ratioConfig: { orphan: { weight: 1 }, pA: { weight: 5 } },
      setRatioConfigBulk: jest.fn(),
    };

    const spy = jest
      .spyOn(store.useAppStore, 'getState')
      .mockReturnValue(mockState as any);
    cleanupStoreState();
    expect(mockState.setRatioConfigBulk).toHaveBeenCalledWith(
      expect.objectContaining({ pA: expect.any(Object) })
    );
    spy.mockRestore();
  });

  it('validateStoreState logs when issues present', () => {
    const mockState: any = {
      selectedPlaylists: [{ id: 'p1' }],
      ratioConfig: { orphan: { weight: 1 } },
    };

    const spy = jest
      .spyOn(store.useAppStore, 'getState')
      .mockReturnValue(mockState as any);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const issues = validateStoreState();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
    spy.mockRestore();
  });
});
