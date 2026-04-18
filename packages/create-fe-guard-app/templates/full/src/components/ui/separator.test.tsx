import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders horizontal by default', () => {
    render(<Separator data-testid="sep" />);
    const sep = screen.getByTestId('sep');
    expect(sep.className).toContain('h-px');
    expect(sep.className).toContain('w-full');
  });

  it('renders vertical when orientation=vertical', () => {
    render(<Separator data-testid="sep" orientation="vertical" />);
    const sep = screen.getByTestId('sep');
    expect(sep.className).toContain('w-px');
    expect(sep.className).toContain('h-full');
  });

  it('applies base bg-border class', () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep').className).toContain('bg-border');
  });

  it('is decorative by default (aria-hidden)', () => {
    render(<Separator data-testid="sep" />);
    // Radix decorative separator has role="none"
    expect(screen.getByTestId('sep').getAttribute('role')).toBe('none');
  });

  it('becomes semantic when decorative=false', () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Separator data-testid="sep" className="my-4" />);
    expect(screen.getByTestId('sep').className).toContain('my-4');
  });
});