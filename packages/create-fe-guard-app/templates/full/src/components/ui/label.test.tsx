import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('renders children text', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="username">Username</Label>
        <input id="username" />
      </>
    );
    expect(screen.getByText('Username').closest('label')).toHaveAttribute('for', 'username');
  });

  it('does not show asterisk when required is false', () => {
    render(<Label>Name</Label>);
    expect(screen.queryByLabelText('required')).not.toBeInTheDocument();
  });

  it('shows asterisk when required is true', () => {
    render(<Label required>Name</Label>);
    expect(screen.getByLabelText('required')).toBeInTheDocument();
    expect(screen.getByLabelText('required')).toHaveTextContent('*');
  });

  it('merges custom className', () => {
    render(<Label className="custom">Text</Label>);
    expect(screen.getByText('Text').closest('label')?.className).toContain('custom');
  });
});