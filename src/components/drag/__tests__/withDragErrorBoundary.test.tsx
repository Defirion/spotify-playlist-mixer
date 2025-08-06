import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import withDragErrorBoundary, {
  createDragSafeComponent,
  withTrackListErrorBoundary,
  withModalErrorBoundary,
  withTrackItemErrorBoundary,
} from '../withDragErrorBoundary';
import { useAppStore } from '../../../store';

// Mock the store
jest.mock('../../../store', () => ({
  useAppStore: jest.fn(),
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock console methods
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
const WorkingComponent = ({ testProp }: { testProp?: string }) => (
  <div>Working Component {testProp}</div>
);

const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>No Error</div>;
};

describe('withDragErrorBoundary', () => {
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

  describe('basic HOC functionality', () => {
    it('renders wrapped component correctly when no error occurs', () => {
      const WrappedComponent = withDragErrorBoundary(WorkingComponent);

      render(<WrappedComponent testProp="hello" />);

      expect(screen.getByText('Working Component hello')).toBeInTheDocument();
    });

    it('sets correct display name', () => {
      const WrappedComponent = withDragErrorBoundary(WorkingComponent);
      expect(WrappedComponent.displayName).toBe(
        'withDragErrorBoundary(WorkingComponent)'
      );
    });

    it('handles anonymous components', () => {
      const AnonymousComponent = () => <div>Anonymous</div>;
      const WrappedComponent = withDragErrorBoundary(AnonymousComponent);

      render(<WrappedComponent />);
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });

    it('passes through component props correctly', () => {
      interface TestProps {
        title: string;
        count: number;
        onClick: () => void;
      }

      const TestComponent = ({ title, count, onClick }: TestProps) => (
        <div>
          <h1>{title}</h1>
          <span>{count}</span>
          <button onClick={onClick}>Click</button>
        </div>
      );

      const WrappedComponent = withDragErrorBoundary(TestComponent);
      const mockClick = jest.fn();

      render(
        <WrappedComponent title="Test Title" count={42} onClick={mockClick} />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('catches errors and shows drag-specific error UI', () => {
      const WrappedComponent = withDragErrorBoundary(ErrorThrowingComponent);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Drag Operation Failed')).toBeInTheDocument();
    });

    it('calls custom error handler when provided', () => {
      const mockErrorHandler = jest.fn();
      const WrappedComponent = withDragErrorBoundary(ErrorThrowingComponent, {
        onDragError: mockErrorHandler,
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('uses custom fallback when provided', () => {
      const customFallback = () => <div>Custom Drag Error</div>;
      const WrappedComponent = withDragErrorBoundary(ErrorThrowingComponent, {
        dragErrorFallback: customFallback,
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Custom Drag Error')).toBeInTheDocument();
    });

    it('merges HOC props with component props', () => {
      const hocErrorHandler = jest.fn();
      const componentErrorHandler = jest.fn();

      const WrappedComponent = withDragErrorBoundary(ErrorThrowingComponent, {
        onDragError: hocErrorHandler,
      });

      render(
        <WrappedComponent
          shouldThrow={true}
          onDragError={componentErrorHandler}
        />
      );

      // Component props should take precedence
      expect(componentErrorHandler).toHaveBeenCalled();
      expect(hocErrorHandler).not.toHaveBeenCalled();
    });
  });

  describe('createDragSafeComponent', () => {
    it('creates component with default error logging', () => {
      const SafeComponent = createDragSafeComponent(ErrorThrowingComponent);

      render(<SafeComponent shouldThrow={true} />);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ErrorThrowingComponent] Drag operation error:'
        ),
        expect.any(Object)
      );
    });

    it('uses custom component name in logs', () => {
      const SafeComponent = createDragSafeComponent(ErrorThrowingComponent, {
        componentName: 'CustomName',
      });

      render(<SafeComponent shouldThrow={true} />);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[CustomName] Drag operation error:'),
        expect.any(Object)
      );
    });

    it('can disable error logging', () => {
      const SafeComponent = createDragSafeComponent(ErrorThrowingComponent, {
        logErrors: false,
      });

      render(<SafeComponent shouldThrow={true} />);

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Drag operation error:'),
        expect.any(Object)
      );
    });

    it('calls external error reporting service', () => {
      const mockReportToService = jest.fn();
      const SafeComponent = createDragSafeComponent(ErrorThrowingComponent, {
        reportToService: mockReportToService,
      });

      render(<SafeComponent shouldThrow={true} />);

      expect(mockReportToService).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('handles error reporting service failures gracefully', () => {
      const mockReportToService = jest.fn(() => {
        throw new Error('Reporting service error');
      });

      const SafeComponent = createDragSafeComponent(ErrorThrowingComponent, {
        reportToService: mockReportToService,
      });

      // Should not throw even if reporting fails
      expect(() => {
        render(<SafeComponent shouldThrow={true} />);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to report drag error to monitoring service:',
        expect.any(Error)
      );
    });
  });

  describe('pre-configured HOCs', () => {
    it('withTrackListErrorBoundary works correctly', () => {
      const TrackListComponent = () => <div>Track List</div>;
      const SafeTrackList = withTrackListErrorBoundary(TrackListComponent);

      render(<SafeTrackList />);
      expect(screen.getByText('Track List')).toBeInTheDocument();
      expect(SafeTrackList.displayName).toContain('TrackListComponent');
    });

    it('withModalErrorBoundary works correctly', () => {
      const ModalComponent = () => <div>Modal</div>;
      const SafeModal = withModalErrorBoundary(ModalComponent);

      render(<SafeModal />);
      expect(screen.getByText('Modal')).toBeInTheDocument();
      expect(SafeModal.displayName).toContain('ModalComponent');
    });

    it('withTrackItemErrorBoundary works correctly', () => {
      const TrackItemComponent = () => <div>Track Item</div>;
      const SafeTrackItem = withTrackItemErrorBoundary(TrackItemComponent);

      render(<SafeTrackItem />);
      expect(screen.getByText('Track Item')).toBeInTheDocument();
      expect(SafeTrackItem.displayName).toContain('TrackItemComponent');
    });

    it('withTrackItemErrorBoundary only logs in development', () => {
      const originalNodeEnv = process.env.NODE_ENV;

      // Test production mode
      process.env.NODE_ENV = 'production';
      const SafeTrackItem = withTrackItemErrorBoundary(ErrorThrowingComponent);

      render(<SafeTrackItem shouldThrow={true} />);

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Drag operation error:'),
        expect.any(Object)
      );

      // Reset and test development mode
      jest.clearAllMocks();
      process.env.NODE_ENV = 'development';

      const SafeTrackItemDev = withTrackItemErrorBoundary(
        ErrorThrowingComponent
      );
      render(<SafeTrackItemDev shouldThrow={true} />);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ErrorThrowingComponent] Drag operation error:'
        ),
        expect.any(Object)
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('TypeScript integration', () => {
    it('preserves component prop types', () => {
      interface StrictProps {
        requiredProp: string;
        optionalProp?: number;
      }

      const StrictComponent = ({ requiredProp, optionalProp }: StrictProps) => (
        <div>
          {requiredProp} {optionalProp}
        </div>
      );

      const WrappedComponent = withDragErrorBoundary(StrictComponent);

      // This should compile without TypeScript errors
      render(<WrappedComponent requiredProp="test" optionalProp={42} />);

      expect(screen.getByText('test 42')).toBeInTheDocument();
    });
  });
});
