import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders with switch role', () => {
    render(<Switch aria-label="notifications" />);
    expect(screen.getByRole('switch', { name: 'notifications' })).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    render(<Switch checked aria-label="notifications" />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('reflects unchecked state', () => {
    render(<Switch checked={false} aria-label="notifications" />);
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('calls onChange with true when toggled on', async () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} aria-label="notifications" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled off', async () => {
    const handleChange = vi.fn();
    render(<Switch checked onChange={handleChange} aria-label="notifications" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Switch disabled aria-label="notifications" />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('does not fire onChange when disabled', async () => {
    const handleChange = vi.fn();
    render(<Switch disabled onChange={handleChange} aria-label="notifications" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});