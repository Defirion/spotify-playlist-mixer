import React from 'react';
import { render, screen } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal isOpen={true} onClose={jest.fn()} title="Test" />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={jest.fn()} title="Test" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
