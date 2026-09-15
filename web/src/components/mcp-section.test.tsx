import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { McpSection } from './mcp-section';
import { mcpSettings } from '@/lib/mcp-api';
vi.mock('@/lib/api', () => ({ getAdminRole: () => 'super_admin' }));
vi.mock('@/lib/mcp-api', () => ({ mcpSettings: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe('MCP action policy display', () => {
  it('shows disabled status and preserves the configured policy when saving read tools', async () => {
    const policy = { contractVersion: 1 as const, enabled: false, operations: ['reassign_session_car'] as ['reassign_session_car'] };
    vi.mocked(mcpSettings).mockResolvedValue({ configured: true, serverUrl: 'https://example.com/mcp', allowedTools: ['read_a'], actionPolicy: policy });
    render(<McpSection tenantId="ten_a" />);
    expect(await screen.findByText(/Disabled pending joint acceptance/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Dedicated MCP service credential'), { target: { value: 's'.repeat(40) } });
    const button = screen.getByRole('button', { name: 'Save MCP' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
    await waitFor(() => expect(mcpSettings).toHaveBeenCalledWith('ten_a', 'PUT', expect.objectContaining({ actionPolicy: policy })));
  });
});
