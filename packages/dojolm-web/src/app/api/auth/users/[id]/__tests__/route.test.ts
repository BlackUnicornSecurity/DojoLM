/**
 * File: auth/users/[id]/__tests__/route.test.ts
 * Purpose: Tests for PATCH /api/auth/users/[id] API route
 * Source: src/app/api/auth/users/[id]/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// withAuth passthrough — calls handler directly
vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

// Mock the singleton userRepo, not the class
const mockFindById = vi.fn();
const mockEnable = vi.fn();
const mockDisable = vi.fn();
const mockUpdateRole = vi.fn();

vi.mock('@/lib/db/repositories/user.repository', () => ({
  userRepo: {
    findById: (...args: unknown[]) => mockFindById(...args),
    enable: (...args: unknown[]) => mockEnable(...args),
    disable: (...args: unknown[]) => mockDisable(...args),
    updateRole: (...args: unknown[]) => mockUpdateRole(...args),
  },
}));

vi.mock('@/lib/db/types', () => ({}));

// --- Helpers ---

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/auth/users/user-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'analyst',
  enabled: true,
};

// --- Tests ---

describe('PATCH /api/auth/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UID-001: Enable user successfully
  it('UID-001: enables a user and returns the user object', async () => {
    const enabledUser = { ...mockUser, enabled: true };
    mockEnable.mockReturnValue(enabledUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'enable' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(enabledUser);
    expect(mockEnable).toHaveBeenCalledWith('user-1');
  });

  // UID-002: Disable user successfully
  it('UID-002: disables a user and returns the user object', async () => {
    const disabledUser = { ...mockUser, enabled: false };
    mockDisable.mockReturnValue(disabledUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'disable' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(disabledUser);
    expect(mockDisable).toHaveBeenCalledWith('user-1');
  });

  // UID-003: Update role to admin
  it('UID-003: updates user role to admin', async () => {
    const updatedUser = { ...mockUser, role: 'admin' };
    mockUpdateRole.mockReturnValue(updatedUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ role: 'admin' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('admin');
    expect(mockUpdateRole).toHaveBeenCalledWith('user-1', 'admin');
  });

  // UID-004: Update role to viewer
  it('UID-004: updates user role to viewer', async () => {
    const updatedUser = { ...mockUser, role: 'viewer' };
    mockUpdateRole.mockReturnValue(updatedUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ role: 'viewer' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('viewer');
    expect(mockUpdateRole).toHaveBeenCalledWith('user-1', 'viewer');
  });

  // UID-005: Update role to analyst
  it('UID-005: updates user role to analyst', async () => {
    const updatedUser = { ...mockUser, role: 'analyst' };
    mockUpdateRole.mockReturnValue(updatedUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ role: 'analyst' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('analyst');
  });

  // UID-006: Invalid role returns 400
  it('UID-006: returns 400 for an invalid role', async () => {
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ role: 'superadmin' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid role/i);
  });

  // UID-007: Enable non-existent user returns 404
  it('UID-007: returns 404 when enabling a non-existent user', async () => {
    mockEnable.mockReturnValue(null);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'enable' }), {
      params: { id: 'no-such-user' },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // UID-008: Disable non-existent user returns 404
  it('UID-008: returns 404 when disabling a non-existent user', async () => {
    mockDisable.mockReturnValue(null);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'disable' }), {
      params: { id: 'no-such-user' },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // UID-009: Update role on non-existent user returns 404
  it('UID-009: returns 404 when updating role for a non-existent user', async () => {
    mockUpdateRole.mockReturnValue(null);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ role: 'admin' }), {
      params: { id: 'no-such-user' },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // UID-010: No valid action or role returns 400
  it('UID-010: returns 400 when no valid action is specified', async () => {
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ foo: 'bar' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no valid action/i);
  });

  // UID-011: Missing user ID returns 400
  it('UID-011: returns 400 when user ID is missing from params', async () => {
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'enable' }), {
      params: {},
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/user id required/i);
  });

  // UID-012: Malformed JSON body returns 500
  it('UID-012: returns 500 when request body is malformed', async () => {
    const req = new NextRequest('http://localhost:42001/api/auth/users/user-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(req, {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to update user/i);
  });

  // UID-013: Empty body returns 500 (json parse fails on empty)
  it('UID-013: returns 500 when request body is empty', async () => {
    const req = new NextRequest('http://localhost:42001/api/auth/users/user-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(req, {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to update user/i);
  });

  // UID-014: Unknown action string returns 400
  it('UID-014: returns 400 for an unknown action string', async () => {
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    const res = await PATCH(createPatchRequest({ action: 'delete' }), {
      params: { id: 'user-1' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no valid action/i);
  });

  // UID-015: Enable calls repo with correct user ID
  it('UID-015: passes the correct user ID to the enable method', async () => {
    mockEnable.mockReturnValue(mockUser);
    const { PATCH } = await import('@/app/api/auth/users/[id]/route');
    await PATCH(createPatchRequest({ action: 'enable' }), {
      params: { id: 'specific-id-123' },
    });
    expect(mockEnable).toHaveBeenCalledWith('specific-id-123');
  });
});
