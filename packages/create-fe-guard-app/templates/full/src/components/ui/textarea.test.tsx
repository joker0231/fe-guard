import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(<Textarea placeholder="write..." />);
    expect(screen.getByPlaceholderText('write...')).toBeInTheDocument();
  });

  it('applies rows attribute', () => {
    render(<Textarea rows={8} data-testid="ta" />);
    expect(screen.getByTestId('ta')).toHaveAttribute('rows', '8');
  });

  it('calls onChange when user types', async () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'abc');
    expect(handleChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders error message and marks aria-invalid', () => {
    render(<Textarea id="bio" error="Bio too short" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Bio too short');
  });

  it('uses controlled value', () => {
    render(<Textarea value="hello" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });
});