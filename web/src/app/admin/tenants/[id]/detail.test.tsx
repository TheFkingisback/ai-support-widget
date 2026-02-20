import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { mockTenant, createMockFetch } from '@/lib/test-helpers';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/tenants/ten_test123',
  useParams: () => ({ id: 'ten_test123' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

import TenantDetailPage from './page';

const tenant = mockTenant({ id: 'ten_test123', name: 'Test Corp' });

describe('Tenant Detail Page', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants': { tenants: [tenant] },
      }),
    );
  });

  it('loads and displays tenant config', async () => {
    render(<TenantDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tenant-detail')).toBeInTheDocument();
    });
    // Check tenant name is displayed in the input
    const nameInput = screen.getByDisplayValue('Test Corp');
    expect(nameInput).toBeInTheDocument();
    // Check config values are displayed
    expect(screen.getByDisplayValue('5000000')).toBeInTheDocument(); // maxContextBytes
    expect(screen.getByDisplayValue('72')).toBeInTheDocument(); // maxEventWindowHours
  });

  it('saves updated config', async () => {
    const fetchMock = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants': { tenants: [tenant] },
      }),
    );
    // Override for PATCH calls
    fetchMock.mockImplementation(async (url: string, opts?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : '';
      if (opts?.method === 'PATCH') {
        return new Response(JSON.stringify({
          tenant: { ...tenant, name: 'Updated Corp' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/api/admin/tenants')) {
        return new Response(JSON.stringify({ tenants: [tenant] }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    });
    globalThis.fetch = fetchMock;

    render(<TenantDetailPage />);
    await waitFor(() => screen.getByTestId('tenant-detail'));

    // Change name
    const nameInput = screen.getByDisplayValue('Test Corp');
    fireEvent.change(nameInput, { target: { value: 'Updated Corp' } });

    // Click save
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      // Verify PATCH was called
      const patchCalls = fetchMock.mock.calls.filter(
        (call: unknown[]) => (call[1] as RequestInit)?.method === 'PATCH',
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });
  });
});
