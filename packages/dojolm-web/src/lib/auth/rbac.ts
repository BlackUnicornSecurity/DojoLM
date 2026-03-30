/**
 * Role-Based Access Control (RBAC).
 *
 * Three roles: admin, analyst, viewer.
 * - admin: Full access including user management and audit log
 * - analyst: Test execution, view results, no user management
 * - viewer: Read-only access to results and reports
 */

import type { UserRole } from '../db/types';

/** Valid user roles for RBAC validation */
export const VALID_ROLES: UserRole[] = ['admin', 'analyst', 'viewer'];

export type Resource =
  | 'models'
  | 'test-cases'
  | 'executions'
  | 'batches'
  | 'results'
  | 'reports'
  | 'scoreboard'
  | 'audit-log'
  | 'users'
  | 'admin-settings'
  | 'retention'
  | 'chat';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'execute';

/**
 * Permission matrix: role → resource → allowed actions.
 */
const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  admin: {
    'models': ['read', 'create', 'update', 'delete'],
    'test-cases': ['read', 'create', 'update', 'delete'],
    'executions': ['read', 'create', 'delete', 'execute'],
    'batches': ['read', 'create', 'delete', 'execute'],
    'results': ['read', 'delete'],
    'reports': ['read'],
    'scoreboard': ['read'],
    'audit-log': ['read'],
    'users': ['read', 'create', 'update', 'delete'],
    'admin-settings': ['read', 'update'],
    'retention': ['read', 'execute'],
    'chat': ['read', 'create', 'update', 'delete', 'execute'],
  },
  analyst: {
    'models': ['read', 'create', 'update'],
    'test-cases': ['read', 'create', 'update'],
    'executions': ['read', 'create', 'execute'],
    'batches': ['read', 'create', 'execute'],
    'results': ['read'],
    'reports': ['read'],
    'scoreboard': ['read'],
    'audit-log': [],
    'users': [],
    'admin-settings': [],
    'retention': [],
    'chat': ['read', 'create', 'execute'],
  },
  viewer: {
    'models': ['read'],
    'test-cases': ['read'],
    'executions': ['read'],
    'batches': ['read'],
    'results': ['read'],
    'reports': ['read'],
    'scoreboard': ['read'],
    'audit-log': [],
    'users': [],
    'admin-settings': [],
    'retention': [],
    'chat': ['read'],
  },
};

/**
 * Check if a role has permission to perform an action on a resource.
 */
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;

  return resourcePerms.includes(action);
}

/**
 * Get all allowed actions for a role on a resource.
 */
export function getAllowedActions(role: UserRole, resource: Resource): Action[] {
  return PERMISSIONS[role]?.[resource] ?? [];
}

/**
 * Check if a role is at least the specified minimum role level.
 * Role hierarchy: admin > analyst > viewer
 */
export function isAtLeastRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = { admin: 3, analyst: 2, viewer: 1 };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[minimumRole] ?? 0);
}
