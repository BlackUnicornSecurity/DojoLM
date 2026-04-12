import { beforeEach, describe, expect, it, vi } from 'vitest';

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
}

const sessionStorageMock = createStorageMock();
const localStorageMock = createStorageMock();

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('client-auth-access', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sessionStorageMock.clear();
    localStorageMock.clear();
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ user: null }), { status: 200 }));
  });

  it('returns true in test mode without a network probe', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    const { canAccessProtectedApi } = await import('../client-auth-access');

    await expect(canAccessProtectedApi()).resolves.toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns true when an API key is stored locally', async () => {
    sessionStorageMock.setItem('noda-api-key', 'dev-key');
    const { canAccessProtectedApi } = await import('../client-auth-access');

    await expect(canAccessProtectedApi()).resolves.toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns false when no API key or session user is available', async () => {
    const { canAccessProtectedApi } = await import('../client-auth-access');

    await expect(canAccessProtectedApi()).resolves.toBe(false);
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      method: 'GET',
      headers: { Accept: 'application/json' },
    }));
  });

  it('caches the auth probe result briefly', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ user: { id: 'user-1' } }), { status: 200 }));
    const { canAccessProtectedApi } = await import('../client-auth-access');

    await expect(canAccessProtectedApi()).resolves.toBe(true);
    await expect(canAccessProtectedApi()).resolves.toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
