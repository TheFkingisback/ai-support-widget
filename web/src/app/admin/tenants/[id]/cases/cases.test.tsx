import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { mockCase, createMockFetch } from '@/lib/test-helpers';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/tenants/ten_test123/cases',
  useParams: () => ({ id: 'ten_test123' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

import CasesPage from './page';

const cases = [
  mockCase({ id: 'cas_001', status: 'active', messageCount: 3 }),
  mockCase({ id: 'cas_002', status: 'resolved', messageCount: 5, resolvedAt: '2026-02-02T12:00:00.000Z' }),
  mockCase({ id: 'cas_003', status: 'escalated', messageCount: 8 }),
];

describe('Cases Browser', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants/ten_test123/cases': { cases },
      }),
    );
  });

  it('renders cases with correct statuses', async () => {
    render(<CasesPage />);
    await waitFor(() => {
      expect(screen.getByText('cas_001')).toBeInTheDocument();
      expect(screen.getByText('cas_002')).toBeInTheDocument();
      expect(screen.getByText('cas_003')).toBeInTheDocument();
    });
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('resolved')).toBeInTheDocument();
    expect(screen.getByText('escalated')).toBeInTheDocument();
  });

  it('shows case detail on row click', async () => {
    render(<CasesPage />);
    await waitFor(() => screen.getByText('cas_001'));

    fireEvent.click(screen.getByText('cas_001'));
    await waitFor(() => {
      expect(screen.getByText('Case cas_001')).toBeInTheDocument();
    });
  });
});
