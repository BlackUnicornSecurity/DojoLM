// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `ronin` is a typed EmptyState product module here, never a retired NavId. */
/**
 * SubmissionsEmptySection — P2c D1+D6+D8 (v2-skin-surface-audit
 * research-intake). The flag-off Submissions tab restored to the design
 * render (wave-g2/Research Intake v2.html): a `.g2-wide` two-column
 * layout with the empty state inside the titled "Submission queue"
 * panel on the left and the "How intake works" explainer + Bounty
 * cross-link on the right. Copy is VERBATIM from the reference.
 *
 * Lives in `_components/` per the PR #3 split convention so the
 * orchestrator stays near the 800-LOC cap.
 */

import { Panel } from "@/design/shell/Panel";
import { RefBlock } from "@/design/shell/RefBlock";
import { Steps, type StepsItem } from "@/design/shell/Steps";
import { EmptyState } from "@/design/system/EmptyState";
import { SubmissionQueue } from "./SubmissionQueue";
import type { SubmissionLite } from "./types";

const INTAKE_STEPS: readonly StepsItem[] = [
  {
    title: "Register a program",
    sub: "Scope which target a hunter may submit against.",
  },
  {
    title: "Submissions arrive",
    sub: "Each is severity-coded and AIVSS-ranked on intake.",
  },
  {
    title: "Verify and reward",
    sub: "Confirmed bypasses publish to the public Bounty board.",
  },
];

export function SubmissionsEmptySection({
  rows,
}: {
  readonly rows: readonly SubmissionLite[];
}) {
  // P2d NEW-1 — the panel count is the count of what the body actually
  // shows: when submissions exist the queue renders (count agrees); when
  // empty, the design's first-run onboarding state renders with "0
  // submissions". No fixture total leaks over an empty body.
  const shown = rows.length;
  return (
    <div className="g2-wide">
      <Panel title="Submission queue" sub={`${shown} submissions`}>
        {shown > 0 ? (
          <SubmissionQueue rows={rows} />
        ) : (
          <EmptyState
            module="ronin"
            state="empty"
            title="Open your first bounty program"
            sub="The queue, hunter standings, and program registry fill in once a program is registered and the first submission arrives. Start with the submission wizard."
            cta={{ label: "Open the submission wizard", href: "#wizard" }}
            testId="ronin-no-data-empty"
          />
        )}
      </Panel>
      <Panel title="How intake works">
        <Steps items={INTAKE_STEPS} numbered={false} />
        <div style={{ marginTop: 14 }}>
          <RefBlock
            kj="褒"
            title="Bounty · members"
            sub="The public side — verified bypasses and payout tiers show here"
            href="/members/bounty"
            linkLabel="Open Bounty →"
          />
        </div>
      </Panel>
    </div>
  );
}
