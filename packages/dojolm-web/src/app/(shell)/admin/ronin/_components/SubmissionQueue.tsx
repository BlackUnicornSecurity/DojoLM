// SPDX-License-Identifier: Apache-2.0
/**
 * SubmissionQueue — bug-bounty submission rows for the Ronin Hub
 * Submissions tab.
 *
 * Extracted from `RoninAdminClient.tsx` per the >800 LOC split (PR #3).
 * Pure presentational — caller owns the row data + cap. testId
 * discipline preserved byte-identical so EA9-* tests stay green.
 *
 * Narrow direct-component-path imports per
 * the darwin-perf import rule.
 */

import type { ReactElement } from 'react';
import { AttackRow, type AttackRowItem } from '@/design/primitives/AttackRow';
import { AivssPill } from '@/design/aivss';
import { cap } from '@/design/primitives/_caps';
import type { AivssScore } from 'bu-tpi/aivss';
import {
  SUBMISSION_SEVERITY_TO_SEV_LEVEL,
  SUBMISSION_STATUS_SUB,
  SUBMISSION_STATUS_TO_ATTACK_STATUS,
  type SubmissionLite,
} from './types';

export interface SubmissionQueueProps {
  readonly rows: readonly SubmissionLite[];
}

export function SubmissionQueue({ rows }: SubmissionQueueProps): ReactElement {
  if (rows.length === 0) {
    return (
      <p className="wb-hint" data-testid="ronin-queue-empty">
        Submission queue is empty.
      </p>
    );
  }
  return (
    <div
      className="yr4-data-list"
      role="list"
      aria-label="Ronin submission queue"
      data-testid="ronin-queue-list"
    >
      {rows.map((s) => {
        // ADR-0097 §7 — server-supplied `s.aivss` wins when present.
        //
        // History: PR #840 (squash merge `ef000d6371`) added the
        // server-side `lib/aivss/computeForSubmission` helper and
        // wired `/api/ronin/submissions` GET/POST/PATCH to attach
        // `aivss: AivssScore | null` per row. Demo handlers in
        // `lib/demo/mock-api-handlers.ts` also attach aivss so the
        // wire shape is uniform across demo + prod paths.
        //
        // Pre-#840, the host SUPPRESSED client-side derivation
        // entirely — bug-bounty submissions don't carry an explicit
        // attack-class on the wire, so a chip derived from the
        // `SubmissionStatus` lifecycle stage alone would mislead
        // operators on the triage queue (where it appears alongside
        // CVSS score + payout amount). The server-side helper now
        // produces a real `AivssScore` from severity + status via
        // the existing `findingToAivssMetrics` mapper. The band='none'
        // fallback below only fires for rows where the server
        // returned `null` (severity outside the closed enum); under
        // normal operation `sanitizeSubmission` already drops those.
        const aivss: AivssScore | null = s.aivss ?? null;
        const aivssPill = aivss !== null ? (
          <AivssPill selfAttested
            band={aivss.severity}
            score={aivss.base}
            testId={`ronin-aivss-pill-${s.id}`}
          />
        ) : (
          <AivssPill selfAttested band="none" testId={`ronin-aivss-pill-${s.id}`} />
        );
        const item: AttackRowItem = {
          id: s.id,
          eyebrow: cap(`${s.programName} · CVSS ${s.cvssScore.toFixed(1)}`, 96),
          title: s.title,
          sub: SUBMISSION_STATUS_SUB[s.status],
          sev: SUBMISSION_SEVERITY_TO_SEV_LEVEL[s.severity],
          status: SUBMISSION_STATUS_TO_ATTACK_STATUS[s.status],
          right: aivssPill,
        };
        return <AttackRow key={s.id} item={item} />;
      })}
    </div>
  );
}
