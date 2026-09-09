import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateTenantModal } from './create-tenant-modal';

vi.mock('./model-picker', () => ({ default: () => null }));

describe('Tenant onboarding', () => {
  it('creates a tenant with name and plan and shows the generated key', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ adminApiKey: 'tsk_generated' });
    render(<CreateTenantModal open onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.queryByLabelText('Service Token')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('API Base URL')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' New Company ' } });
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));
    expect(await screen.findByText('Tenant Created')).toBeInTheDocument();
    expect(screen.getByText('tsk_generated')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({ name: 'New Company', plan: 'pro' });
  });

  it('uses plan defaults unless optional settings are customized', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ adminApiKey: 'tsk_generated' });
    render(<CreateTenantModal open onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Company' } });
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'enterprise' } });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced settings (optional)' }));
    expect(screen.getByLabelText('Model policy')).toHaveValue('strong');
    expect(screen.getByRole('button', { name: 'jira' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Model policy'), { target: { value: 'auto' } });
    fireEvent.click(screen.getByRole('button', { name: 'jira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      name: 'Company', plan: 'enterprise',
      config: { modelPolicy: 'auto', enabledConnectors: ['email', 'zendesk'] },
    }));
  });

  it('preserves input after an API error and lets the user retry', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Unable to create tenant'))
      .mockResolvedValueOnce({ adminApiKey: 'tsk_generated' });
    render(<CreateTenantModal open onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Company' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to create tenant');
    expect(screen.getByLabelText('Name')).toHaveValue('Company');
    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));
    expect(await screen.findByText('Tenant Created')).toBeInTheDocument();
  });
});
