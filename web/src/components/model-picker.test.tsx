import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  listModels: vi.fn().mockResolvedValue([
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', promptPricing: 0.003, completionPricing: 0.015 },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', promptPricing: 0.005, completionPricing: 0.015 },
    { id: 'meta/llama-3-70b', name: 'Llama 3 70B', provider: 'meta', promptPricing: 0.001, completionPricing: 0.002 },
  ]),
}));

import ModelPicker from './model-picker';

describe('ModelPicker', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('renders with placeholder when no value selected', async () => {
    render(<ModelPicker value={undefined} onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByText('Use policy default')).toBeInTheDocument();
    });
  });

  it('shows model name when value is set', async () => {
    render(<ModelPicker value="anthropic/claude-sonnet-4" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
    });
  });

  it('opens dropdown and shows models on click', async () => {
    render(<ModelPicker value={undefined} onChange={onChange} />);
    await waitFor(() => screen.getByText('Use policy default'));

    fireEvent.click(screen.getByRole('button', { name: 'Select preferred model' }));

    await waitFor(() => {
      expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('Llama 3 70B')).toBeInTheDocument();
    });
  });

  it('filters models by search query', async () => {
    render(<ModelPicker value={undefined} onChange={onChange} />);
    await waitFor(() => screen.getByText('Use policy default'));

    fireEvent.click(screen.getByRole('button', { name: 'Select preferred model' }));
    await waitFor(() => screen.getByPlaceholderText('Search models...'));

    fireEvent.change(screen.getByPlaceholderText('Search models...'), {
      target: { value: 'claude' },
    });

    await waitFor(() => {
      expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
      expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
      expect(screen.queryByText('Llama 3 70B')).not.toBeInTheDocument();
    });
  });

  it('calls onChange when a model is selected', async () => {
    render(<ModelPicker value={undefined} onChange={onChange} />);
    await waitFor(() => screen.getByText('Use policy default'));

    fireEvent.click(screen.getByRole('button', { name: 'Select preferred model' }));
    await waitFor(() => screen.getByText('GPT-4o'));

    fireEvent.click(screen.getByText('GPT-4o'));

    expect(onChange).toHaveBeenCalledWith('openai/gpt-4o');
  });

  it('shows clear button when value is set and clears on click', async () => {
    render(<ModelPicker value="openai/gpt-4o" onChange={onChange} />);
    await waitFor(() => screen.getByText('GPT-4o'));

    const clearBtn = screen.getByRole('button', { name: 'Clear model selection' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
