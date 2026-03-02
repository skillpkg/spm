const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface AuthUser {
  id: string;
  username: string;
  github_id: number;
  trust_tier: string;
  is_admin: boolean;
  created_at: string;
}

export interface UserProfile {
  user: AuthUser;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  token: string;
  user: AuthUser;
}

export class AuthPendingError extends Error {
  constructor() {
    super('Authorization pending');
    this.name = 'AuthPendingError';
  }
}

export class AuthExpiredError extends Error {
  constructor() {
    super('Device code expired');
    this.name = 'AuthExpiredError';
  }
}

export const requestDeviceCode = async (): Promise<DeviceCodeResponse> => {
  const res = await fetch(`${API_URL}/auth/device-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to request device code: ${res.status}`);
  }
  return res.json();
};

export const pollToken = async (deviceCode: string): Promise<TokenResponse> => {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  if (res.status === 428) {
    throw new AuthPendingError();
  }
  if (res.status === 410) {
    throw new AuthExpiredError();
  }
  if (!res.ok) {
    throw new Error(`Token poll failed: ${res.status}`);
  }
  return res.json();
};

export const whoami = async (token: string): Promise<UserProfile> => {
  const res = await fetch(`${API_URL}/auth/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Whoami failed: ${res.status}`);
  }
  return res.json();
};

export const logout = async (token: string): Promise<void> => {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};
