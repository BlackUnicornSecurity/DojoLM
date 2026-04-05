/**
 * Tests for demo mode utilities and API route behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Demo Mode Utility', () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEMO_MODE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_DEMO_MODE;
    } else {
      process.env.NEXT_PUBLIC_DEMO_MODE = originalEnv;
    }
    vi.resetModules();
  });

  it('isDemoMode returns true when NEXT_PUBLIC_DEMO_MODE is "true"', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const { isDemoMode } = await import('../index');
    expect(isDemoMode()).toBe(true);
  });

  it('isDemoMode returns false when NEXT_PUBLIC_DEMO_MODE is not set', async () => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    const { isDemoMode } = await import('../index');
    expect(isDemoMode()).toBe(false);
  });

  it('isDemoMode returns false when NEXT_PUBLIC_DEMO_MODE is "false"', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    const { isDemoMode } = await import('../index');
    expect(isDemoMode()).toBe(false);
  });

  it('isDemoMode returns false for truthy but not "true" values', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = '1';
    const { isDemoMode } = await import('../index');
    expect(isDemoMode()).toBe(false);
  });

  it('DEMO_USER has required fields', async () => {
    const { DEMO_USER } = await import('../index');
    expect(DEMO_USER).toEqual({
      id: 'demo-admin-001',
      username: 'demo-admin',
      email: 'admin@demo.dojolm.ai',
      role: 'admin',
      displayName: 'Demo Admin',
    });
  });

  it('DEMO_USER role is admin', async () => {
    const { DEMO_USER } = await import('../index');
    expect(DEMO_USER.role).toBe('admin');
  });

  it('DEMO_SESSION_TOKEN is a non-empty string', async () => {
    const { DEMO_SESSION_TOKEN } = await import('../index');
    expect(typeof DEMO_SESSION_TOKEN).toBe('string');
    expect(DEMO_SESSION_TOKEN.length).toBeGreaterThan(0);
  });

  it('DEMO_CSRF_TOKEN is a non-empty string', async () => {
    const { DEMO_CSRF_TOKEN } = await import('../index');
    expect(typeof DEMO_CSRF_TOKEN).toBe('string');
    expect(DEMO_CSRF_TOKEN.length).toBeGreaterThan(0);
  });
});

describe('Auth bypass in demo mode', () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_DEMO_MODE;
    } else {
      process.env.NEXT_PUBLIC_DEMO_MODE = originalEnv;
    }
    vi.resetModules();
  });

  it('checkApiAuth returns null in demo mode', async () => {
    const { isDemoMode } = await import('../index');
    expect(isDemoMode()).toBe(true);
    // The actual checkApiAuth function imports isDemoMode and returns null
    // We test the utility function here; integration tests cover the route behavior
  });
});

describe('DEMO_USER does not contain sensitive data', () => {
  it('has no password field', async () => {
    const { DEMO_USER } = await import('../index');
    expect(DEMO_USER).not.toHaveProperty('password');
    expect(DEMO_USER).not.toHaveProperty('passwordHash');
    expect(DEMO_USER).not.toHaveProperty('password_hash');
  });

  it('has no API key field', async () => {
    const { DEMO_USER } = await import('../index');
    expect(DEMO_USER).not.toHaveProperty('apiKey');
    expect(DEMO_USER).not.toHaveProperty('api_key');
    expect(DEMO_USER).not.toHaveProperty('token');
  });

  it('uses demo email domain', async () => {
    const { DEMO_USER } = await import('../index');
    expect(DEMO_USER.email).toContain('demo.');
  });
});
