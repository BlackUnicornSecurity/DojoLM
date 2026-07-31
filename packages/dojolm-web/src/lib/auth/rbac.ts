// SPDX-License-Identifier: Apache-2.0
/**
 * Role-Based Access Control (RBAC) — dojolm-web surface of the
 * plan-level 5-role matrix (#138 reconciled 2026-04-22).
 *
 * Roles — mirrors `bu-tpi/rbac`'s canonical `Role`:
 *   admin                — full access, user management, audit log
 *   engagement-approver  — (Gap 6 Phase E) sign engagements; elsewhere
 *                          treated as moderator-level read
 *   moderator            — (Gap 9 Phase D) review submissions; elsewhere
 *                          treated as read-all
 *   operator             — run probes/matches/chains; cannot modify
 *                          budgets or flags (supersedes legacy `analyst`)
 *   member               — view-only + submit + own-budget
 *                          (supersedes legacy `viewer`)
 *
 * The dojolm-web permission matrix below grades each role's access to
 * the web-surface resources that exist today. Plan-level harm-path
 * permissions (create-engagement, approve-submission, etc.) stay in
 * `bu-tpi/rbac/ROLE_PERMISSIONS` and are consulted by harm-path
 * surfaces when they land.
 */

import { USER_ROLES, type UserRole } from '../db/types';

/** Valid user roles for RBAC validation — re-exported from db/types. */
export const VALID_ROLES: readonly UserRole[] = USER_ROLES;

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

const ADMIN_PERMISSIONS: Record<Resource, Action[]> = {
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
};

const OPERATOR_PERMISSIONS: Record<Resource, Action[]> = {
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
};

const MEMBER_PERMISSIONS: Record<Resource, Action[]> = {
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
};

// Moderator gets read-all across the web surface; submission-review
// permissions live in bu-tpi's harm-path permission set (Gap 9).
const MODERATOR_PERMISSIONS: Record<Resource, Action[]> = {
  ...MEMBER_PERMISSIONS,
  'audit-log': ['read'],
};

// Engagement-approver gets moderator-equivalent web access today;
// create/revoke/sign-engagement permissions live in bu-tpi (Gap 6).
const ENGAGEMENT_APPROVER_PERMISSIONS: Record<Resource, Action[]> = {
  ...MODERATOR_PERMISSIONS,
};

const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  'admin': ADMIN_PERMISSIONS,
  'engagement-approver': ENGAGEMENT_APPROVER_PERMISSIONS,
  'moderator': MODERATOR_PERMISSIONS,
  'operator': OPERATOR_PERMISSIONS,
  'member': MEMBER_PERMISSIONS,
};

/**
 * Check if a role has permission to perform an action on a resource.
 */
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const allowed = PERMISSIONS[role]?.[resource];
  return allowed?.includes(action) ?? false;
}

/**
 * Return the full allowed-action list for a role on a resource.
 */
export function getAllowedActions(role: UserRole, resource: Resource): Action[] {
  return PERMISSIONS[role]?.[resource] ?? [];
}

/**
 * Role hierarchy for "at least X" gates on the web surface.
 * Ordering:
 *   admin > engagement-approver > moderator > operator > member
 *
 * Note: this is a _web-surface_ precedence, not the plan's disjointness
 * policy (§0.1.1) — single-user role combinations are enforced by
 * bu-tpi's `assertDisjointRoles`. This function answers only "is the
 * caller at least as privileged as X for a given request gate?"
 */
export function isAtLeastRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    'admin': 5,
    'engagement-approver': 4,
    'moderator': 3,
    'operator': 2,
    'member': 1,
  };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[minimumRole] ?? 0);
}
