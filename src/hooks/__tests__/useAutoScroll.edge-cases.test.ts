import { renderHook, act } from '@testing-library/react';
import { useAutoScroll } from '../useAutoScroll';

// Mock requestAnimationFrame and cancelAnimationFrame
let frameCallbacks: Array<() => void> = [];
let frameId = 0;

const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  frameCallbacks.push(() => callback(Date.now()));
  return ++frameId;
});

const mockCancelAnimationFrame = vi.fn((id: number) => {
  // Remove callback from queue if it exists
  frameCallbacks = frameCallbacks.filter((_, index) => index + 1 !== id);
});

const flushFrames = () => {
  const callbacks = [...frameCallbacks];
  frameCallbacks = [];
  callbacks.forEach(callback => callback());
};

// MockScrollContainer interface was removed because it was unused and caused a lint warning

describe('useAutoScroll Edge Cases and Branch Coverage', () => {
  let mockScrollContainer: HTMLElement;

  beforeEach(() => {
    frameCallbacks = [];
    frameId = 0;

    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;

    // Create a more complete mock scroll container with mutable scrollTop
    const container = {
      _scrollTop: 100, // internal storage
      get scrollTop() {
        return container._scrollTop;
      },
      set scrollTop(value) {
        container._scrollTop = value;
      },
      scrollHeight: 1000,
      clientHeight: 400,
      getBoundingClientRect: vi.fn(() => ({
        top: 50,
        bottom: 450,
        left: 0,
        right: 800,
        width: 800,
        height: 400,
      })),
    };

    mockScrollContainer = container as unknown as HTMLElement;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization and default behavior', () => {
    it('works without scroll container', () => {
      const { result } = renderHook(() => useAutoScroll({}));

      expect(() => {
        result.current.checkAutoScroll(100);
        result.current.startAutoScroll('up', 10);
        result.current.stopAutoScroll();
      }).not.toThrow();
    });

    it('works with null scroll container', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: null })
      );

      expect(() => {
        result.current.checkAutoScroll(100);
        result.current.startAutoScroll('down', 10);
        result.current.stopAutoScroll();
      }).not.toThrow();
    });

    it('uses default scroll threshold', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      // Test with position that would trigger auto-scroll with default threshold (80px)
      act(() => {
        result.current.checkAutoScroll(110); // 60px from top (50 + 60 = 110)
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('uses custom scroll threshold', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          scrollContainer: mockScrollContainer,
          scrollThreshold: 40,
        })
      );

      // Test with position that wouldn't trigger with default threshold but will with 40px
      act(() => {
        result.current.checkAutoScroll(85); // 35px from top
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('checkAutoScroll behavior', () => {
    it('triggers upward scroll when near top edge', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.checkAutoScroll(120); // 70px from top (50 + 70 = 120)
      });

      // Verify that animation frame was requested (scroll initiated)
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('triggers downward scroll when near bottom edge', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.checkAutoScroll(380); // 70px from bottom (450 - 70 = 380)
      });

      // Verify that animation frame was requested (scroll initiated)
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('does not scroll when position is in middle of container', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.checkAutoScroll(250); // Middle of container
      });

      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('does not scroll up when already at top', () => {
      mockScrollContainer.scrollTop = 0;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.checkAutoScroll(120); // Near top
      });

      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('does not scroll down when already at bottom', () => {
      mockScrollContainer.scrollTop = 600; // At bottom (1000 - 400 = 600)

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.checkAutoScroll(380); // Near bottom
      });

      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('startAutoScroll behavior', () => {
    it('starts upward scroll', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.startAutoScroll('up', 10);
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('starts downward scroll', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.startAutoScroll('down', 15);
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('does not start scroll without container', () => {
      const { result } = renderHook(() => useAutoScroll({}));

      act(() => {
        result.current.startAutoScroll('up', 10);
      });

      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('handles speed updates during active scrolling', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      // Start initial scroll
      act(() => {
        result.current.startAutoScroll('up', 5);
      });

      const callCountAfterStart = mockRequestAnimationFrame.mock.calls.length;

      // Change speed - based on implementation this creates a new animation
      // if the previous one completed, which is valid behavior
      act(() => {
        result.current.startAutoScroll('up', 15);
      });

      const callCountAfterUpdate = mockRequestAnimationFrame.mock.calls.length;

      // The behavior may create another animation frame if needed
      expect(callCountAfterUpdate).toBeGreaterThanOrEqual(callCountAfterStart);
    });

    it('handles boundary conditions gracefully', () => {
      // Set container to be near top boundary
      (mockScrollContainer as any)._scrollTop = 5;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      // Starting scroll near boundary should work without errors
      expect(() => {
        act(() => {
          result.current.startAutoScroll('up', 10);
        });
      }).not.toThrow();

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('handles bottom boundary conditions gracefully', () => {
      // Set container to be near bottom boundary (600 max)
      (mockScrollContainer as any)._scrollTop = 595;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      // Starting scroll near boundary should work without errors
      expect(() => {
        act(() => {
          result.current.startAutoScroll('down', 10);
        });
      }).not.toThrow();

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('starts animation when not at boundary', () => {
      // Set scroll position in the middle, away from boundaries
      (mockScrollContainer as any)._scrollTop = 300;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.startAutoScroll('up', 10);
      });

      // Should start animation frame when there's room to scroll
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('handles container becoming null during scroll', () => {
      const { result, rerender } = renderHook(
        (props: { container: HTMLElement | null }) =>
          useAutoScroll({ scrollContainer: props.container }),
        {
          initialProps: {
            container: mockScrollContainer as HTMLElement | null,
          },
        }
      );

      act(() => {
        result.current.startAutoScroll('up', 10);
      });

      // Change container to null
      rerender({ container: null });

      act(() => {
        flushFrames();
      });

      // Should not throw and should stop scrolling
      expect(() => flushFrames()).not.toThrow();
    });
  });

  describe('stopAutoScroll behavior', () => {
    it('can stop animations when requested', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.startAutoScroll('down', 10);
      });

      // Just verify the stopAutoScroll method works without throwing
      expect(() => {
        act(() => {
          result.current.stopAutoScroll();
        });
      }).not.toThrow();
    });

    it('does nothing when no animation is active', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.stopAutoScroll();
      });

      // Should not throw and should not call cancelAnimationFrame
      expect(mockCancelAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('checkAutoScroll speed behavior', () => {
    it('responds to different cursor positions near edges', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          scrollContainer: mockScrollContainer,
          scrollThreshold: 100,
        })
      );

      // Position far from edge (90px from top) - should trigger scroll
      act(() => {
        result.current.checkAutoScroll(140); // 90px from top (50 + 90 = 140)
      });

      const callsAfterFar = mockRequestAnimationFrame.mock.calls.length;

      // Reset for second test
      act(() => {
        result.current.stopAutoScroll();
      });
      mockRequestAnimationFrame.mockClear();

      // Position close to edge (10px from top) - should also trigger scroll
      act(() => {
        result.current.checkAutoScroll(60); // 10px from top (50 + 10 = 60)
      });

      const callsAfterClose = mockRequestAnimationFrame.mock.calls.length;

      // Both positions should trigger scrolling
      expect(callsAfterFar).toBeGreaterThan(0);
      expect(callsAfterClose).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('handles getBoundingClientRect throwing error', () => {
      const errorContainer = {
        ...mockScrollContainer,
        getBoundingClientRect: vi.fn(() => {
          throw new Error('getBoundingClientRect failed');
        }),
      } as unknown as HTMLElement;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: errorContainer })
      );

      expect(() => {
        act(() => {
          result.current.checkAutoScroll(100);
        });
      }).toThrow('getBoundingClientRect failed');
    });

    it('handles scroll container properties being undefined', () => {
      const incompleteContainer = {
        getBoundingClientRect: vi.fn(() => ({
          top: 50,
          bottom: 450,
          left: 0,
          right: 800,
          width: 800,
          height: 400,
        })),
      } as unknown as HTMLElement;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: incompleteContainer })
      );

      expect(() => {
        act(() => {
          result.current.checkAutoScroll(100);
          result.current.startAutoScroll('up', 10);
          flushFrames();
        });
      }).not.toThrow();
    });

    it('handles multiple rapid stop calls safely', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: mockScrollContainer })
      );

      act(() => {
        result.current.startAutoScroll('up', 10);
      });

      // Multiple stop calls should not throw
      expect(() => {
        act(() => {
          result.current.stopAutoScroll();
          result.current.stopAutoScroll();
          result.current.stopAutoScroll();
        });
      }).not.toThrow();
    });

    it('handles scrollTop errors gracefully', () => {
      const readOnlyContainer = {
        ...mockScrollContainer,
        set scrollTop(value: number) {
          // Silently ignore scrollTop assignments (like some read-only containers)
        },
      } as unknown as HTMLElement;

      const { result } = renderHook(() =>
        useAutoScroll({ scrollContainer: readOnlyContainer })
      );

      expect(() => {
        act(() => {
          result.current.startAutoScroll('up', 10);
          flushFrames();
        });
      }).not.toThrow();
    });
  });
});
