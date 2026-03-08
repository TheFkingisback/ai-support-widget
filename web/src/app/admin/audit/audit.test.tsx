import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mockTenant, mockAuditEntry, createMockFetch } from '@/lib/test-helpers';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/audit',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

import AuditPage from './page';

const tenant = mockTenant({ id: 'ten_test123', name: 'Test Corp' });
const entries = [
  mockAuditEntry({ id: 'aud_001', action: 'case_created', userId: 'usr_abc' }),
  mockAuditEntry({ id: 'aud_002', action: 'message_sent', userId: 'usr_def' }),
  mockAuditEntry({ id: 'aud_003', action: 'case_escalated', userId: 'usr_abc' }),
];

describe('Audit Log Page', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants': { tenants: [tenant] },
        '/api/admin/tenants/ten_test123/audit': {
          entries,
          total: 3,
          page: 1,
          pageSize: 20,
          hasMore: false,
        },
      }),
    );
  });

  it('renders paginated audit entries', async () => {
    render(<AuditPage />);
    await waitFor(() => {
      expect(screen.getByText('case_created')).toBeInTheDocument();
      expect(screen.getByText('message_sent')).toBeInTheDocument();
      expect(screen.getByText('case_escalated')).toBeInTheDocument();
    });
    expect(screen.getByTestId('audit-table')).toBeInTheDocument();
    expect(screen.getByText('3 entries total')).toBeInTheDocument();
  });
});
