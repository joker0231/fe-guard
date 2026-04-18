import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './card';

describe('Card', () => {
  it('renders root with card bg class', () => {
    render(<Card data-testid="c">content</Card>);
    expect(screen.getByTestId('c').className).toContain('bg-card');
  });

  it('renders Card.Header subcomponent', () => {
    render(
      <Card>
        <Card.Header data-testid="h">H</Card.Header>
      </Card>
    );
    expect(screen.getByTestId('h')).toBeInTheDocument();
  });

  it('renders Card.Title as heading', () => {
    render(
      <Card>
        <Card.Title>My Title</Card.Title>
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument();
  });

  it('renders Card.Description', () => {
    render(
      <Card>
        <Card.Description>desc</Card.Description>
      </Card>
    );
    expect(screen.getByText('desc')).toBeInTheDocument();
  });

  it('renders Card.Content', () => {
    render(
      <Card>
        <Card.Content data-testid="ct">body</Card.Content>
      </Card>
    );
    expect(screen.getByTestId('ct')).toBeInTheDocument();
  });

  it('renders Card.Footer', () => {
    render(
      <Card>
        <Card.Footer data-testid="ft">footer</Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('ft')).toBeInTheDocument();
  });

  it('merges custom className on root', () => {
    render(
      <Card data-testid="c" className="mx-auto">
        x
      </Card>
    );
    expect(screen.getByTestId('c').className).toContain('mx-auto');
  });
});