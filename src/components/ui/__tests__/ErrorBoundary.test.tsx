// React import removed - using automatic JSX runtime
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Silence Policy compliance: prefer per-suite spies instead of module-scoped reassignment.
let consoleErrorSpy: import('vitest').MockInstance;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy?.mockRestore?.();
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('shows fallback UI when an error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(
        "The application encountered an unexpected error and couldn't continue."
      )
    ).toBeInTheDocument();

    // Check for buttons in fallback UI
    expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
    expect(screen.getByText('🔃 Refresh Page')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const ErrorThrower = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test Error');
      }
      return <div>Test Child</div>;
    };

    const { rerender } = render(
      <ErrorBoundary key="err-1">
        <ErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify error state is shown
    expect(screen.getByText('🚨 Something went wrong')).toBeInTheDocument();

    // Click "Try Again" button to reset the error
    const tryAgainButton = screen.getByText('🔄 Try Again');
    fireEvent.click(tryAgainButton);

    // Rerender with shouldThrow=false to simulate recovery
    rerender(
      <ErrorBoundary key="err-2">
        <ErrorThrower shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should render children now (no more errors)
    await screen.findByText('Test Child');
  });

  it('handles reload functionality', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>
    );

    const reloadSpy = vi.spyOn(window, 'location', 'get');
    // @ts-ignore
    reloadSpy.mockReturnValue({ reload: vi.fn() });

    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByText('🔃 Refresh Page');
    fireEvent.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('calls onError prop when an error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test Error');
    };
    const handleError = vi.fn();

    render(
      <ErrorBoundary onError={handleError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('uses custom fallback when provided', () => {
    const ThrowError = () => {
      throw new Error('Test Error');
    };

    const CustomFallback = ({
      error,
      errorInfo: _errorInfo,
      handleRetry,
    }: {
      error?: Error;
      errorInfo?: any;
      handleRetry?: () => void;
    }) => (
      <div>
        <h1>Custom Error Fallback</h1>
        <p>{error?.message}</p>
        <button onClick={handleRetry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary
        fallback={(error, errorInfo, handleRetry) => (
          <CustomFallback
            error={error || undefined}
            errorInfo={errorInfo || undefined}
            handleRetry={handleRetry}
          />
        )}
      >
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('renders developer details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('🔧 Developer Details (Development Mode)')
    ).toBeInTheDocument();
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    const errorMessages = screen.getAllByText(/Error: Test Error/);
    expect(errorMessages).toHaveLength(2);
    expect(screen.getByText(/Component Stack:/)).toBeInTheDocument();
    expect(screen.getByText(/Stack Trace:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not render developer details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(
      screen.queryByText('🔧 Developer Details (Development Mode)')
    ).not.toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });
});
