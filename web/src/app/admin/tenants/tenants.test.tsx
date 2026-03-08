import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { mockTenant, createMockFetch } from '@/lib/test-helpers';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/tenants',
  useParams: () => ({ id: 'ten_test123' }),
  useRouter: () => ({ push: vi.fn() }),
  redirect: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

import TenantsPage from './page';

const tenants = [
  mockTenant({ id: 'ten_001', name: 'Acme Corp', plan: 'enterprise' }),
  mockTenant({ id: 'ten_002', name: 'Beta Inc', plan: 'starter' }),
];

describe('Tenants Page', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(
      createMockFetch({
        '/api/admin/tenants': { tenants },
      }),
    );
  });

  it('renders tenant list as cards', async () => {
    render(<TenantsPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    });
  });

  it('create tenant modal validates required fields', async () => {
    render(<TenantsPage />);
    await waitFor(() => screen.getByText('Acme Corp'));

    fireEvent.click(screen.getByText('New Tenant'));
    await waitFor(() => {
      expect(screen.getByTestId('create-tenant-modal')).toBeInTheDocument();
    });

    // Submit empty form
    fireEvent.click(screen.getByText('Create Tenant', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('API Base URL is required')).toBeInTheDocument();
      expect(screen.getByText('Service token is required')).toBeInTheDocument();
    });
  });
});
