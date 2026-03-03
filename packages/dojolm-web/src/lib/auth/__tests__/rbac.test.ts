import { describe, it, expect } from 'vitest';
import { hasPermission, getAllowedActions, isAtLeastRole } from '../rbac';

describe('RBAC module', () => {
  describe('hasPermission', () => {
    it('admin has full access to users', () => {
      expect(hasPermission('admin', 'users', 'read')).toBe(true);
      expect(hasPermission('admin', 'users', 'create')).toBe(true);
      expect(hasPermission('admin', 'users', 'update')).toBe(true);
      expect(hasPermission('admin', 'users', 'delete')).toBe(true);
    });

    it('analyst cannot manage users', () => {
      expect(hasPermission('analyst', 'users', 'read')).toBe(false);
      expect(hasPermission('analyst', 'users', 'create')).toBe(false);
    });

    it('viewer cannot manage users', () => {
      expect(hasPermission('viewer', 'users', 'read')).toBe(false);
    });

    it('analyst can execute tests', () => {
      expect(hasPermission('analyst', 'executions', 'execute')).toBe(true);
      expect(hasPermission('analyst', 'batches', 'execute')).toBe(true);
    });

    it('viewer cannot execute tests', () => {
      expect(hasPermission('viewer', 'executions', 'execute')).toBe(false);
      expect(hasPermission('viewer', 'batches', 'execute')).toBe(false);
    });

    it('viewer can read results and reports', () => {
      expect(hasPermission('viewer', 'results', 'read')).toBe(true);
      expect(hasPermission('viewer', 'reports', 'read')).toBe(true);
      expect(hasPermission('viewer', 'scoreboard', 'read')).toBe(true);
    });

    it('admin can view audit log', () => {
      expect(hasPermission('admin', 'audit-log', 'read')).toBe(true);
    });

    it('non-admin cannot view audit log', () => {
      expect(hasPermission('analyst', 'audit-log', 'read')).toBe(false);
      expect(hasPermission('viewer', 'audit-log', 'read')).toBe(false);
    });
  });

  describe('getAllowedActions', () => {
    it('returns all actions for admin on models', () => {
      const actions = getAllowedActions('admin', 'models');
      expect(actions).toContain('read');
      expect(actions).toContain('create');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');
    });

    it('returns empty array for viewer on users', () => {
      expect(getAllowedActions('viewer', 'users')).toEqual([]);
    });
  });

  describe('isAtLeastRole', () => {
    it('admin is at least viewer', () => {
      expect(isAtLeastRole('admin', 'viewer')).toBe(true);
    });

    it('admin is at least analyst', () => {
      expect(isAtLeastRole('admin', 'analyst')).toBe(true);
    });

    it('admin is at least admin', () => {
      expect(isAtLeastRole('admin', 'admin')).toBe(true);
    });

    it('analyst is at least viewer', () => {
      expect(isAtLeastRole('analyst', 'viewer')).toBe(true);
    });

    it('analyst is NOT at least admin', () => {
      expect(isAtLeastRole('analyst', 'admin')).toBe(false);
    });

    it('viewer is NOT at least analyst', () => {
      expect(isAtLeastRole('viewer', 'analyst')).toBe(false);
    });
  });
});
