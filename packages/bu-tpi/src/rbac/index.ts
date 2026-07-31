// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/rbac. Keep this flat — downstream packages depend on
 * stable re-exports.
 */
export {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  isRole,
  roleHasPermission,
  rolesHavePermission,
} from './roles.js';
export type { Role, Permission } from './roles.js';

export {
  RbacDeniedError,
  requireRole,
  requirePermission,
  principalHasRole,
  principalHasPermission,
  assertNotSelfApproval,
} from './guard.js';
export type { AuthenticatedPrincipal, RbacErrorCode } from './guard.js';
