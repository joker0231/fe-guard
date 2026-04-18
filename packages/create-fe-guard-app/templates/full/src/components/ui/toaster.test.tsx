import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster, toast } from './toaster';

describe('Toaster', () => {
  it('renders without crashing (no toasts initially)', () => {
    render(<Toaster />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows success toast when toast.success called', () => {
    render(<Toaster />);
    act(() => {
      toast.success('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows error toast with destructive class', () => {
    render(<Toaster />);
    act(() => {
      toast.error('Failed');
    });
    const item = screen.getByText('Failed').closest('li');
    expect(item?.className).toContain('destructive');
  });

  it('shows info and warning variants', () => {
    render(<Toaster />);
    act(() => {
      toast.info('Info msg');
      toast.warning('Warn msg');
    });
    expect(screen.getByText('Info msg')).toBeInTheDocument();
    expect(screen.getByText('Warn msg')).toBeInTheDocument();
  });

  it('supports programmatic dismiss', () => {
    render(<Toaster />);
    let id = 0;
    act(() => {
      id = toast.info('Dismiss me');
    });
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    act(() => {
      toast.dismiss(id);
    });
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });

  it('user can close toast via Close button', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Closable');
    });
    expect(screen.getByText('Closable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Closable')).not.toBeInTheDocument();
  });
});