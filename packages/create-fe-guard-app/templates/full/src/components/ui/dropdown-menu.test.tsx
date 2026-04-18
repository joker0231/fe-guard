import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu } from './dropdown-menu';

function Basic({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Actions</DropdownMenu.Label>
        <DropdownMenu.Item onSelect={onEdit}>Edit</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item danger onSelect={onDelete}>
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('renders trigger', () => {
    render(<Basic />);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('opens menu on trigger click', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('renders label', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('fires onSelect when item is clicked', async () => {
    const onEdit = vi.fn();
    render(<Basic onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('applies danger variant class', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(
      screen.getByRole('menuitem', { name: 'Delete' }).className
    ).toContain('text-destructive');
  });

  it('does not render content when closed initially', () => {
    render(<Basic />);
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });
});