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
    expect(screen.getByText('Widget Demo')).toBeInTheDocument();
    // Shows integration code
    expect(screen.getByText(/AISupportWidget\.init/)).toBeInTheDocument();
    // Shows the host app content area
    expect(screen.getByText('Host application content area')).toBeInTheDocument();
  });
});
