import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { McpSection } from './mcp-section';
import { mcpSettings } from '@/lib/mcp-api';
vi.mock('@/lib/api', () => ({ getAdminRole: () => 'tenant_admin', getAdminTenantId: () => 'ten_a' }));
vi.mock('@/lib/mcp-api', () => ({ mcpSettings: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const base = { configured: true, serverUrl: 'https://example.com/mcp', allowedTools: ['read_a'] };
describe('Self-service MCP action policy', () => {
  it('allows the tenant to configure a generic operation and read its public verification key', async () => {
    vi.mocked(mcpSettings).mockResolvedValue({ ...base, actionVerification: { keyId: 'test', algorithm: 'RS256', issuer: 'test', publicKeyPem: 'public-key' } });
    render(<McpSection tenantId="ten_a" />);
    expect(await screen.findByLabelText('Public verification key')).toHaveValue('public-key');
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Allowed operation names, one per line'), { target: { value: 'change_delivery_date' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Dedicated MCP service credential'), { target: { value: 's'.repeat(40) } });
    const button = screen.getByRole('button', { name: 'Save MCP' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
    await waitFor(() => expect(mcpSettings).toHaveBeenCalledWith('ten_a', 'PUT', expect.objectContaining({
      actionPolicy: { contractVersion: 1, enabled: true, operations: ['change_delivery_date'] } })));
  });
  it('blocks activation without platform signing and hides another tenant configuration', async () => {
    vi.mocked(mcpSettings).mockResolvedValue(base);
    const view = render(<McpSection tenantId="ten_a" />);
    expect(await screen.findByText(/Human-confirmed actions are not available/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    view.unmount(); vi.clearAllMocks(); render(<McpSection tenantId="ten_b" />);
    expect(screen.queryByRole('button', { name: 'Save MCP' })).not.toBeInTheDocument(); expect(mcpSettings).not.toHaveBeenCalled();
  });
});
