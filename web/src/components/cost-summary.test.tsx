import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostSummaryCard } from './cost-summary';
import { mockCostSummary } from '@/lib/test-helpers';

describe('CostSummaryCard', () => {
  it('shows loading state', () => {
    render(<CostSummaryCard costs={null} loading={true} />);
    expect(screen.getByText('Loading costs...')).toBeInTheDocument();
  });

  it('renders nothing when no costs and not loading', () => {
    const { container } = render(<CostSummaryCard costs={null} loading={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('displays cost summary stats', () => {
    const costs = mockCostSummary();
    render(<CostSummaryCard costs={costs} loading={false} />);

    expect(screen.getByTestId('cost-summary')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5.0K')).toBeInTheDocument();
    expect(screen.getByText('2.0K')).toBeInTheDocument();
  });

  it('displays model breakdown table', () => {
    const costs = mockCostSummary();
    render(<CostSummaryCard costs={costs} loading={false} />);

    expect(screen.getByTestId('cost-by-model')).toBeInTheDocument();
    expect(screen.getByText('anthropic/claude-sonnet-4-20250514')).toBeInTheDocument();
    expect(screen.getByText('anthropic/claude-opus-4-20250514')).toBeInTheDocument();
  });
});
