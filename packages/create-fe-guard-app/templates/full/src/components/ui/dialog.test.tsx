import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './dialog';

function Basic({ onOpenChange }: { onOpenChange?: (o: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Delete</Dialog.Title>
        <Dialog.Description>Are you sure?</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Close>Cancel</Dialog.Close>
          <button>Confirm</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders trigger', () => {
    render(<Basic />);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('does not show content initially', () => {
    render(<Basic />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on trigger click', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders title and description when open', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('fires onOpenChange when closed via Close button', async () => {
    const onOpenChange = vi.fn();
    render(<Basic onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('supports controlled open prop', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>Controlled</Dialog.Title>
        </Dialog.Content>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Controlled')).toBeInTheDocument();
  });

  it('can hide close button via showClose=false', async () => {
    render(
      <Dialog open>
        <Dialog.Content showClose={false}>
          <Dialog.Title>NoClose</Dialog.Title>
        </Dialog.Content>
      </Dialog>
    );
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});