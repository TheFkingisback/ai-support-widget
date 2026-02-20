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
  it('renders Quick Start section', () => {
    render(<DevelopersPage />);

    expect(screen.getByTestId('quick-start')).toBeInTheDocument();
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText(/Get your tenant key/)).toBeInTheDocument();
    expect(screen.getByText(/Implement 4 API endpoints/)).toBeInTheDocument();
    expect(screen.getByText(/your users have AI support/)).toBeInTheDocument();
  });

  it('renders code examples', () => {
    render(<DevelopersPage />);

    expect(screen.getByTestId('code-examples')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('cURL')).toBeInTheDocument();
  });
});
