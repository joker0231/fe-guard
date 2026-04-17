import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders with role checkbox', () => {
    render(<Checkbox aria-label="agree" />);
    expect(screen.getByRole('checkbox', { name: 'agree' })).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    render(<Checkbox checked aria-label="agree" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('reflects unchecked state', () => {
    render(<Checkbox checked={false} aria-label="agree" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange when clicked', async () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onChange={handleChange} aria-label="agree" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled off', async () => {
    const handleChange = vi.fn();
    render(<Checkbox checked onChange={handleChange} aria-label="agree" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Checkbox disabled aria-label="agree" />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('does not fire onChange when disabled', async () => {
    const handleChange = vi.fn();
    render(<Checkbox disabled onChange={handleChange} aria-label="agree" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});