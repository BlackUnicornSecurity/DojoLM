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
    email: string,
    password: string,
    role: UserRole = 'viewer',
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
