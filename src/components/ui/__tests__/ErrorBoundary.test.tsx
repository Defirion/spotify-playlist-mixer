import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock console.error to prevent test logs from cluttering the output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
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
      <ErrorBoundary key={true}>
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
      <ErrorBoundary key={false}>
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

    const reloadSpy = jest.spyOn(window, 'location', 'get');
    // @ts-ignore
    reloadSpy.mockReturnValue({ reload: jest.fn() });

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
    const handleError = jest.fn();

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

    const CustomFallback = ({ error, errorInfo, handleRetry }) => (
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
            error={error}
            errorInfo={errorInfo}
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
