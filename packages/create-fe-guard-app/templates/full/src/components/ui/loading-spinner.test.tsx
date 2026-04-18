import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './loading-spinner';

describe('LoadingSpinner', () => {
  it('renders with role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies md size classes by default', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status').className).toContain('h-6');
  });

  it('applies sm size classes', () => {
    render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole('status').className).toContain('h-4');
  });

  it('applies lg size classes', () => {
    render(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status').className).toContain('h-10');
  });

  it('renders default accessible label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '加载中');
  });

  it('allows custom accessible label', () => {
    render(<LoadingSpinner label="Loading data" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data');
    expect(screen.getByText('Loading data')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<LoadingSpinner className="text-primary" />);
    expect(screen.getByRole('status').className).toContain('text-primary');
  });
});