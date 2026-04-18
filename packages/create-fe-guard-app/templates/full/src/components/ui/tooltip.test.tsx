import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  it('renders children (trigger)', () => {
    render(
      <Tooltip content="Hi">
        <button>Trigger</button>
      </Tooltip>
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('does not show content initially', () => {
    render(
      <Tooltip content="Hidden tip">
        <button>T</button>
      </Tooltip>
    );
    expect(screen.queryByText('Hidden tip')).not.toBeInTheDocument();
  });

  it('shows content on hover', async () => {
    render(
      <Tooltip content="Tip content" delayDuration={0}>
        <button>T</button>
      </Tooltip>
    );
    await userEvent.hover(screen.getByRole('button', { name: 'T' }));
    // Radix tooltip appears in portal; role is tooltip
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Tip content');
  });

  it('shows content on focus', async () => {
    render(
      <Tooltip content="Focus tip" delayDuration={0}>
        <button>T</button>
      </Tooltip>
    );
    screen.getByRole('button', { name: 'T' }).focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Focus tip');
  });

  it('accepts side prop', async () => {
    render(
      <Tooltip content="Side" delayDuration={0} side="right">
        <button>T</button>
      </Tooltip>
    );
    await userEvent.hover(screen.getByRole('button', { name: 'T' }));
    const tip = await screen.findByRole('tooltip');
    expect(tip).toBeInTheDocument();
  });

  it('renders ReactNode content', async () => {
    render(
      <Tooltip content={<span data-testid="node">rich</span>} delayDuration={0}>
        <button>T</button>
      </Tooltip>
    );
    await userEvent.hover(screen.getByRole('button', { name: 'T' }));
    expect(await screen.findByTestId('node')).toBeInTheDocument();
  });
});