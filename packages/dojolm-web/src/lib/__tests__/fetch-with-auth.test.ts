/**
 * File: fetch-with-auth.test.ts
 * Purpose: Tests for authenticated fetch utility
 * Coverage: FWA-001 to FWA-008
 * Source: src/lib/fetch-with-auth.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both sessionStorage (preferred) and localStorage (legacy fallback)
function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
}

const sessionStorageMock = createStorageMock();
const localStorageMock = createStorageMock();

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
vi.stubGlobal('fetch', mockFetch);

import { getApiKey, setApiKey, clearApiKey, fetchWithAuth } from '../fetch-with-auth';

describe('fetch-with-auth', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  describe('getApiKey', () => {
    // FWA-001: Returns null when no key stored
    it('FWA-001: returns null when no key stored', () => {
      expect(getApiKey()).toBeNull();
    });

    // FWA-002: Returns stored key (from sessionStorage preferred, or localStorage fallback)
    it('FWA-002: returns stored key', () => {
      sessionStorageMock.setItem('noda-api-key', 'test-key-123');
      expect(getApiKey()).toBe('test-key-123');
    });
  });

  describe('setApiKey', () => {
    // FWA-003: Saves key to sessionStorage (AUTH-04: preferred over localStorage)
    it('FWA-003: saves key to sessionStorage', () => {
      setApiKey('my-key');
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('noda-api-key', '"my-key"');
    });
  });

  describe('clearApiKey', () => {
    // FWA-004: Removes key from localStorage
    it('FWA-004: removes key from localStorage', () => {
      setApiKey('my-key');
      clearApiKey();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('noda-api-key');
    });
  });

  describe('fetchWithAuth', () => {
    // FWA-005: Adds X-API-Key header when key exists
    it('FWA-005: adds X-API-Key header when key exists', async () => {
      sessionStorageMock.setItem('noda-api-key', 'test-key');

      await fetchWithAuth('/api/test');

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers;
      expect(calledHeaders).toBeDefined();
      expect(new Headers(calledHeaders).get('X-API-Key')).toBe('test-key');
    });

    // FWA-006: Does not add header when no key
    it('FWA-006: does not add X-API-Key header when no key', async () => {
      await fetchWithAuth('/api/test');

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers;
      expect(new Headers(calledHeaders).get('X-API-Key')).toBeNull();
    });

    // FWA-007: Passes through init options
    it('FWA-007: passes through fetch init options', async () => {
      await fetchWithAuth('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: true }),
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: true }),
      }));
    });

    // FWA-008: Handles 401 response without throwing
    it('FWA-008: handles 401 response gracefully', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"error":"Unauthorized"}', { status: 401 }));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const res = await fetchWithAuth('/api/test');

      expect(res.status).toBe(401);
      warnSpy.mockRestore();
    });

    it('retries transient same-origin GET failures', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const res = await fetchWithAuth('/api/test');

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry transient POST failures', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(fetchWithAuth('/api/test', { method: 'POST', body: '{}' })).rejects.toThrow('Failed to fetch');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
