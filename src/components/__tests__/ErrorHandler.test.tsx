import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorHandler from '../ErrorHandler';
import { ApiError } from '../../services/apiErrorHandler';

// Mock the ApiErrorDisplay component
jest.mock('../ui/ApiErrorDisplay', () => {
  return function MockApiErrorDisplay({
    error,
    onRetry,
    onDismiss,
    showDetails,
    className,
    testId,
  }: any) {
    return (
      <div data-testid={testId || 'api-error-display'} className={className}>
        <div>API Error: {error.title}</div>
        <div>{error.message}</div>
        {onRetry && <button onClick={onRetry}>API Retry</button>}
        {onDismiss && <button onClick={onDismiss}>API Dismiss</button>}
        {showDetails !== undefined && (
          <div>Show Details: {showDetails.toString()}</div>
        )}
      </div>
    );
  };
});

describe('ErrorHandler', () => {
  const mockOnDismiss = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when error is null', () => {
    render(<ErrorHandler error={null} testId="error-handler" />);
    expect(screen.queryByTestId('error-handler')).not.toBeInTheDocument();
  });

  it('renders nothing when error is undefined', () => {
    render(<ErrorHandler error={undefined as any} testId="error-handler" />);
    expect(screen.queryByTestId('error-handler')).not.toBeInTheDocument();
  });

  it('renders ApiErrorDisplay for ApiError instances', () => {
    const apiError = new ApiError('NETWORK', new Error('Network failed'));

    render(
      <ErrorHandler
        error={apiError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        testId="error-handler"
      />
    );

    expect(screen.getByTestId('error-handler')).toBeInTheDocument();
    expect(screen.getByText('API Error: 🌐 Network Error')).toBeInTheDocument();
  });

  it('passes correct props to ApiErrorDisplay', () => {
    const apiError = new ApiError('AUTHENTICATION', new Error('Auth failed'));

    render(
      <ErrorHandler
        error={apiError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        className="custom-class"
        testId="custom-test-id"
      />
    );

    const apiErrorDisplay = screen.getByTestId('custom-test-id');
    expect(apiErrorDisplay).toHaveClass('custom-class');
    expect(screen.getByText('API Retry')).toBeInTheDocument();
    expect(screen.getByText('API Dismiss')).toBeInTheDocument();
  });

  it('shows development details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const apiError = new ApiError('SERVER_ERROR', new Error('Server failed'));

    render(<ErrorHandler error={apiError} />);

    expect(screen.getByText('Show Details: true')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides development details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const apiError = new ApiError('SERVER_ERROR', new Error('Server failed'));

    render(<ErrorHandler error={apiError} />);

    expect(screen.getByText('Show Details: false')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  describe('Generic Error Handling', () => {
    it('renders generic error for string errors', () => {
      render(
        <ErrorHandler
          error="Something went wrong"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('⚠️ Something Went Wrong')).toBeInTheDocument();
      expect(
        screen.getByText('An unexpected error occurred.')
      ).toBeInTheDocument();
      expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
      expect(screen.getByText('✕ Dismiss')).toBeInTheDocument();
    });

    it('renders generic error for Error objects', () => {
      const error = new Error('Test error message');

      render(
        <ErrorHandler
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('⚠️ Something Went Wrong')).toBeInTheDocument();
      expect(
        screen.getByText('An unexpected error occurred.')
      ).toBeInTheDocument();
    });

    it('handles client errors correctly', () => {
      render(
        <ErrorHandler
          error="invalid_client error occurred"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(
        screen.getByText('🔑 Spotify Connection Issue')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "There's a problem with the Spotify app configuration."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('Try refreshing the page and connecting again')
      ).toBeInTheDocument();
    });

    it('handles redirect errors correctly', () => {
      render(
        <ErrorHandler
          error="redirect uri mismatch"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('🔄 Redirect Error')).toBeInTheDocument();
      expect(
        screen.getByText("There's an issue with the authentication redirect.")
      ).toBeInTheDocument();
    });

    it('handles network errors correctly', () => {
      render(
        <ErrorHandler
          error="Network Error: Failed to fetch"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('🌐 Network Error')).toBeInTheDocument();
      expect(
        screen.getByText("Unable to connect to Spotify's servers.")
      ).toBeInTheDocument();
    });

    it('handles 404 errors correctly', () => {
      render(
        <ErrorHandler
          error="playlist not found 404"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('📋 Playlist Not Found')).toBeInTheDocument();
      expect(
        screen.getByText("The playlist URL you entered couldn't be found.")
      ).toBeInTheDocument();
      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument(); // Should not be retryable
    });

    it('handles 403 errors correctly', () => {
      render(
        <ErrorHandler
          error="access denied 403"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('🚫 Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to access this playlist.")
      ).toBeInTheDocument();
      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument(); // Should not be retryable
    });

    it('handles rate limit errors correctly', () => {
      render(
        <ErrorHandler
          error="rate limit exceeded 429"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('⏱️ Too Many Requests')).toBeInTheDocument();
      expect(
        screen.getByText("You're making requests too quickly.")
      ).toBeInTheDocument();
      expect(screen.getByText('🔄 Try Again')).toBeInTheDocument(); // Should be retryable
    });

    it('handles empty playlist errors correctly', () => {
      render(
        <ErrorHandler
          error="no tracks found in playlist"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('🎵 No Songs Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          "The selected playlists don't have enough songs to mix."
        )
      ).toBeInTheDocument();
      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument(); // Should not be retryable
    });
  });

  describe('User Interactions', () => {
    it('calls onRetry when retry button is clicked', () => {
      render(
        <ErrorHandler
          error="network error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.click(screen.getByText('🔄 Try Again'));
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      render(
        <ErrorHandler
          error="test error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.click(screen.getByText('✕ Dismiss'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when close button is clicked', () => {
      render(
        <ErrorHandler
          error="test error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.click(screen.getByLabelText('Close error message'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorHandler error="network error" onDismiss={mockOnDismiss} />);

      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument();
    });

    it('does not render dismiss buttons when onDismiss is not provided', () => {
      render(<ErrorHandler error="test error" onRetry={mockOnRetry} />);

      expect(screen.queryByText('✕ Dismiss')).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText('Close error message')
      ).not.toBeInTheDocument();
    });

    it('does not render retry button for non-retryable errors', () => {
      render(
        <ErrorHandler
          error="playlist not found"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('✕ Dismiss')).toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('shows technical details section', () => {
      render(<ErrorHandler error="test error message" />);

      expect(screen.getByText('🔧 Technical Details')).toBeInTheDocument();
      expect(screen.getByText('test error message')).toBeInTheDocument();
    });

    it('shows error message for Error objects in technical details', () => {
      const error = new Error('Detailed error message');
      render(<ErrorHandler error={error} />);

      expect(screen.getByText('Detailed error message')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      render(
        <ErrorHandler
          error="test error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByLabelText('Try again')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
      expect(screen.getByLabelText('Close error message')).toBeInTheDocument();
    });

    it('has proper button types', () => {
      render(
        <ErrorHandler
          error="test error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('CSS Classes and Test IDs', () => {
    it('applies custom className', () => {
      render(
        <ErrorHandler
          error="test error"
          className="custom-error-class"
          testId="custom-error-handler"
        />
      );

      const errorContainer = screen.getByTestId('custom-error-handler');
      expect(errorContainer).toHaveClass('custom-error-class');
    });

    it('applies default CSS classes', () => {
      render(<ErrorHandler error="test error" testId="error-handler" />);

      const errorContainer = screen.getByTestId('error-handler');
      expect(errorContainer).toHaveClass('errorContainer');
    });
  });
});
