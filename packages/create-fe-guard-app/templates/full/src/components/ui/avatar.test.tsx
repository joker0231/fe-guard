import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('renders fallback when no src', async () => {
    render(<Avatar fallback="A" />);
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('applies md size classes by default', () => {
    render(<Avatar data-testid="av" fallback="A" />);
    expect(screen.getByTestId('av').className).toContain('h-10');
  });

  it('applies sm size classes', () => {
    render(<Avatar data-testid="av" size="sm" fallback="S" />);
    expect(screen.getByTestId('av').className).toContain('h-6');
  });

  it('applies lg size classes', () => {
    render(<Avatar data-testid="av" size="lg" fallback="L" />);
    expect(screen.getByTestId('av').className).toContain('h-14');
  });

  it('has rounded-full class', () => {
    render(<Avatar data-testid="av" fallback="A" />);
    expect(screen.getByTestId('av').className).toContain('rounded-full');
  });

  it('merges custom className', () => {
    render(<Avatar data-testid="av" fallback="A" className="ring-2" />);
    expect(screen.getByTestId('av').className).toContain('ring-2');
  });
});