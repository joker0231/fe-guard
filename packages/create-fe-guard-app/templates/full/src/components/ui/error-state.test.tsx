import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('renders message', () => {
    render(<ErrorState message="Network failed" />);
    expect(screen.getByText('Network failed')).toBeInTheDocument();
  });

  it('has alert role', () => {
    render(<ErrorState message="Oops" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders default title', () => {
    render(<ErrorState message="Oops" />);
    expect(screen.getByRole('heading', { name: '出错了' })).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Server Error" message="500" />);
    expect(screen.getByRole('heading', { name: 'Server Error' })).toBeInTheDocument();
  });

  it('does not render retry button when retry prop is absent', () => {
    render(<ErrorState message="Oops" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders retry button when retry is provided', () => {
    render(<ErrorState message="Oops" retry={() => undefined} />);
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('invokes retry callback on click', async () => {
    const retry = vi.fn();
    render(<ErrorState message="Oops" retry={retry} />);
    await userEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('merges custom className', () => {
    render(<ErrorState message="Oops" className="custom" />);
    expect(screen.getByRole('alert').className).toContain('custom');
  });
});