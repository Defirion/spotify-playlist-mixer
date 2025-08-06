import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import DragErrorBoundary from '../DragErrorBoundary';
import { useAppStore } from '../../../store';

// Mock the store
jest.mock('../../../store', () => ({
  useAppStore: jest.fn(),
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock console methods to prevent test output clutter
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Test components
const WorkingComponent = () => <div>Working Component</div>;

const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No Error</div>;
};

describe('DragErrorBoundary', () => {
  const mockDragState = {
    isDragging: false,
    draggedItem: null,
    endDrag: jest.fn(),
    cancelDrag: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue(mockDragState);
  });

  it('renders children when no error occurs', () => {
    render(
      <DragErrorBoundary>
        <WorkingComponent />
      </DragErrorBoundary>
    );

    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  it('displays drag-specific error UI when error occurs', () => {
    render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(screen.getByText('Drag Operation Failed')).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong while moving your tracks/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('cleans up drag state when error occurs during drag', () => {
    const mockDragStateWithDrag = {
      ...mockDragState,
      isDragging: true,
      draggedItem: {
        id: 'test-track',
        type: 'internal-track' as const,
        payload: { track: { id: 'test' }, index: 0 },
        timestamp: Date.now(),
      },
    };

    mockUseAppStore.mockReturnValue(mockDragStateWithDrag);

    render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(mockDragStateWithDrag.cancelDrag).toHaveBeenCalled();
  });

  it('calls custom error handler when provided', () => {
    const mockErrorHandler = jest.fn();

    render(
      <DragErrorBoundary onError={mockErrorHandler}>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('uses custom fallback when provided', () => {
    const customFallback = () => <div>Custom Error Fallback</div>;

    render(
      <DragErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Drag Operation Failed')).not.toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const { rerender } = render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(screen.getByText('Drag Operation Failed')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });

    fireEvent.click(retryButton);

    // After retry, rerender with no error
    rerender(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </DragErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('No Error')).toBeInTheDocument();
    });
  });

  it('cleans up body styles when error occurs', () => {
    // Set up body styles as if drag was active
    document.body.classList.add('no-user-select', 'drag-active');
    document.body.style.position = 'fixed';
    document.body.style.top = '-100px';

    const mockDragStateWithDrag = {
      ...mockDragState,
      isDragging: true,
      draggedItem: { id: 'test', type: 'internal-track' as const },
    };

    mockUseAppStore.mockReturnValue(mockDragStateWithDrag);

    render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    // Check that body styles were cleaned up
    expect(document.body.classList.contains('no-user-select')).toBe(false);
    expect(document.body.classList.contains('drag-active')).toBe(false);
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
  });

  it('shows developer details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockDragStateWithItem = {
      ...mockDragState,
      isDragging: true,
      draggedItem: {
        id: 'test-track',
        type: 'internal-track' as const,
        payload: { track: { id: 'test' }, index: 0 },
        timestamp: Date.now(),
      },
    };

    mockUseAppStore.mockReturnValue(mockDragStateWithItem);

    render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(screen.getByText('🔧 Developer Details')).toBeInTheDocument();

    // Click to expand details
    const detailsToggle = screen.getByText('🔧 Developer Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Drag Context:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('handles cleanup errors gracefully', () => {
    const mockDragStateWithError = {
      ...mockDragState,
      isDragging: true,
      cancelDrag: jest.fn(() => {
        throw new Error('Cleanup error');
      }),
    };

    mockUseAppStore.mockReturnValue(mockDragStateWithError);

    // Should not throw even if cleanup fails
    expect(() => {
      render(
        <DragErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </DragErrorBoundary>
      );
    }).not.toThrow();

    expect(screen.getByText('Drag Operation Failed')).toBeInTheDocument();
  });

  it('logs comprehensive error information', () => {
    const mockDragStateWithItem = {
      ...mockDragState,
      isDragging: true,
      draggedItem: {
        id: 'test-track',
        type: 'internal-track' as const,
        payload: { track: { id: 'test' }, index: 0 },
        timestamp: Date.now(),
      },
    };

    mockUseAppStore.mockReturnValue(mockDragStateWithItem);

    render(
      <DragErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </DragErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      '[DragErrorBoundary] Drag operation error caught:',
      expect.objectContaining({
        error: 'Test error',
        isDragging: true,
        draggedItem: expect.objectContaining({
          id: 'test-track',
          type: 'internal-track',
        }),
        timestamp: expect.any(Number),
      })
    );
  });

  it('handles missing drag state gracefully', () => {
    mockUseAppStore.mockReturnValue({
      isDragging: false,
      draggedItem: null,
      endDrag: undefined,
      cancelDrag: undefined,
    });

    // Should not throw even with missing methods
    expect(() => {
      render(
        <DragErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </DragErrorBoundary>
      );
    }).not.toThrow();

    expect(screen.getByText('Drag Operation Failed')).toBeInTheDocument();
  });
});
