/**
 * Tests for RBAC (Role-Based Access Control) module
 */
import { describe, it, expect } from 'vitest';
import { VALID_ROLES, hasPermission, getAllowedActions, isAtLeastRole } from '../auth/rbac';

describe('RBAC', () => {
  describe('VALID_ROLES', () => {
    it('contains admin, analyst, viewer', () => {
      expect(VALID_ROLES).toContain('admin');
      expect(VALID_ROLES).toContain('analyst');
      expect(VALID_ROLES).toContain('viewer');
    });
  });

  describe('hasPermission', () => {
    it('admin can do anything', () => {
      expect(hasPermission('admin', 'models', 'read')).toBe(true);
      expect(hasPermission('admin', 'users', 'delete')).toBe(true);
    });
    it('viewer can only read', () => {
      expect(hasPermission('viewer', 'models', 'read')).toBe(true);
      expect(hasPermission('viewer', 'models', 'create')).toBe(false);
      expect(hasPermission('viewer', 'models', 'delete')).toBe(false);
    });
    it('analyst can read and create but not manage users', () => {
      expect(hasPermission('analyst', 'models', 'read')).toBe(true);
      expect(hasPermission('analyst', 'models', 'create')).toBe(true);
      expect(hasPermission('analyst', 'users', 'delete')).toBe(false);
    });
    it('returns false for unknown role', () => {
      expect(hasPermission('unknown' as any, 'models', 'read')).toBe(false);
    });
  });

  describe('getAllowedActions', () => {
    it('returns actions for valid role/resource', () => {
      const actions = getAllowedActions('admin', 'models');
      expect(actions).toContain('read');
      expect(actions.length).toBeGreaterThan(0);
    });
    it('returns empty for viewer creating', () => {
      const actions = getAllowedActions('viewer', 'users');
      expect(actions).not.toContain('delete');
    });
  });

  describe('isAtLeastRole', () => {
    it('admin >= any role', () => {
      expect(isAtLeastRole('admin', 'admin')).toBe(true);
      expect(isAtLeastRole('admin', 'analyst')).toBe(true);
      expect(isAtLeastRole('admin', 'viewer')).toBe(true);
    });
    it('viewer < analyst', () => {
      expect(isAtLeastRole('viewer', 'analyst')).toBe(false);
    });
    it('analyst >= viewer', () => {
      expect(isAtLeastRole('analyst', 'viewer')).toBe(true);
    });
  });
});
