import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="暂无数据" />);
    expect(screen.getByRole('heading', { name: '暂无数据' })).toBeInTheDocument();
  });

  it('has status role for accessibility', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="No items yet" />);
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('No items yet')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Create</button>} />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<EmptyState title="Empty" className="custom-bg" />);
    expect(screen.getByRole('status').className).toContain('custom-bg');
  });
});