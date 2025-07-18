import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistErrorBoundary from '../PlaylistErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Playlist loading error');
  }
  return <div>Playlist loaded</div>;
};

describe('PlaylistErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <PlaylistErrorBoundary>
        <div>Playlist content</div>
      </PlaylistErrorBoundary>
    );

    expect(screen.getByText('Playlist content')).toBeInTheDocument();
  });

  it('renders playlist-specific error UI when child component throws', () => {
    render(
      <PlaylistErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PlaylistErrorBoundary>
    );

    expect(screen.getByText('Playlist Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't load your playlists/)).toBeInTheDocument();
    expect(screen.getByText('🔄 Retry Loading')).toBeInTheDocument();
    expect(screen.getByText('🔃 Refresh')).toBeInTheDocument();
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <PlaylistErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </PlaylistErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Playlist loading error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('handles retry button click', () => {
    render(
      <PlaylistErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PlaylistErrorBoundary>
    );

    expect(screen.getByText('Playlist Loading Error')).toBeInTheDocument();

    // Click retry button - should not throw error
    fireEvent.click(screen.getByText('🔄 Retry Loading'));

    // Error UI should still be visible since we haven't re-rendered with fixed component
    expect(screen.getByText('Playlist Loading Error')).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <PlaylistErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PlaylistErrorBoundary>
    );

    fireEvent.click(screen.getByText('🔃 Refresh'));
    expect(mockReload).toHaveBeenCalled();
  });
});