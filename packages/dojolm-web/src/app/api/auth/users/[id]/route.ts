/**
 * File: /api/auth/users/[id]/route.ts
 * Purpose: Single user management — update role, enable/disable
 * Story: S107 (User Management)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { userRepo } from '@/lib/db/repositories/user.repository';
import type { UserRole } from '@/lib/db/types';

const VALID_ROLES: UserRole[] = ['admin', 'analyst', 'viewer'];

export const PATCH = withAuth(
  async (req: NextRequest, { params, user: currentUser }: { params?: Record<string, string>; user?: { id: string } }) => {
    const userId = params?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
      const body = await req.json();

      // Self-modification guard — prevent admin from modifying their own account
      if (currentUser?.id === userId) {
        return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 403 });
      }

      if (body.action === 'enable') {
        const user = userRepo.enable(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ user });
      }

      if (body.action === 'disable') {
        const user = userRepo.disable(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ user });
      }

      if (body.role) {
        if (!VALID_ROLES.includes(body.role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        const user = userRepo.updateRole(userId, body.role);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ user });
      }

      return NextResponse.json({ error: 'No valid action specified' }, { status: 400 });
    } catch {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  },
  { role: 'admin', resource: 'users', action: 'update' }
);
