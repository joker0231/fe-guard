import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSelect } from './multi-select';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('MultiSelect', () => {
  it('shows placeholder when empty', () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={() => {}}
        placeholder="Pick tags"
      />
    );
    expect(screen.getByText('Pick tags')).toBeInTheDocument();
  });

  it('shows single selection label', () => {
    render(<MultiSelect options={options} value={['b']} onChange={() => {}} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows count when multiple selected', () => {
    render(
      <MultiSelect options={options} value={['a', 'c']} onChange={() => {}} />
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('calls onChange with added value when option clicked', async () => {
    const handleChange = vi.fn();
    render(<MultiSelect options={options} value={[]} onChange={handleChange} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Alpha'));
    expect(handleChange).toHaveBeenCalledWith(['a']);
  });

  it('calls onChange removing value when selected option clicked again', async () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect options={options} value={['a', 'b']} onChange={handleChange} />
    );
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Alpha'));
    expect(handleChange).toHaveBeenCalledWith(['b']);
  });

  it('is disabled when disabled prop is set', () => {
    render(
      <MultiSelect options={options} value={[]} onChange={() => {}} disabled />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});