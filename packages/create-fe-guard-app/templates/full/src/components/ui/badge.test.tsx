import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders content', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant class', () => {
    render(<Badge data-testid="b">Default</Badge>);
    expect(screen.getByTestId('b').className).toContain('bg-primary');
  });

  it('applies success variant class', () => {
    render(
      <Badge data-testid="b" variant="success">
        Ok
      </Badge>
    );
    expect(screen.getByTestId('b').className).toContain('bg-success');
  });

  it('applies error variant class', () => {
    render(
      <Badge data-testid="b" variant="error">
        Err
      </Badge>
    );
    expect(screen.getByTestId('b').className).toContain('bg-destructive');
  });

  it('applies outline variant class', () => {
    render(
      <Badge data-testid="b" variant="outline">
        Outline
      </Badge>
    );
    expect(screen.getByTestId('b').className).toContain('border-border');
  });

  it('applies sm size class', () => {
    render(
      <Badge data-testid="b" size="sm">
        Sm
      </Badge>
    );
    expect(screen.getByTestId('b').className).toContain('text-xs');
  });

  it('merges custom className', () => {
    render(
      <Badge data-testid="b" className="ml-2">
        X
      </Badge>
    );
    expect(screen.getByTestId('b').className).toContain('ml-2');
  });
});