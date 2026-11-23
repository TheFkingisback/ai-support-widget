import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

import DemoPage from './page';

describe('Widget Demo Page', () => {
  it('renders demo page with widget embed instructions', () => {
    render(<DemoPage />);

    expect(screen.getByTestId('demo-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Widget demo' })).toBeInTheDocument();
    expect(screen.getByTitle('Interactive widget in a sample workspace')).toHaveAttribute('src', '/starter/index.html');
    expect(screen.getByRole('link', { name: 'Download the local starter' })).toHaveAttribute('href', '/downloads/ai-support-starter.zip');
  });
});
