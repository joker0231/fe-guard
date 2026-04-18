import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './sheet';

function Basic({
  side,
  onOpenChange,
}: {
  side?: 'bottom' | 'right';
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange}>
      <Sheet.Trigger>Open</Sheet.Trigger>
      <Sheet.Content side={side}>
        <Sheet.Title>Filters</Sheet.Title>
        <Sheet.Description>Pick one</Sheet.Description>
        <Sheet.Footer>
          <Sheet.Close>Cancel</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('renders trigger', () => {
    render(<Basic />);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('does not show content initially', () => {
    render(<Basic />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on trigger click (default side=bottom)', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('bottom-0');
  });

  it('applies side=right classes', async () => {
    render(<Basic side="right" />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog').className).toContain('right-0');
  });

  it('renders title and description when open', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('fires onOpenChange when closed', async () => {
    const onOpenChange = vi.fn();
    render(<Basic onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('supports controlled open prop', () => {
    render(
      <Sheet open>
        <Sheet.Content>
          <Sheet.Title>Controlled</Sheet.Title>
        </Sheet.Content>
      </Sheet>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});