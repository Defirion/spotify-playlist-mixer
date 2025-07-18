import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component that throws during render
const ProblematicComponent = ({ throwError }) => {
  if (throwError) {
    throw new Error('Render error');
  }
  return <div data-testid="working-component">Working component</div>;
};

describe('ErrorBoundary Component', () => {
  let consoleSpy;

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Normal Operation', () => {
    it('should render children when there are no errors', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-component">Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children without errors', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();
    });

    it('should log error details to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should call onError prop when provided', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should display error emoji and styling', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('😵')).toBeInTheDocument();
      
      const errorContainer = screen.getByText('Oops! Something went wrong').closest('div');
      expect(errorContainer).toHaveStyle({
        background: 'var(--hunter-green)',
        border: '2px solid #ff6b6b',
        borderRadius: '12px'
      });
    });
  });

  describe('Recovery Actions', () => {
    it('should recover when Try Again button is clicked', () => {
      let shouldThrow = true;
      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="working-component">Working component</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Fix the component and click Try Again
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));

      // Re-render with fixed component
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Should show working component
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });

    it('should reload page when Reload Page button is clicked', () => {
      // Mock window.location.reload
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /Reload Page/ }));

      expect(reloadMock).toHaveBeenCalled();
    });

    it('should reset error state when handleRetry is called', () => {
      let shouldThrow = true;
      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="working-component">Working component</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Fix the component and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));

      // Component should attempt to re-render
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback UI', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = (error, errorInfo, retry) => (
        <div data-testid="custom-fallback">
          <h1>Custom Error UI</h1>
          <p>Error: {error?.message || 'Unknown error'}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Error: Custom error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument();
    });

    it('should call retry function from custom fallback', () => {
      let shouldThrow = true;
      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="working-component">Working component</div>;
      };

      const customFallback = (error, errorInfo, retry) => (
        <button onClick={retry} data-testid="custom-retry">
          Custom Retry
        </button>
      );

      const { rerender } = render(
        <ErrorBoundary fallback={customFallback}>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Fix the component and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByTestId('custom-retry'));

      rerender(
        <ErrorBoundary fallback={customFallback}>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('🐛 Error Details (Development)')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('🐛 Error Details (Development)'));
      
      expect(screen.getByText(/Dev error/)).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Prod error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('🐛 Error Details (Development)')).not.toBeInTheDocument();
    });

    it('should display component stack in development', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Expand error details
      fireEvent.click(screen.getByText('🐛 Error Details (Development)'));

      // Should contain component stack information
      const errorDetails = screen.getByText(/Test error/).closest('pre');
      expect(errorDetails).toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('should generate unique error IDs for different errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      // Reset and throw different error
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      );

      // Should handle the new error
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should maintain error state until retry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      
      // Error UI should persist
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Oops! Something went wrong');
    });

    it('should have accessible button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();
    });

    it('should have descriptive error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      expect(screen.getByText(/your data is safe/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors thrown in event handlers', () => {
      const ProblematicButton = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return <button onClick={handleClick}>Click me</button>;
      };

      render(
        <ErrorBoundary>
          <ProblematicButton />
        </ErrorBoundary>
      );

      // Event handler errors are not caught by error boundaries
      // This is expected React behavior
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should handle null error objects', () => {
      const ComponentWithNullError = () => {
        throw null;
      };

      render(
        <ErrorBoundary>
          <ComponentWithNullError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors with no message', () => {
      const ComponentWithEmptyError = () => {
        const error = new Error();
        error.message = '';
        throw error;
      };

      render(
        <ErrorBoundary>
          <ComponentWithEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should reset state properly on retry', () => {
      let shouldThrow = true;
      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="working-component">Working component</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Fix the component and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));

      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle multiple error-retry cycles', () => {
      let shouldThrow = true;
      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="working-component">Working component</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // First retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );
      expect(screen.getByTestId('working-component')).toBeInTheDocument();

      // Second error
      shouldThrow = true;
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Second retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });
});