// SPDX-License-Identifier: Apache-2.0
/**
 * Pure-function RBAC guards. Transport-agnostic so the same helpers are
 * reused by the Next.js middleware (dojolm-web) and any CLI / background
 * worker that needs the same policy.
 */

import {
  type Role,
  type Permission,
  roleHasPermission,
} from './roles.js';

export interface AuthenticatedPrincipal {
  readonly accountId: string;
  readonly providerId: string;
  readonly roles: readonly Role[];
  readonly orgUnit?: string;
  readonly deviceFingerprint?: string;
  readonly sessionId?: string;
}

export type RbacErrorCode =
  | 'RBAC.AUTH.ROLE_REQUIRED'
  | 'RBAC.AUTH.PERMISSION_REQUIRED'
  | 'RBAC.AUTH.SELF_APPROVAL_BLOCKED';

export class RbacDeniedError extends Error {
  constructor(
    public readonly code: RbacErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RbacDeniedError';
  }
}

export function requireRole(
  principal: AuthenticatedPrincipal | null,
  required: Role | readonly Role[],
): void {
  if (!principal) {
    throw new RbacDeniedError(
      'RBAC.AUTH.ROLE_REQUIRED',
      'Authentication required',
    );
  }
  const list = Array.isArray(required) ? required : [required as Role];
  const hasAny = list.some((role) => principal.roles.includes(role));
  if (!hasAny) {
    throw new RbacDeniedError(
      'RBAC.AUTH.ROLE_REQUIRED',
      `One of roles required: ${list.join(', ')}`,
    );
  }
}

export function requirePermission(
  principal: AuthenticatedPrincipal | null,
  permission: Permission,
): void {
  if (!principal) {
    throw new RbacDeniedError(
      'RBAC.AUTH.PERMISSION_REQUIRED',
      'Authentication required',
    );
  }
  const allowed = principal.roles.some((role) =>
    roleHasPermission(role, permission),
  );
  if (!allowed) {
    throw new RbacDeniedError(
      'RBAC.AUTH.PERMISSION_REQUIRED',
      `Permission required: ${permission}`,
    );
  }
}

export function principalHasRole(
  principal: AuthenticatedPrincipal,
  role: Role,
): boolean {
  return principal.roles.includes(role);
}

export function principalHasPermission(
  principal: AuthenticatedPrincipal,
  permission: Permission,
): boolean {
  return principal.roles.some((role) => roleHasPermission(role, permission));
}

/**
 * Assert that the actor is not self-approving a subject tied to their own
 * account. Used by Gap 6 engagement approval (R-U1) and Gap 9 submission
 * review (R-L4 cross-role self-review).
 */
export function assertNotSelfApproval(
  actor: AuthenticatedPrincipal,
  subjectAccountId: string,
): void {
  if (actor.accountId === subjectAccountId) {
    throw new RbacDeniedError(
      'RBAC.AUTH.SELF_APPROVAL_BLOCKED',
      'You cannot approve your own submission or engagement',
    );
  }
}
