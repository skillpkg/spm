import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';

interface RenderWithProvidersOptions extends RenderOptions {
  routerProps?: MemoryRouterProps;
}

export const renderWithProviders = (ui: ReactNode, options?: RenderWithProvidersOptions) => {
  const { routerProps, ...renderOptions } = options ?? {};
  return render(
    <MemoryRouter {...routerProps}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
    renderOptions,
  );
};

export const mockUser = {
  id: 'u1',
  username: 'testuser',
  github_id: 12345,
  trust_tier: 'verified',
  is_admin: false,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockAdminUser = {
  ...mockUser,
  username: 'adminuser',
  is_admin: true,
};
