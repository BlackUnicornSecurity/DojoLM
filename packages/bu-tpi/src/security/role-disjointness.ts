// SPDX-License-Identifier: Apache-2.0
/**
 * Role-disjointness enforcement per plan Section 0.1.1 / DEC-6 (2026-04-20).
 *
 * Applies to every role-set update when TEAM_MODE=multi. In TEAM_MODE=solo
 * the matrix collapses to a single user holding all roles under disclaimer +
 * WORM-log gating (see config/team-mode.ts); callers skip `assertDisjointRoles`
 * when mode is solo.
 */

import type { Role } from '../rbac/roles.js';

export type DisjointnessKind = 'hard' | 'conditional' | 'compatible';

export interface DisjointnessRule {
  readonly roleA: Role;
  readonly roleB: Role;
  readonly kind: DisjointnessKind;
  readonly reason: string;
  readonly auditFinding?: string;
}

export const DISJOINTNESS_MATRIX: readonly DisjointnessRule[] = [
  {
    roleA: 'admin',
    roleB: 'moderator',
    kind: 'hard',
    reason: 'Prevents manipulating leaderboard via admin backdoors',
    auditFinding: 'R-L4',
  },
  {
    roleA: 'admin',
    roleB: 'engagement-approver',
    kind: 'hard',
    reason:
      'Admin controls flags; approver authorizes harm-path engagements — single human must not hold both',
    auditFinding: 'R-U1',
  },
  {
    roleA: 'admin',
    roleB: 'operator',
    kind: 'compatible',
    reason: 'Admin inherits operator powers',
  },
  {
    roleA: 'admin',
    roleB: 'member',
    kind: 'compatible',
    reason: 'Admin can be a member (submit/view leaderboard)',
  },
  {
    roleA: 'moderator',
    roleB: 'engagement-approver',
    kind: 'hard',
    reason:
      'Approver authorizes harm-path engagements; moderator decides leaderboard — single-human bypass risk',
  },
  {
    roleA: 'moderator',
    roleB: 'operator',
    kind: 'compatible',
    reason: 'Separate concerns, low overlap risk',
  },
  {
    roleA: 'moderator',
    roleB: 'member',
    kind: 'conditional',
    reason:
      'Moderator may be a member but cannot review their own submissions — enforced at action time',
  },
  {
    roleA: 'engagement-approver',
    roleB: 'operator',
    kind: 'conditional',
    reason:
      'Approver may run operator flows but cannot self-approve engagements tied to those runs',
  },
  {
    roleA: 'engagement-approver',
    roleB: 'member',
    kind: 'compatible',
    reason: 'Approver can be a member',
  },
  {
    roleA: 'operator',
    roleB: 'member',
    kind: 'compatible',
    reason: 'Default case — operators typically are members',
  },
] as const;

export class DisjointnessViolationError extends Error {
  readonly code = 'RBAC.AUTH.DISJOINT_VIOLATION' as const;
  constructor(
    public readonly roleA: Role,
    public readonly roleB: Role,
    public readonly rule: DisjointnessRule,
  ) {
    super(
      `Roles "${roleA}" and "${roleB}" are disjoint: ${rule.reason}`,
    );
    this.name = 'DisjointnessViolationError';
  }
}

export class MissingDisjointnessRuleError extends Error {
  readonly code = 'RBAC.AUTH.DISJOINT_MATRIX_INCOMPLETE' as const;
  constructor(public readonly roleA: Role, public readonly roleB: Role) {
    super(
      `Missing disjointness rule for pair (${roleA}, ${roleB}) — update DEC-6 matrix in packages/bu-tpi/src/security/role-disjointness.ts`,
    );
    this.name = 'MissingDisjointnessRuleError';
  }
}

function lookupRule(a: Role, b: Role): DisjointnessRule | undefined {
  return DISJOINTNESS_MATRIX.find(
    (rule) =>
      (rule.roleA === a && rule.roleB === b) ||
      (rule.roleA === b && rule.roleB === a),
  );
}

export function getDisjointnessKind(a: Role, b: Role): DisjointnessKind {
  if (a === b) return 'compatible';
  const rule = lookupRule(a, b);
  if (!rule) throw new MissingDisjointnessRuleError(a, b);
  return rule.kind;
}

/**
 * Rejects any hard-disjoint pair in the given role set. Call at provisioning
 * time and on every role update. Conditional pairs are allowed and enforced
 * at action time (e.g., self-review block in Gap 9).
 */
export function assertDisjointRoles(roles: readonly Role[]): void {
  const unique = Array.from(new Set(roles));
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i]!;
      const b = unique[j]!;
      const rule = lookupRule(a, b);
      if (!rule) throw new MissingDisjointnessRuleError(a, b);
      if (rule.kind === 'hard') {
        throw new DisjointnessViolationError(a, b, rule);
      }
    }
  }
}

export function hasConditionalPair(roles: readonly Role[]): boolean {
  const unique = Array.from(new Set(roles));
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const rule = lookupRule(unique[i]!, unique[j]!);
      if (rule?.kind === 'conditional') return true;
    }
  }
  return false;
}
