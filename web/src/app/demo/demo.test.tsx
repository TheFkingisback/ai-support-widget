import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

import DemoPage from './page';

describe('Widget Demo Page', () => {
  it('renders the demo, starter kit, and signup link', () => {
    render(<DemoPage />);

    expect(screen.getByTestId('demo-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'See Support AI in action' })).toBeInTheDocument();
    expect(screen.getByTitle('Support chat in a sample product')).toHaveAttribute('src', '/starter/index.html?lang=en-US');
    expect(screen.getByRole('link', { name: 'Download the starter kit' })).toHaveAttribute('href', '/downloads/ai-support-starter.zip');
    expect(screen.getByRole('link', { name: 'Get started free' })).toHaveAttribute('href', '/signup');
  });
});
