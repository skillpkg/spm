import {
  requestDeviceCode,
  pollToken,
  whoami,
  logout,
  AuthPendingError,
  AuthExpiredError,
} from '../lib/api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('requestDeviceCode', () => {
  it('returns device code response on success', async () => {
    const payload = {
      device_code: 'dc_123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5,
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) });

    const result = await requestDeviceCode();

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/auth/device-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(requestDeviceCode()).rejects.toThrow('Failed to request device code: 500');
  });
});

describe('pollToken', () => {
  const mockUser = {
    id: 'u1',
    username: 'testuser',
    github_id: 12345,
    trust_tier: 'verified',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('returns token and user on success', async () => {
    const payload = { token: 'jwt_abc', user: mockUser };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    });

    const result = await pollToken('dc_123');

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: 'dc_123' }),
    });
  });

  it('throws AuthPendingError on 428', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 428 });

    await expect(pollToken('dc_123')).rejects.toThrow(AuthPendingError);
  });

  it('throws AuthExpiredError on 410', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 410 });

    await expect(pollToken('dc_123')).rejects.toThrow(AuthExpiredError);
  });

  it('throws generic error on other non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(pollToken('dc_123')).rejects.toThrow('Token poll failed: 503');
  });
});

describe('whoami', () => {
  it('returns user profile on success', async () => {
    const profile = {
      user: {
        id: 'u1',
        username: 'testuser',
        github_id: 12345,
        trust_tier: 'verified',
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
      },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(profile) });

    const result = await whoami('jwt_abc');

    expect(result).toEqual(profile);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/auth/whoami', {
      headers: { Authorization: 'Bearer jwt_abc' },
    });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(whoami('bad_token')).rejects.toThrow('Whoami failed: 401');
  });
});

describe('logout', () => {
  it('calls fetch with correct method and auth header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await logout('jwt_abc');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt_abc' },
    });
  });
});

describe('AuthPendingError', () => {
  it('has correct name and message', () => {
    const err = new AuthPendingError();
    expect(err.name).toBe('AuthPendingError');
    expect(err.message).toBe('Authorization pending');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('AuthExpiredError', () => {
  it('has correct name and message', () => {
    const err = new AuthExpiredError();
    expect(err.name).toBe('AuthExpiredError');
    expect(err.message).toBe('Device code expired');
    expect(err).toBeInstanceOf(Error);
  });
});
