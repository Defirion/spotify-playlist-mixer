import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiErrorDisplay, {
  ApiErrorData,
} from '../../components/ui/ApiErrorDisplay';
import { ERROR_TYPES } from '../../services/apiErrorHandler';

// Mock error data for testing
const createMockError = (
  overrides: Partial<ApiErrorData> = {}
): ApiErrorData => ({
  type: ERROR_TYPES.NETWORK,
  title: '🌐 Network Error',
  message: "Unable to connect to Spotify's servers.",
  suggestions: [
    'Check your internet connection',
    'Try again in a few moments',
    "Spotify's API might be temporarily unavailable",
  ],
  retryable: true,
  timestamp: '2023-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ApiErrorDisplay', () => {
  describe('Rendering', () => {
    it('renders nothing when error is null', () => {
      const { container } = render(<ApiErrorDisplay error={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders error title and message', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('🌐 Network Error')).toBeInTheDocument();
      expect(
        screen.getByText("Unable to connect to Spotify's servers.")
      ).toBeInTheDocument();
    });

    it('renders suggestions when provided', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('💡 What you can try:')).toBeInTheDocument();
      expect(
        screen.getByText('Check your internet connection')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Try again in a few moments')
      ).toBeInTheDocument();
      expect(
        screen.getByText("Spotify's API might be temporarily unavailable")
      ).toBeInTheDocument();
    });

    it('does not render suggestions when not provided', () => {
      const error = createMockError({ suggestions: undefined });
      render(<ApiErrorDisplay error={error} />);

      expect(
        screen.queryByText('💡 What you can try:')
      ).not.toBeInTheDocument();
    });

    it('renders with custom className and style', () => {
      const error = createMockError();
      const customStyle = { backgroundColor: 'red' };
      render(
        <ApiErrorDisplay
          error={error}
          className="custom-class"
          style={customStyle}
          testId="error-display"
        />
      );

      const errorContainer = screen.getByTestId('error-display');
      expect(errorContainer).toHaveClass('custom-class');
      expect(errorContainer).toHaveStyle('background-color: red');
    });
  });

  describe('Error Types', () => {
    it('renders correct icon for network error', () => {
      const error = createMockError({ type: ERROR_TYPES.NETWORK });
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('🌐')).toBeInTheDocument();
    });

    it('renders correct icon for authentication error', () => {
      const error = createMockError({
        type: ERROR_TYPES.AUTHENTICATION,
        title: '🔑 Authentication Error',
      });
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('🔑')).toBeInTheDocument();
    });

    it('renders correct icon for rate limit error', () => {
      const error = createMockError({
        type: ERROR_TYPES.RATE_LIMIT,
        title: '⏱️ Too Many Requests',
      });
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('⏱️')).toBeInTheDocument();
    });

    it('applies correct CSS classes for different error types', () => {
      const { rerender } = render(
        <ApiErrorDisplay
          error={createMockError({ type: ERROR_TYPES.NETWORK })}
          testId="error-display"
        />
      );

      expect(screen.getByTestId('error-display')).toHaveClass('network');

      rerender(
        <ApiErrorDisplay
          error={createMockError({ type: ERROR_TYPES.AUTHENTICATION })}
          testId="error-display"
        />
      );
      expect(screen.getByTestId('error-display')).toHaveClass('authentication');

      rerender(
        <ApiErrorDisplay
          error={createMockError({ type: ERROR_TYPES.RATE_LIMIT })}
          testId="error-display"
        />
      );
      expect(screen.getByTestId('error-display')).toHaveClass('rateLimit');
    });
  });

  describe('Action Buttons', () => {
    it('renders retry button when error is retryable and onRetry is provided', () => {
      const onRetry = jest.fn();
      const error = createMockError({ retryable: true });
      render(<ApiErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = screen.getByText('🔄 Try Again');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when error is not retryable', () => {
      const onRetry = jest.fn();
      const error = createMockError({ retryable: false });
      render(<ApiErrorDisplay error={error} onRetry={onRetry} />);

      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument();
    });

    it('does not render retry button when onRetry is not provided', () => {
      const error = createMockError({ retryable: true });
      render(<ApiErrorDisplay error={error} />);

      expect(screen.queryByText('🔄 Try Again')).not.toBeInTheDocument();
    });

    it('renders dismiss button when onDismiss is provided', () => {
      const onDismiss = jest.fn();
      const error = createMockError();
      render(<ApiErrorDisplay error={error} onDismiss={onDismiss} />);

      const dismissButtons = screen.getAllByText('✕ Dismiss');
      expect(dismissButtons).toHaveLength(1);

      fireEvent.click(dismissButtons[0]);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders close button when onDismiss is provided', () => {
      const onDismiss = jest.fn();
      const error = createMockError();
      render(<ApiErrorDisplay error={error} onDismiss={onDismiss} />);

      const closeButtons = screen.getAllByTitle('Dismiss error');
      expect(closeButtons).toHaveLength(1);

      fireEvent.click(closeButtons[0]);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders details button when showDetails is true', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      expect(screen.getByText('🔽 Show Details')).toBeInTheDocument();
    });

    it('does not render details button when showDetails is false', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} showDetails={false} />);

      expect(screen.queryByText('🔽 Show Details')).not.toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('toggles technical details when details button is clicked', () => {
      const error = createMockError({
        status: 500,
        statusText: 'Internal Server Error',
        context: { userId: '123' },
        originalError: { message: 'Connection failed' },
      });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('🔼 Hide Details')).toBeInTheDocument();
      expect(screen.getByText('🔧 Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Error Type:')).toBeInTheDocument();
      expect(screen.getByText('Timestamp:')).toBeInTheDocument();
    });

    it('displays HTTP status when available', () => {
      const error = createMockError({
        status: 404,
        statusText: 'Not Found',
      });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('HTTP Status:')).toBeInTheDocument();
      expect(screen.getByText('404 Not Found')).toBeInTheDocument();
    });

    it('displays context when available', () => {
      const error = createMockError({
        context: { playlistId: 'abc123', userId: 'user456' },
      });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('Context:')).toBeInTheDocument();
      expect(screen.getByText(/"playlistId": "abc123"/)).toBeInTheDocument();
      expect(screen.getByText(/"userId": "user456"/)).toBeInTheDocument();
    });

    it('displays original error when available', () => {
      const error = createMockError({
        originalError: { message: 'Network timeout occurred' },
      });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('Original Error:')).toBeInTheDocument();
      expect(screen.getByText('Network timeout occurred')).toBeInTheDocument();
    });

    it('formats timestamp correctly', () => {
      const timestamp = '2023-12-25T10:30:00.000Z';
      const error = createMockError({ timestamp });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      const expectedDate = new Date(timestamp).toLocaleString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles and titles', () => {
      const onRetry = jest.fn();
      const onDismiss = jest.fn();
      const error = createMockError({ retryable: true });
      render(
        <ApiErrorDisplay
          error={error}
          onRetry={onRetry}
          onDismiss={onDismiss}
          showDetails={true}
        />
      );

      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /dismiss/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /show details/i })
      ).toBeInTheDocument();
      expect(screen.getByTitle('Dismiss error')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('has proper list structure for suggestions', () => {
      const error = createMockError();
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty suggestions array', () => {
      const error = createMockError({ suggestions: [] });
      render(<ApiErrorDisplay error={error} />);

      expect(
        screen.queryByText('💡 What you can try:')
      ).not.toBeInTheDocument();
    });

    it('handles missing context object', () => {
      const error = createMockError({ context: undefined });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.queryByText('Context:')).not.toBeInTheDocument();
    });

    it('handles empty context object', () => {
      const error = createMockError({ context: {} });
      render(<ApiErrorDisplay error={error} showDetails={true} />);

      const detailsButton = screen.getByText('🔽 Show Details');
      fireEvent.click(detailsButton);

      expect(screen.queryByText('Context:')).not.toBeInTheDocument();
    });

    it('handles unknown error type gracefully', () => {
      const error = createMockError({
        type: 'INVALID_TYPE' as any,
        title: 'Unknown Error',
      });
      render(<ApiErrorDisplay error={error} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Unknown Error')).toBeInTheDocument();
    });
  });
});
