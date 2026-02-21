import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CostSummaryCard } from './cost-summary';
import { mockCostSummary } from '@/lib/test-helpers';

vi.mock('@/lib/api', () => ({
  listModels: vi.fn().mockResolvedValue([
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', promptPricing: 0.003, completionPricing: 0.015 },
  ]),
}));

import ModelPicker from './model-picker';

describe('Accessibility: CostSummaryCard', () => {
  it('has no a11y violations when loading', async () => {
    const { container } = render(<CostSummaryCard costs={null} loading={true} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations with data', async () => {
    const { container } = render(
      <CostSummaryCard costs={mockCostSummary()} loading={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Accessibility: ModelPicker', () => {
  it('has no a11y violations in closed state', async () => {
    const { container } = render(
      <ModelPicker value={undefined} onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
