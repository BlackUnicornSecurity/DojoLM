// SPDX-License-Identifier: Apache-2.0
/**
 * Shared Ronin Bounty Hub surface types + closed-enum maps.
 *
 * Extracted from `RoninAdminClient.tsx` per the >800 LOC split (PR #3
 * of the Phase 2 polish wave). Each `_components/*` consumer
 * (ProgramCard, ProgramFilterRow, SubmissionQueue) imports its narrow
 * tone/label record from here; the orchestrator (`RoninAdminClient.tsx`)
 * stays the single source of truth for the wire-shape sanitizers.
 *
 * Narrow direct-component-path imports only (per
 * the darwin-perf import rule).
 */

import type { SevStripLevel } from '@/design/primitives/SevStrip';
import type { AivssScore } from 'bu-tpi/aivss';

// ─── Closed-enum unions ──────────────────────────────────────────────

export type SubmissionStatus =
  | 'draft' | 'submitted' | 'triaged' | 'validated' | 'paid' | 'rejected';

export type SubmissionSeverity =
  | 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ProgramStatus = 'active' | 'paused' | 'upcoming' | 'closed';

export type BountyPlatform = 'hackerone' | 'bugcrowd' | 'huntr' | '0din';

export type PlatformFilter = BountyPlatform | 'all';
export type StatusFilter = ProgramStatus | 'all';

export type OwaspLlmCategoryId =
  | 'LLM01' | 'LLM02' | 'LLM03' | 'LLM04' | 'LLM05'
  | 'LLM06' | 'LLM07' | 'LLM08' | 'LLM09' | 'LLM10';

// ─── Narrowed wire shapes ────────────────────────────────────────────

export interface SubmissionLite {
  readonly id: string;
  readonly programId: string;
  readonly programName: string;
  readonly title: string;
  readonly status: SubmissionStatus;
  readonly severity: SubmissionSeverity;
  readonly cvssScore: number;
  readonly finalScore: number;
  readonly payout: number | null;
  readonly createdAt: string;
  readonly aivss?: AivssScore;
}

export interface ProgramLite {
  readonly id: string;
  readonly name: string;
  readonly company: string;
  readonly platform: BountyPlatform;
  readonly status: ProgramStatus;
  readonly scopeSummary: string;
  readonly rewardMin: number;
  readonly rewardMax: number;
  readonly currency: string;
  readonly subscribed?: true;
  readonly owaspLlmCoverage?: readonly OwaspLlmCategoryId[];
}

// ─── Caps + length constants ──────────────────────────────────────────

export const ID_MAX = 64;
export const TITLE_MAX = 200;
export const NAME_MAX = 120;
export const COMPANY_MAX = 120;
export const SCOPE_MAX = 240;
export const TS_MAX = 32;
export const PROGRAM_NAME_MAX = 120;

// ─── Submission lifecycle / severity maps ─────────────────────────────

import type { AttackRowStatus } from '@/design/primitives/AttackRow';

export const SUBMISSION_STATUS_TO_ATTACK_STATUS: Record<SubmissionStatus, AttackRowStatus> = {
  draft: 'open',
  submitted: 'queued',
  triaged: 'running',
  validated: 'pass',
  paid: 'pass',
  rejected: 'fail',
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  triaged: 'TRIAGED',
  validated: 'VALIDATED',
  paid: 'PAID',
  rejected: 'REJECTED',
};

/**
 * Pre-assembled AttackRow sub-line per status. Bounded by the closed
 * `SubmissionStatus` union so callers pass values straight into the
 * AttackRow `sub` prop without a cap call at the render boundary.
 */
export const SUBMISSION_STATUS_SUB: Record<SubmissionStatus, string> = {
  draft: 'Status DRAFT',
  submitted: 'Status SUBMITTED',
  triaged: 'Status TRIAGED',
  validated: 'Status VALIDATED',
  paid: 'Status PAID',
  rejected: 'Status REJECTED',
};

export const SUBMISSION_SEVERITY_TO_SEV_LEVEL: Record<SubmissionSeverity, SevStripLevel> = {
  critical: 'crit',
  high: 'high',
  medium: 'med',
  low: 'low',
  info: 'low',
};

// ─── Program status maps ──────────────────────────────────────────────

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  upcoming: 'UPCOMING',
  closed: 'CLOSED',
};

export const PROGRAM_SEVERITY_TO_SEV_LEVEL: Record<ProgramStatus, SevStripLevel> = {
  active: 'high',
  paused: 'med',
  upcoming: 'low',
  closed: 'low',
};

export type ChipTone = 'jade' | 'red' | 'gold' | 'steel';

export const PROGRAM_STATUS_CHIP_TONE: Record<ProgramStatus, ChipTone> = {
  active: 'jade',
  paused: 'red',
  upcoming: 'gold',
  closed: 'steel',
};

export const PROGRAM_STATUS_ACCENT_VAR: Record<ProgramStatus, string> = {
  active: 'var(--jade)',
  paused: 'var(--torii-lg)',
  upcoming: 'var(--gold)',
  closed: 'var(--steel)',
};

export const PLATFORM_LABEL: Record<BountyPlatform, string> = {
  hackerone: 'HackerOne',
  bugcrowd: 'Bugcrowd',
  huntr: 'huntr',
  '0din': '0din',
};

/**
 * Derived hunter row — synthesized from submissions per
 * `deriveHunters()` in the orchestrator. Carries `maxSev` for the
 * orchestrator's severity-rank sort comparator; the
 * `HunterLeaderboardPanel` sub-component reads only the display
 * fields (handle / bounties / payout / points). Architect LOW-1 fix
 * — single source of truth (previously duplicated as a narrower
 * shape inside `HunterLeaderboardPanel.tsx`).
 */
export interface HunterRow {
  readonly handle: string;
  readonly bounties: number;
  readonly payout: number;
  readonly maxSev: SubmissionSeverity;
  readonly points: number;
}
