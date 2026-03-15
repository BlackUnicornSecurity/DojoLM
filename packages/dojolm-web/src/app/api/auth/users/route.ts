/**
 * File: /api/auth/users/route.ts
 * Purpose: User management API — list/create users (admin only)
 * Story: S107 (User Management)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { userRepo } from '@/lib/db/repositories/user.repository';
import type { UserRole } from '@/lib/db/types';

const VALID_ROLES: UserRole[] = ['admin', 'analyst', 'viewer'];

export const GET = withAuth(
  async () => {
    const users = userRepo.listUsers();
    return NextResponse.json({ users });
  },
  { role: 'admin', resource: 'users', action: 'read' }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { username, email, password, role, displayName } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }

      if (role && !VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
          { status: 400 }
        );
      }

      // Check for existing username/email
      if (userRepo.findByUsername(username)) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
      if (email && userRepo.findByEmail(email)) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const user = await userRepo.createUser(username, email ?? null, password, role, displayName);
      return NextResponse.json({ user }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
  },
  { role: 'admin', resource: 'users', action: 'create' }
);
