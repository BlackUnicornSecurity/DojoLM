/**
 * File: auth/users/__tests__/route.test.ts
 * Purpose: Tests for GET/POST /api/auth/users API route
 * Source: src/app/api/auth/users/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// withAuth passthrough — calls handler directly
vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

// Mock the singleton userRepo, not the class
const mockFindByUsername = vi.fn();
const mockFindByEmail = vi.fn();
const mockCreateUser = vi.fn();
const mockListUsers = vi.fn();

vi.mock('@/lib/db/repositories/user.repository', () => ({
  userRepo: {
    findByUsername: (...args: unknown[]) => mockFindByUsername(...args),
    findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    listUsers: (...args: unknown[]) => mockListUsers(...args),
  },
}));

vi.mock('@/lib/db/types', () => ({}));

// --- Helpers ---

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/users', {
    method: 'GET',
  });
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockUserList = [
  { id: 'u1', username: 'admin', email: 'admin@test.com', role: 'admin' },
  { id: 'u2', username: 'analyst', email: 'analyst@test.com', role: 'analyst' },
];

const mockCreatedUser = {
  id: 'u3',
  username: 'newuser',
  email: 'new@test.com',
  role: 'viewer',
  display_name: 'New User',
};

// --- Tests ---

describe('GET /api/auth/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // USR-001: GET returns list of users
  it('USR-001: returns list of users', async () => {
    mockListUsers.mockReturnValue(mockUserList);
    const { GET } = await import('@/app/api/auth/users/route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual(mockUserList);
  });

  // USR-002: GET returns empty array when no users
  it('USR-002: returns empty array when no users exist', async () => {
    mockListUsers.mockReturnValue([]);
    const { GET } = await import('@/app/api/auth/users/route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([]);
  });

  // USR-003: GET response has users key
  it('USR-003: response contains users key', async () => {
    mockListUsers.mockReturnValue([]);
    const { GET } = await import('@/app/api/auth/users/route');
    const res = await GET(createGetRequest());
    const body = await res.json();
    expect(body).toHaveProperty('users');
  });

  // USR-004: listUsers is called
  it('USR-004: calls listUsers on the repository', async () => {
    mockListUsers.mockReturnValue([]);
    const { GET } = await import('@/app/api/auth/users/route');
    await GET(createGetRequest());
    expect(mockListUsers).toHaveBeenCalled();
  });
});

describe('POST /api/auth/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByUsername.mockReturnValue(null);
    mockFindByEmail.mockReturnValue(null);
    mockCreateUser.mockResolvedValue(mockCreatedUser);
  });

  // USR-005: POST creates user and returns 201
  it('USR-005: creates a user and returns 201', async () => {
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({
        username: 'newuser',
        email: 'new@test.com',
        password: 'SecureP@ss1',
        role: 'viewer',
        displayName: 'New User',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user).toEqual(mockCreatedUser);
  });

  // USR-006: POST missing username returns 400
  it('USR-006: returns 400 when username is missing', async () => {
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({ email: 'a@b.com', password: 'pw' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  // USR-007: POST missing email returns 400
  it('USR-007: returns 400 when email is missing', async () => {
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({ username: 'user', password: 'pw' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  // USR-008: POST missing password returns 400
  it('USR-008: returns 400 when password is missing', async () => {
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({ username: 'user', email: 'a@b.com' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  // USR-009: POST invalid role returns 400
  it('USR-009: returns 400 when role is invalid', async () => {
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({
        username: 'user',
        email: 'a@b.com',
        password: 'pw',
        role: 'superadmin',
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid role/i);
  });

  // USR-010: POST duplicate username returns 409
  it('USR-010: returns 409 when username already exists', async () => {
    mockFindByUsername.mockReturnValue({ id: 'existing' });
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({
        username: 'admin',
        email: 'new@test.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/username already exists/i);
  });

  // USR-011: POST duplicate email returns 409
  it('USR-011: returns 409 when email already exists', async () => {
    mockFindByEmail.mockReturnValue({ id: 'existing' });
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({
        username: 'uniqueuser',
        email: 'admin@test.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/email already exists/i);
  });

  // USR-012: POST internal error returns 500
  it('USR-012: returns 500 on internal error during user creation', async () => {
    mockCreateUser.mockRejectedValue(new Error('DB error'));
    const { POST } = await import('@/app/api/auth/users/route');
    const res = await POST(
      createPostRequest({
        username: 'newuser',
        email: 'new@test.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to create user/i);
  });
});
