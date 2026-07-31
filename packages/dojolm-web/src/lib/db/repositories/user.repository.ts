// SPDX-License-Identifier: Apache-2.0
/**
 * User Repository.
 * Handles user CRUD with password hashing and safe projections.
 */

import { BaseRepository } from './base.repository';
import { getDatabase } from '../database';
import { hashPassword } from '../../auth/auth';
import type { UserRow, UserRole } from '../types';
import crypto from 'node:crypto';

/** User data without sensitive fields (safe for API responses). */
export type SafeUser = Omit<UserRow, 'password_hash'>;

export class UserRepository extends BaseRepository<UserRow> {
  constructor() {
    super('users');
  }

  /**
   * Create a new user with hashed password.
   */
  async createUser(
    username: string,
    email: string | null,
    password: string,
    role: UserRole = 'member',
    displayName?: string
  ): Promise<SafeUser> {
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();

    const user = this.create({
      id,
      username,
      email,
      password_hash: passwordHash,
      role,
      display_name: displayName ?? username,
      enabled: 1,
    } as UserRow);

    return this.toSafeUser(user);
  }

  /**
   * Find user by username (for login).
   * Returns FULL user including password_hash.
   */
  findByUsername(username: string): UserRow | null {
    const db = this.getDb();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    return row ?? null;
  }

  /**
   * Find user by email.
   */
  findByEmail(email: string): UserRow | null {
    const db = this.getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ?? null;
  }

  /**
   * Update user role (admin only).
   */
  updateRole(userId: string, role: UserRole): SafeUser | null {
    const updated = this.update(userId, { role, updated_at: new Date().toISOString() } as Partial<UserRow>);
    return updated ? this.toSafeUser(updated) : null;
  }

  /**
   * Enable a user account.
   */
  enable(userId: string): SafeUser | null {
    const updated = this.update(userId, { enabled: 1, updated_at: new Date().toISOString() } as Partial<UserRow>);
    return updated ? this.toSafeUser(updated) : null;
  }

  /**
   * Disable a user account (soft delete).
   */
  disable(userId: string): SafeUser | null {
    const updated = this.update(userId, { enabled: 0, updated_at: new Date().toISOString() } as Partial<UserRow>);
    return updated ? this.toSafeUser(updated) : null;
  }

  /**
   * Update last login timestamp.
   */
  updateLastLogin(userId: string): void {
    this.update(userId, { last_login_at: new Date().toISOString() } as Partial<UserRow>);
  }

  /**
   * Update password for a user.
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    this.update(userId, { password_hash: passwordHash, updated_at: new Date().toISOString() } as Partial<UserRow>);
  }

  /**
   * List all users without password hashes.
   */
  listUsers(): SafeUser[] {
    const db = this.getDb();
    return db.prepare(
      `SELECT id, username, email, role, display_name, created_at, updated_at, last_login_at, enabled
       FROM users ORDER BY created_at`
    ).all() as SafeUser[];
  }

  /**
   * YR.14.1 — paginated list with the same safe projection as `listUsers()`.
   * Pushes LIMIT/OFFSET to SQL so admin lists scale beyond a single
   * full-table scan per page request. `total` is sourced from a
   * separate COUNT(*) so the second column is honest about the unfiltered
   * row count.
   */
  listUsersPaginated(limit: number, offset: number): { users: SafeUser[]; total: number } {
    const db = this.getDb();
    const users = db.prepare(
      `SELECT id, username, email, role, display_name, created_at, updated_at, last_login_at, enabled
       FROM users ORDER BY created_at LIMIT ? OFFSET ?`,
    ).all(limit, offset) as SafeUser[];
    const totalRow = db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
    return { users, total: totalRow.total };
  }

  /**
   * YR.14.1 — single-row safe projection. Mirror of `findById` that
   * never materialises the `password_hash` column. Used by admin user-
   * mutation routes that return the post-mutation snapshot.
   */
  findByIdSafe(id: string): SafeUser | null {
    const db = this.getDb();
    const row = db.prepare(
      `SELECT id, username, email, role, display_name, created_at, updated_at, last_login_at, enabled
       FROM users WHERE id = ?`,
    ).get(id) as SafeUser | undefined;
    return row ?? null;
  }

  /**
   * Count total users.
   */
  countUsers(): number {
    return this.count();
  }

  /**
   * Strip password_hash from a user row.
   */
  private toSafeUser(user: UserRow): SafeUser {
    const { password_hash: _, ...safe } = user;
    return safe;
  }
}

export const userRepo = new UserRepository();
