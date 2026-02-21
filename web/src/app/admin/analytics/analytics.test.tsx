import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mockTenant, mockAnalytics, mockCostSummary, createMockFetch } from '@/lib/test-helpers';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/analytics',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

// Mock recharts to avoid canvas/SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AnalyticsPage from './page';

const tenant = mockTenant({ id: 'ten_test123', name: 'Test Corp' });
const analytics = mockAnalytics();
const costs = mockCostSummary();

describe('Analytics Page', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants/ten_test123/costs': { costs },
        '/api/admin/tenants/ten_test123/analytics': { analytics },
        '/api/admin/tenants': { tenants: [tenant] },
      }),
    );
  });

  it('shows resolution rate in stats', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('analytics-content')).toBeInTheDocument();
    });
    // Resolution rate: 0.7 → 70.0%
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
  });

  it('shows top errors chart', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('errors-chart')).toBeInTheDocument();
    });
    expect(screen.getByText('Top Errors')).toBeInTheDocument();
  });

  it('shows cost summary card', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('cost-summary')).toBeInTheDocument();
    });
    expect(screen.getByText('$1.25')).toBeInTheDocument();
  });
});
