import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminLogin } from './admin-login';
import { adminLogin } from '@/lib/api';

vi.mock('@/lib/api', () => ({ adminLogin: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });

describe('Admin login', () => {
  it('requires both fields and submits email and password without trimming the password', async () => {
    vi.mocked(adminLogin).mockResolvedValue({ token: 'jwt', role: 'super_admin' });
    const onAuthenticated = vi.fn();
    render(<AdminLogin onAuthenticated={onAuthenticated} />);
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    expect(button).toBeDisabled();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.change(password, { target: { value: ' password with spaces ' } });
    fireEvent.click(button);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(adminLogin).toHaveBeenCalledWith('admin@example.com', ' password with spaces ');
  });

  it('shows a generic error and allows retrying after failed login', async () => {
    vi.mocked(adminLogin).mockRejectedValue(new Error('Forbidden'));
    const onAuthenticated = vi.fn();
    render(<AdminLogin onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your email and password');
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});
