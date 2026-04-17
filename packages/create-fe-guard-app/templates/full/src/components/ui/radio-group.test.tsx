import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup } from './radio-group';

const options = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

describe('RadioGroup', () => {
  it('renders all options', () => {
    render(<RadioGroup options={options} value="small" onChange={() => {}} />);
    expect(screen.getByLabelText('Small')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Large')).toBeInTheDocument();
  });

  it('marks the current value as checked', () => {
    render(<RadioGroup options={options} value="medium" onChange={() => {}} />);
    expect(screen.getByLabelText('Medium')).toBeChecked();
    expect(screen.getByLabelText('Small')).not.toBeChecked();
  });

  it('calls onChange with new value when user clicks a radio', async () => {
    const handleChange = vi.fn();
    render(<RadioGroup options={options} value="small" onChange={handleChange} />);
    await userEvent.click(screen.getByLabelText('Large'));
    expect(handleChange).toHaveBeenCalledWith('large');
  });

  it('disables all radios when disabled prop is set', () => {
    render(
      <RadioGroup options={options} value="small" onChange={() => {}} disabled />
    );
    expect(screen.getByLabelText('Small')).toBeDisabled();
    expect(screen.getByLabelText('Medium')).toBeDisabled();
  });

  it('does not fire onChange when disabled', async () => {
    const handleChange = vi.fn();
    render(
      <RadioGroup options={options} value="small" onChange={handleChange} disabled />
    );
    await userEvent.click(screen.getByLabelText('Large'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});