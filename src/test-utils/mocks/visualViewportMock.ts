export type VVMock = {
  height: number;
  offsetTop?: number;
  dispatchers: Record<string, (ev?: Event) => void>;
  addEventListener: (ev: string, cb: (ev?: Event) => void) => void;
  removeEventListener: (ev: string) => void;
};
export type VisualViewportMockAPI = {
  vv: VVMock;
  setHeight: (h: number) => void;
  setOffsetTop: (t: number) => void;
};

/**
 * @deprecated Use the adapter `mockVisualViewport` in `src/test-utils/mockVisualViewport.ts`
 * which installs and restores a global visualViewport mock and provides
 * consistent setup/teardown for tests. The low-level `createVisualViewportMock`
 * remains available for library-style usage but tests should prefer the adapter.
 */
export function createVisualViewportMock(
  initialHeight = 800,
  offsetTop = 0
): VisualViewportMockAPI {
  const dispatchers: Record<string, (ev?: Event) => void> = {};
  const vv: VVMock = {
    height: initialHeight,
    offsetTop,
    dispatchers,
    addEventListener: (ev: string, cb: (ev?: Event) => void) => {
      dispatchers[ev] = cb;
    },
    removeEventListener: (ev: string) => {
      delete dispatchers[ev];
    },
  };

  return {
    vv,
    setHeight(h: number) {
      vv.height = h;
      if (dispatchers['resize']) dispatchers['resize'](new Event('resize'));
    },
    setOffsetTop(t: number) {
      vv.offsetTop = t;
      if (dispatchers['scroll']) dispatchers['scroll'](new Event('scroll'));
    },
  };
}
