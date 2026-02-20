import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/developers/integration',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import IntegrationGuidePage from './page';

describe('Integration Guide', () => {
  it('renders all 6 steps', () => {
    render(<IntegrationGuidePage />);

    expect(screen.getByTestId('integration-page')).toBeInTheDocument();
    expect(screen.getByText('Integration Guide')).toBeInTheDocument();

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`step-${i}`)).toBeInTheDocument();
    }

    expect(screen.getByText('Create Tenant via Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Configure JWT Shared Secret')).toBeInTheDocument();
    expect(screen.getByText('Implement 4 Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Add Widget Script Tag')).toBeInTheDocument();
    expect(screen.getByText('Test with Demo Page')).toBeInTheDocument();
    expect(screen.getByText('Go Live')).toBeInTheDocument();
  });
});
