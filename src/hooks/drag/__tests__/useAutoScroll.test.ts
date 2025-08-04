import { renderHook, act } from '@testing-library/react';
import { useAutoScroll } from '../useAutoScroll';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = jest.fn(cb => {
  cb(); // Execute immediately for testing
  return 1;
});

const mockCancelAnimationFrame = jest.fn();

global.requestAnimationFrame = mockRequestAnimationFrame;
global.cancelAnimationFrame = mockCancelAnimationFrame;

describe('useAutoScroll', () => {
  let mockContainer: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();

    // Create a mock container element
    mockContainer = {
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 400,
      getBoundingClientRect: jest.fn(() => ({
        top: 50,
        bottom: 450,
        left: 0,
        right: 300,
        width: 300,
        height: 400,
      })),
    } as any;
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useAutoScroll());

    expect(result.current.checkAutoScroll).toBeDefined();
    expect(result.current.stopAutoScroll).toBeDefined();
    expect(result.current.startAutoScroll).toBeDefined();
  });

  it('should handle scroll container being null', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: null })
    );

    expect(() => {
      result.current.checkAutoScroll(100);
    }).not.toThrow();

    expect(() => {
      result.current.startAutoScroll('up', 10);
    }).not.toThrow();
  });

  it('should start auto-scroll manually', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer })
    );

    act(() => {
      result.current.startAutoScroll('up', 10);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should stop auto-scroll when called', () => {
    // Mock requestAnimationFrame to not execute immediately so we can test cancellation
    mockRequestAnimationFrame.mockImplementation(cb => 1);

    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer })
    );

    // Start scrolling first
    act(() => {
      result.current.startAutoScroll('up', 10);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Stop scrolling
    act(() => {
      result.current.stopAutoScroll();
    });

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it('should not scroll when cursor is in middle of container', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer, scrollThreshold: 80 })
    );

    // Position cursor in middle of container
    const clientY = 250; // Middle of container

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should trigger auto-scroll when near top edge', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer, scrollThreshold: 80 })
    );

    // Position cursor near top edge (within threshold)
    const clientY = 80; // 30px from top (50 + 30)

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should trigger auto-scroll when near bottom edge', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer, scrollThreshold: 80 })
    );

    // Position cursor near bottom edge (within threshold)
    const clientY = 400; // 50px from bottom (450 - 50)

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should handle out-of-bounds scrolling above container', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer, scrollThreshold: 80 })
    );

    // Position cursor above container (out of bounds)
    const clientY = 40; // Above container top (50)

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should handle out-of-bounds scrolling below container', () => {
    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: mockContainer, scrollThreshold: 80 })
    );

    // Position cursor below container (out of bounds)
    const clientY = 460; // Below container bottom (450)

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should not scroll up when already at top', () => {
    // Container at top
    const containerAtTop = {
      ...mockContainer,
      scrollTop: 0,
    };

    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: containerAtTop as HTMLElement })
    );

    // Try to scroll up when at top
    const clientY = 80; // Near top edge

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should not scroll down when already at bottom', () => {
    // Container at bottom
    const containerAtBottom = {
      ...mockContainer,
      scrollTop: 600, // scrollHeight (1000) - clientHeight (400) = 600
    };

    const { result } = renderHook(() =>
      useAutoScroll({ scrollContainer: containerAtBottom as HTMLElement })
    );

    // Try to scroll down when at bottom
    const clientY = 400; // Near bottom edge

    act(() => {
      result.current.checkAutoScroll(clientY);
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should use custom scroll speeds', () => {
    const { result } = renderHook(() =>
      useAutoScroll({
        scrollContainer: mockContainer,
        minScrollSpeed: 5,
        maxScrollSpeed: 50,
      })
    );

    // This test verifies the hook accepts custom speed parameters
    expect(result.current.checkAutoScroll).toBeDefined();
  });
});
