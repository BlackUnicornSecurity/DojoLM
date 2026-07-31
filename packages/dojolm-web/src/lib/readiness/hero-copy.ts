// SPDX-License-Identifier: Apache-2.0
/**
 * File: hero-copy.ts
 * Purpose:
 *   - HAGANE E1.S2 — Command-hero title/lede copy matrix. Replaces the
 *     static "Good morning. All lanes green so far." + fictional lede
 *     ("overnight queue is clear") with copy SELECTED by the derived
 *     readiness band and COMPOSED from live facts only.
 *
 * Honesty contract (GUARDRAILS G13 / hallmark gate 56):
 *   - The lede states only facts passed in (counts, guard mode); a fact
 *     that is null/undefined is simply not mentioned.
 *   - Band phrases describe the DERIVED posture (whose receipts live on
 *     the gauge bars), never invented specifics.
 *   - The greeting follows the operator's local clock — supplied as an
 *     argument so tests stay deterministic.
 */

import type { ReadinessBand } from './derive';

export type HeroPostureStatus = 'live' | 'resolving' | 'unavailable';

export interface HeroFacts {
  readonly patternCount?: number | null;
  readonly runsLast48h?: number | null;
  readonly blockedLast48h?: number | null;
  readonly guardEnabled?: boolean | null;
  readonly guardMode?: string | null;
}

export interface HeroCopy {
  readonly eyebrow: string;
  /** Title renders as: {lead} <em>{em}</em>{tail} */
  readonly lead: string;
  readonly em: string;
  readonly tail: string;
  readonly lede: string;
  /**
   * The fact sentence alone (no band hint). The v2 command hero sub
   * renders this + an inline "Resume setup" link (Command Center
   * v2.html:130) instead of the band-hint `lede`.
   */
  readonly facts: string;
}

/**
 * Single-weight readiness verdict for the v2 command hero (Command Center
 * v2.html:129). Phrased from the derived score only — no greeting, no
 * band-emphasis italics (audit D5). Score `null` renders an honest
 * setup-pending line rather than a fabricated number.
 */
export function readinessVerdict(score: number | null, guardEnabled?: boolean | null): string {
  if (score === null) return 'Posture pending — finish setup to arm the dojo.';
  // Gate "armed" on the guard-enabled flag so the verdict agrees with the
  // "OFF" defenses chip rendered on the SAME hero from the SAME source (guard
  // health → guard-storage). This is the DISPLAYED guard state, NOT the
  // enforcement store (admin_settings.guard_mode); those can diverge — a known
  // store split tracked separately. We only remove the self-contradiction: a
  // full Coverage score (this is the coverage dial) must not print "armed"
  // while the same hero says the guard is off. (`undefined`/`null` = state
  // still loading → keep legacy copy.)
  if (score >= 80) {
    return guardEnabled === false
      ? `Readiness ${score}% — coverage ready, but the guard is off.`
      : `Readiness ${score}% — the dojo is armed.`;
  }
  return `Readiness ${score}% — finish setup to arm the dojo.`;
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning.';
  if (hour >= 12 && hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

const TITLE_BY_BAND: Record<ReadinessBand, { em: string; tail: string }> = {
  green: { em: 'All lanes green', tail: ' on the live signals.' },
  amber: { em: 'Mixed signals', tail: ' on the board.' },
  red: { em: 'Posture degraded', tail: ' — attention needed.' },
  unknown: { em: 'Signals pending', tail: '.' },
};

const HINT_BY_BAND: Record<ReadinessBand, string> = {
  green: 'Walk the standing playbook below, or pull a model into the Arena.',
  amber: 'Check the readiness bars before launching new probes.',
  red: 'Review guard configuration before trusting new results.',
  unknown: 'Waiting on live signals before claiming a posture.',
};

function factFragments(facts: HeroFacts): string[] {
  const parts: string[] = [];
  if (typeof facts.patternCount === 'number' && facts.patternCount >= 0) {
    parts.push(`${facts.patternCount.toLocaleString('en-US')} patterns loaded`);
  }
  const runs = facts.runsLast48h;
  const blocked = facts.blockedLast48h;
  if (typeof runs === 'number' && typeof blocked === 'number') {
    parts.push(
      `${runs.toLocaleString('en-US')} scan run${runs === 1 ? '' : 's'} and ${blocked.toLocaleString('en-US')} guard block${blocked === 1 ? '' : 's'} in the last 48h`,
    );
  } else if (typeof runs === 'number') {
    parts.push(`${runs.toLocaleString('en-US')} scan run${runs === 1 ? '' : 's'} in the last 48h`);
  } else if (typeof blocked === 'number') {
    parts.push(`${blocked.toLocaleString('en-US')} guard block${blocked === 1 ? '' : 's'} in the last 48h`);
  }
  if (facts.guardEnabled === false) {
    parts.push('guard disabled');
  } else if (typeof facts.guardMode === 'string' && facts.guardMode.length > 0) {
    parts.push(`guard mode ${facts.guardMode}`);
  }
  return parts;
}

/**
 * Compose the hero copy. `hour` = operator-local hour 0–23 (callers pass
 * `new Date().getHours()`; tests pass literals).
 */
export function heroCopyFor(
  band: ReadinessBand,
  status: HeroPostureStatus,
  facts: HeroFacts,
  hour: number,
): HeroCopy {
  const eyebrow =
    status === 'live'
      ? 'Posture · live'
      : status === 'resolving'
        ? 'Posture · resolving'
        : 'Posture · unavailable';

  const title = TITLE_BY_BAND[band];
  const fragments = factFragments(facts);
  const factSentence = fragments.length
    ? `${fragments.join(' · ')}.`
    : 'No live signals resolved yet.';

  return {
    eyebrow,
    lead: greetingFor(hour),
    em: title.em,
    tail: title.tail,
    lede: `${factSentence} ${HINT_BY_BAND[band]}`,
    facts: factSentence,
  };
}
