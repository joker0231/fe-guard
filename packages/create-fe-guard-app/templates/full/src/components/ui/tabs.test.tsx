import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './tabs';

function Basic({ onChange }: { onChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="a" onValueChange={onChange}>
      <Tabs.List>
        <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
        <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="a">Content A</Tabs.Content>
      <Tabs.Content value="b">Content B</Tabs.Content>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders tab triggers', () => {
    render(<Basic />);
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument();
  });

  it('shows default active content', () => {
    render(<Basic />);
    expect(screen.getByText('Content A')).toBeInTheDocument();
  });

  it('switches content on click', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(screen.getByText('Content B')).toBeInTheDocument();
  });

  it('fires onValueChange when switching', async () => {
    const onChange = vi.fn();
    render(<Basic onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('supports controlled value', () => {
    render(
      <Tabs value="b" onValueChange={() => undefined}>
        <Tabs.List>
          <Tabs.Trigger value="a">A</Tabs.Trigger>
          <Tabs.Trigger value="b">B</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">CA</Tabs.Content>
        <Tabs.Content value="b">CB</Tabs.Content>
      </Tabs>
    );
    expect(screen.getByText('CB')).toBeInTheDocument();
  });

  it('applies data-state=active to selected trigger', () => {
    render(<Basic />);
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'data-state',
      'active'
    );
  });
});