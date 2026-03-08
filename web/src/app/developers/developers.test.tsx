import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/developers',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import DevelopersPage from './page';

describe('Developer Portal', () => {
  it('renders hero section with title', () => {
    render(<DevelopersPage />);

    expect(screen.getByTestId('developers-page')).toBeInTheDocument();
    expect(screen.getByText(/Build AI Support/)).toBeInTheDocument();
    expect(screen.getByText(/Into Any App/)).toBeInTheDocument();
  });

  it('renders navigation cards for all documentation sections', () => {
    render(<DevelopersPage />);

    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Widget SDK')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
    expect(screen.getByText('Type Definitions')).toBeInTheDocument();
    expect(screen.getByText('Error Reference')).toBeInTheDocument();
  });

  it('renders architecture diagram', () => {
    render(<DevelopersPage />);

    expect(screen.getByText(/Support Gateway/)).toBeInTheDocument();
    expect(screen.getByText(/Snapshot/)).toBeInTheDocument();
  });

  it('renders feature highlights', () => {
    render(<DevelopersPage />);

    expect(screen.getByText(/AI-powered diagnostics/)).toBeInTheDocument();
    expect(screen.getByText(/Multi-tenant SaaS/)).toBeInTheDocument();
  });
});
