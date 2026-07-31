// SPDX-License-Identifier: Apache-2.0
/**
 * RBAC role matrix per Industry-Tools-Parity plan Section 0.1.
 *
 * These 5 roles are the canonical platform RBAC primitives used by the
 * foundation middleware and harm-path gates (flags, engagements,
 * leaderboard moderation). dojolm-web's `UserRole` (in
 * `src/lib/db/types.ts`) was reconciled to this same 5-role matrix on
 * 2026-04-22 (#138, migration 005) — both sides now share:
 *
 *   admin                — full access
 *   engagement-approver  — Gap 6 engagement authorisation
 *   moderator            — Gap 9 submission review
 *   operator             — run probes/matches/chains (legacy: analyst)
 *   member               — view-only + own-budget (legacy: viewer)
 *
 * Single-user role combinations are constrained by the disjointness
 * policy in `security/role-disjointness.ts` (plan §0.1.1).
 */

export const ROLES = [
  'admin',
  'engagement-approver',
  'moderator',
  'operator',
  'member',
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export const PERMISSIONS = [
  'manage-flags',
  'trigger-killswitch',
  'manage-users',
  'read-audit-log',
  'create-engagement',
  'revoke-engagement',
  'sign-engagement',
  'review-submission',
  'approve-submission',
  'reject-submission',
  'escalate-critical',
  'run-probe',
  'run-refusal-loop',
  'run-long-match',
  'run-chain',
  'submit-payload',
  'view-leaderboard',
  'configure-budget',
  'run-match',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  admin: [
    'manage-flags',
    'trigger-killswitch',
    'manage-users',
    'read-audit-log',
    'run-probe',
    'run-refusal-loop',
    'run-long-match',
    'run-chain',
    'submit-payload',
    'view-leaderboard',
    'configure-budget',
    'run-match',
  ],
  'engagement-approver': [
    'create-engagement',
    'revoke-engagement',
    'sign-engagement',
  ],
  moderator: [
    'review-submission',
    'approve-submission',
    'reject-submission',
    'escalate-critical',
    'read-audit-log',
  ],
  operator: [
    'run-probe',
    'run-refusal-loop',
    'run-long-match',
    'run-chain',
  ],
  member: [
    'submit-payload',
    'view-leaderboard',
    'configure-budget',
    'run-match',
  ],
} as const;

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function rolesHavePermission(
  roles: readonly Role[],
  permission: Permission,
): boolean {
  return roles.some((role) => roleHasPermission(role, permission));
}
