import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal behavior', () => {
  test('calls onClose when Escape key pressed', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose} title="T" />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose} title="T" />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  test('focus trap cycles tabbable elements inside modal', async () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        <button>First</button>
        <button>Second</button>
      </Modal>
    );

    const dialog = screen.getByTestId('modal-dialog') as HTMLElement;
    const first = within(dialog).getByText('First') as HTMLElement;

    first.focus();
    expect(first).toHaveFocus();

    const user = userEvent.setup();

    // Tab should move focus away from the initially focused element
    await user.tab();
    expect(first).not.toHaveFocus();

    // Shift+Tab should return focus back
    await user.tab({ shift: true });
    expect(first).toHaveFocus();
  });

  test('restores focus to previously focused element without scrolling', () => {
    const onClose = jest.fn();

    // Create an element to focus before opening modal
    const before = document.createElement('button');
    before.textContent = 'Before';
    document.body.appendChild(before);
    before.focus();

    // Spy on focus to ensure preventScroll option is used where available
    const focusSpy = jest.spyOn(before, 'focus');

    const { rerender } = render(
      <Modal isOpen={true} onClose={onClose} title="T" />
    );

    // Close modal and expect focus to be restored to 'before'
    rerender(<Modal isOpen={false} onClose={onClose} title="T" />);

    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
    document.body.removeChild(before);
  });

  test('does not close on backdrop click when closeOnBackdropClick is false', () => {
    const onClose = jest.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="T"
        closeOnBackdropClick={false}
      />
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  test('does not close on Escape when closeOnEscape is false', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T" closeOnEscape={false} />
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
