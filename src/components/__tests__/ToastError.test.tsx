import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ToastError from '../ToastError';

describe('ToastError', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnDismiss.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render when error is null or undefined', () => {
    // Test with null - should render nothing
    render(<ToastError error={null} onDismiss={mockOnDismiss} />);

    expect(
      screen.queryByText(/This is an error message/i)
    ).not.toBeInTheDocument();

    // For undefined case, we need to check the component doesn't exist in DOM
    render(<ToastError error={undefined} onDismiss={mockOnDismiss} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders correctly when an error message is provided', () => {
    const errorMessage = 'This is an error message';
    render(<ToastError error={errorMessage} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const errorMessage = 'Test error message';
    render(<ToastError error={errorMessage} onDismiss={mockOnDismiss} />);

    fireEvent.click(screen.getByLabelText('Close notification'));

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss after 8 seconds when an error is present', () => {
    const errorMessage = 'Test error message';
    render(<ToastError error={errorMessage} onDismiss={mockOnDismiss} />);

    jest.runAllTimers();

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
