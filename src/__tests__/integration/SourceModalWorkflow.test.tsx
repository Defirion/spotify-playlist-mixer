import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DndProvider from '../../components/DndProvider';
import TrackSourceModal from '../../components/TrackSourceModal';
import { makeTrack } from '../../test-utils/mocks/spotify';

const tracks = [
  makeTrack({ id: 'first', name: 'First' }),
  makeTrack({ id: 'second', name: 'Second' }),
];

test('the actual source modal supports keyboard selection, additions and focus restoration', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  function Workflow() {
    const [open, setOpen] = useState(false);
    return (
      <DndProvider>
        <button onClick={() => setOpen(true)}>Choose tracks</button>
        <TrackSourceModal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Choose source tracks"
          tracks={tracks}
          loading={false}
          onAddTracks={onAdd}
          searchQuery=""
          onSearchQueryChange={() => {}}
        />
      </DndProvider>
    );
  }
  render(<Workflow />);
  const trigger = screen.getByRole('button', { name: 'Choose tracks' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveFocus();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  const items = within(dialog).getAllByRole('listitem');
  expect(items).toHaveLength(2);
  await user.tab();
  expect(screen.getByRole('button', { name: /close modal/i })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('textbox')).toHaveFocus();
  await user.tab();
  expect(screen.getAllByTestId('sortable-wrapper')[0]).toHaveFocus();
  await user.tab();
  expect(items[0]).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(items[0]).toHaveClass('selected');
  await user.tab();
  expect(screen.getAllByTestId('sortable-wrapper')[1]).toHaveFocus();
  await user.tab();
  await user.keyboard(' ');
  expect(items[1]).toHaveClass('selected');
  await user.click(
    screen.getByRole('button', { name: 'Add 2 Tracks & Continue' })
  );
  expect(onAdd).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'first', instanceId: expect.any(String) }),
    expect.objectContaining({ id: 'second', instanceId: expect.any(String) }),
  ]);
  expect(screen.getByText('0 tracks selected')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('source-modal errors suppress stale tracks and recovery restores selectable results', () => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Source',
    tracks,
    loading: false,
    onAddTracks: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
  };
  const { rerender } = render(
    <DndProvider>
      <TrackSourceModal {...props} error={new Error('Unavailable')} />
    </DndProvider>
  );
  expect(
    screen.getByText('Error loading tracks. Please try again.')
  ).toBeInTheDocument();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  rerender(
    <DndProvider>
      <TrackSourceModal {...props} />
    </DndProvider>
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
