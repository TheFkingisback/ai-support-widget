import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntegrationCredentialSection } from './integration-credential-section';
import { getIntegrationCredential, rotateIntegrationCredential, revokeIntegrationCredential } from '@/lib/api';
vi.mock('@/lib/api', () => ({ getIntegrationCredential: vi.fn(), rotateIntegrationCredential: vi.fn(), revokeIntegrationCredential: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getIntegrationCredential).mockResolvedValue({ configured: false, createdAt: null });
  vi.mocked(rotateIntegrationCredential).mockResolvedValue({ credential: 'sik_fixture_only', tenantId: 'ten_a' });
  vi.mocked(revokeIntegrationCredential).mockResolvedValue({ ok: true });
});
describe('Integration credential management', () => {
  it('generates a credential without asking the operator to supply a service token', async () => {
    render(<IntegrationCredentialSection tenantId="ten_a" />);
    const button = await screen.findByRole('button', { name: 'Generate integration credential' });
    await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
    expect(await screen.findByDisplayValue('sik_fixture_only')).toBeInTheDocument();
    expect(rotateIntegrationCredential).toHaveBeenCalledWith('ten_a');
    expect(screen.queryByLabelText(/service token/i)).not.toBeInTheDocument();
  });
  it('requires confirmation before replacing or revoking active sessions', async () => {
    vi.mocked(getIntegrationCredential).mockResolvedValue({ configured: true, createdAt: '2026-09-09T00:00:00Z' });
    render(<IntegrationCredentialSection tenantId="ten_a" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Replace credential' }));
    expect(rotateIntegrationCredential).not.toHaveBeenCalled();
    expect(screen.getByText(/immediately invalidates/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(revokeIntegrationCredential).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(revokeIntegrationCredential).toHaveBeenCalledWith('ten_a'));
    expect(await screen.findByText('No integration credential configured')).toBeInTheDocument();
  });
});
