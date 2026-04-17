import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleSelect } from './single-select';

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('SingleSelect', () => {
  it('renders trigger with placeholder', () => {
    render(
      <SingleSelect
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Pick one"
      />
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('displays selected value label', () => {
    render(<SingleSelect options={options} value="banana" onChange={() => {}} />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('opens options when trigger is clicked', async () => {
    render(<SingleSelect options={options} value="" onChange={() => {}} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const handleChange = vi.fn();
    render(<SingleSelect options={options} value="" onChange={handleChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Cherry'));
    expect(handleChange).toHaveBeenCalledWith('cherry');
  });

  it('is disabled when disabled prop is set', () => {
    render(
      <SingleSelect options={options} value="" onChange={() => {}} disabled />
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});