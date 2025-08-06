import {
  DragErrorRecoveryService,
  DragErrorType,
  dragErrorRecoveryService,
} from '../dragErrorRecovery';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock DOM methods
const mockScrollTo = jest.fn();
const mockCancelAnimationFrame = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  // Mock window methods
  Object.defineProperty(window, 'scrollTo', {
    value: mockScrollTo,
    writable: true,
  });

  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: mockCancelAnimationFrame,
    writable: true,
  });

  // Mock navigator
  Object.defineProperty(navigator, 'userAgent', {
    value: 'test-user-agent',
    writable: true,
  });

  // Mock location
  Object.defineProperty(window, 'location', {
    value: { href: 'http://test.com' },
    writable: true,
  });

  // Clear document body styles
  document.body.className = '';
  document.body.style.cssText = '';
});

describe('DragErrorRecoveryService', () => {
  let service: DragErrorRecoveryService;

  beforeEach(() => {
    service = new DragErrorRecoveryService();
  });

  describe('error handling and logging', () => {
    it('handles drag start failure', async () => {
      const error = new Error('Drag start failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.DRAG_START_FAILED,
        {
          draggedItem: {
            id: 'test-track',
            type: 'internal-track',
            payload: { track: { id: 'test' }, index: 0 },
            timestamp: Date.now(),
          },
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from drag start failure');
      expect(result.actions).toContain('cleared_drag_state');
      expect(result.actions).toContain('reset_visual_feedback');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles drag end failure', async () => {
      const error = new Error('Drag end failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.DRAG_END_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from drag end failure');
      expect(result.actions).toContain('force_ended_drag');
      expect(result.actions).toContain('cleaned_visual_feedback');
      expect(result.actions).toContain('stopped_auto_scroll');
      expect(result.shouldRetry).toBe(false);
    });

    it('handles drop failure', async () => {
      const error = new Error('Drop failed');
      const mockContainer = document.createElement('div');

      const result = await service.handleDragError(
        error,
        DragErrorType.DROP_FAILED,
        {
          additionalContext: {
            scrollContainer: mockContainer,
          },
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from drop failure');
      expect(result.actions).toContain('cleared_drag_state');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles state corruption', async () => {
      const error = new Error('State corrupted');
      const result = await service.handleDragError(
        error,
        DragErrorType.STATE_CORRUPTION
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from state corruption');
      expect(result.actions).toContain('full_state_reset');
      expect(result.shouldRetry).toBe(false);
    });

    it('handles scroll restoration failure', async () => {
      const error = new Error('Scroll restoration failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.SCROLL_RESTORATION_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from scroll restoration failure');
      expect(result.actions).toContain('cleared_scroll_position');
      expect(result.shouldRetry).toBe(false);
    });

    it('handles auto-scroll failure', async () => {
      const error = new Error('Auto-scroll failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.AUTO_SCROLL_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from auto-scroll failure');
      expect(result.actions).toContain('stopped_auto_scroll');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles visual feedback failure', async () => {
      const error = new Error('Visual feedback failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.VISUAL_FEEDBACK_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from visual feedback failure');
      expect(result.actions).toContain('reset_visual_feedback');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles touch handling failure', async () => {
      const error = new Error('Touch handling failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.TOUCH_HANDLING_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from touch handling failure');
      expect(result.actions).toContain('cleared_touch_state');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles keyboard handling failure', async () => {
      const error = new Error('Keyboard handling failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.KEYBOARD_HANDLING_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from keyboard handling failure');
      expect(result.actions).toContain('cleared_keyboard_state');
      expect(result.shouldRetry).toBe(true);
    });

    it('handles cleanup failure', async () => {
      const error = new Error('Cleanup failed');
      const result = await service.handleDragError(
        error,
        DragErrorType.CLEANUP_FAILED
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recovered from cleanup failure');
      expect(result.actions).toContain('force_cleanup_all');
      expect(result.shouldRetry).toBe(false);
    });

    it('handles unknown error types with generic recovery', async () => {
      const error = new Error('Unknown error');
      const result = await service.handleDragError(
        error,
        'UNKNOWN_ERROR' as DragErrorType
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Attempted generic recovery');
      expect(result.actions).toContain('generic_full_reset');
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('recovery attempt limits', () => {
    it('prevents infinite recovery attempts', async () => {
      const error = new Error('Persistent error');

      // First 3 attempts should succeed
      for (let i = 0; i < 3; i++) {
        const result = await service.handleDragError(
          error,
          DragErrorType.DRAG_START_FAILED,
          { draggedItem: { id: 'test', type: 'internal-track' } }
        );
        expect(result.success).toBe(true);
      }

      // 4th attempt should fail due to max attempts
      const result = await service.handleDragError(
        error,
        DragErrorType.DRAG_START_FAILED,
        { draggedItem: { id: 'test', type: 'internal-track' } }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Maximum recovery attempts exceeded');
      expect(result.shouldRetry).toBe(false);
    });

    it('tracks recovery attempts per error key', async () => {
      const error = new Error('Test error');

      // Different drag items should have separate attempt counters
      await service.handleDragError(error, DragErrorType.DRAG_START_FAILED, {
        draggedItem: { id: 'test1', type: 'internal-track' },
      });

      await service.handleDragError(error, DragErrorType.DRAG_START_FAILED, {
        draggedItem: { id: 'test2', type: 'internal-track' },
      });

      const stats = service.getErrorStatistics();
      expect(Object.keys(stats.recoveryAttempts)).toHaveLength(2);
    });
  });

  describe('visual feedback cleanup', () => {
    it('cleans up body styles during recovery', async () => {
      // Set up body styles as if drag was active
      document.body.classList.add('no-user-select', 'drag-active');
      document.body.style.position = 'fixed';
      document.body.style.top = '-100px';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      const error = new Error('Visual feedback error');
      await service.handleDragError(
        error,
        DragErrorType.VISUAL_FEEDBACK_FAILED
      );

      // Check that body styles were cleaned up
      expect(document.body.classList.contains('no-user-select')).toBe(false);
      expect(document.body.classList.contains('drag-active')).toBe(false);
      expect(document.body.style.position).toBe('');
      expect(document.body.style.top).toBe('');
      expect(document.body.style.width).toBe('');
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('auto-scroll cleanup', () => {
    it('cancels animation frames during auto-scroll recovery', async () => {
      // Mock an active animation frame
      (window as any).__AUTO_SCROLL_ID__ = 123;

      const error = new Error('Auto-scroll error');
      await service.handleDragError(error, DragErrorType.AUTO_SCROLL_FAILED);

      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(123);
      expect((window as any).__AUTO_SCROLL_ID__).toBeUndefined();
    });
  });

  describe('error statistics and history', () => {
    it('tracks error history', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await service.handleDragError(error1, DragErrorType.DRAG_START_FAILED);
      await service.handleDragError(error2, DragErrorType.DROP_FAILED);

      const stats = service.getErrorStatistics();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType[DragErrorType.DRAG_START_FAILED]).toBe(1);
      expect(stats.errorsByType[DragErrorType.DROP_FAILED]).toBe(1);
      expect(stats.recentErrors).toHaveLength(2);
    });

    it('limits error history size', async () => {
      const service = new DragErrorRecoveryService();

      // Add more errors than the max history size (50)
      for (let i = 0; i < 60; i++) {
        await service.handleDragError(
          new Error(`Error ${i}`),
          DragErrorType.DRAG_START_FAILED
        );
      }

      const stats = service.getErrorStatistics();
      expect(stats.totalErrors).toBe(50); // Should be capped at max
    });

    it('clears error history', async () => {
      await service.handleDragError(
        new Error('Test error'),
        DragErrorType.DRAG_START_FAILED
      );

      let stats = service.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);

      service.clearErrorHistory();

      stats = service.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.recoveryAttempts)).toHaveLength(0);
    });
  });

  describe('error logging', () => {
    it('logs comprehensive error information', async () => {
      const error = new Error('Test error');
      const draggedItem = {
        id: 'test-track',
        type: 'internal-track' as const,
        payload: { track: { id: 'test' }, index: 0 },
        timestamp: Date.now(),
      };

      await service.handleDragError(error, DragErrorType.DRAG_START_FAILED, {
        draggedItem,
        isDragging: true,
        additionalContext: { customData: 'test' },
      });

      expect(console.error).toHaveBeenCalledWith(
        '[DragErrorRecovery] Drag operation error:',
        expect.objectContaining({
          type: DragErrorType.DRAG_START_FAILED,
          message: 'Test error',
          stack: expect.any(String),
          draggedItem,
          isDragging: true,
          timestamp: expect.any(Number),
          userAgent: 'test-user-agent',
          url: 'http://test.com',
          additionalContext: { customData: 'test' },
        })
      );
    });
  });

  describe('error reporting integration', () => {
    it('reports errors to external service when available', async () => {
      const mockErrorReporting = {
        captureException: jest.fn(),
      };

      (window as any).__ERROR_REPORTING__ = mockErrorReporting;

      const error = new Error('Test error');
      const result = await service.handleDragError(
        error,
        DragErrorType.DRAG_START_FAILED
      );

      expect(mockErrorReporting.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            errorType: DragErrorType.DRAG_START_FAILED,
            component: 'drag-system',
            recoverySuccess: true,
          }),
          extra: expect.objectContaining({
            dragContext: expect.any(Object),
            recoveryResult: result,
          }),
        })
      );

      delete (window as any).__ERROR_REPORTING__;
    });

    it('handles error reporting failures gracefully', async () => {
      const mockErrorReporting = {
        captureException: jest.fn(() => {
          throw new Error('Reporting failed');
        }),
      };

      (window as any).__ERROR_REPORTING__ = mockErrorReporting;

      const error = new Error('Test error');

      // Should not throw even if reporting fails
      await expect(
        service.handleDragError(error, DragErrorType.DRAG_START_FAILED)
      ).resolves.toBeDefined();

      expect(console.warn).toHaveBeenCalledWith(
        '[DragErrorRecovery] Failed to report error:',
        expect.any(Error)
      );

      delete (window as any).__ERROR_REPORTING__;
    });
  });

  describe('recovery failure handling', () => {
    it('handles recovery method failures gracefully', async () => {
      // Mock a recovery method to throw
      const originalResetVisualFeedback = (service as any).resetVisualFeedback;
      (service as any).resetVisualFeedback = jest.fn(() => {
        throw new Error('Reset failed');
      });

      const error = new Error('Test error');
      const result = await service.handleDragError(
        error,
        DragErrorType.VISUAL_FEEDBACK_FAILED
      );

      // Should still return success even if individual recovery steps fail
      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        '[DragErrorRecovery] Failed to reset visual feedback:',
        expect.any(Error)
      );

      // Restore original method
      (service as any).resetVisualFeedback = originalResetVisualFeedback;
    });
  });

  describe('singleton service', () => {
    it('exports a singleton instance', () => {
      expect(dragErrorRecoveryService).toBeInstanceOf(DragErrorRecoveryService);
    });

    it('maintains state across calls', async () => {
      await dragErrorRecoveryService.handleDragError(
        new Error('Test'),
        DragErrorType.DRAG_START_FAILED
      );

      const stats = dragErrorRecoveryService.getErrorStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });
  });
});
