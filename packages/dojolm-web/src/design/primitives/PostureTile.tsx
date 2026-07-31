// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export type PostureLabel = 'Hardened' | 'Balanced' | 'Exposed';

export interface PostureTileProps {
  /** Posture score 0–100; clamped at the prop boundary. */
  score: number;
  /** Posture classification driving the tile tone. */
  label: PostureLabel;
  /** Pre-formatted "last scan" timestamp (e.g. "12m ago", "2026-04-26 14:32"). */
  lastScan: string;
  /** Optional sub-label / target (e.g. "billing-agent · prod"). */
  target?: string;
}

const LAST_SCAN_MAX = 80;
const TARGET_MAX = 200;

const LABEL_TONE: Record<PostureLabel, string> = {
  Hardened: 'jade',
  Balanced: 'gold',
  Exposed: 'red',
};

/**
 * Scanner posture indicator tile. Big-number score (0–100), posture
 * label (Hardened/Balanced/Exposed) driving tone, and a last-scan
 * timestamp eyebrow. The label-derived tone is centralised in
 * `LABEL_TONE` so callers can't drift the semantics by overriding it.
 */
export function PostureTile({
  score,
  label,
  lastScan,
  target,
}: PostureTileProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const safeLastScan = cap(lastScan, LAST_SCAN_MAX);
  const safeTarget = capOpt(target, TARGET_MAX);
  const tone = LABEL_TONE[label];
  const summary = [
    `Posture ${label}`,
    `score ${safeScore} of 100`,
    safeTarget,
    `last scan ${safeLastScan}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      className={`posture-tile tone-${tone}`}
      role="figure"
      aria-label={summary}
    >
      <span className="posture-tile-eyebrow">Last scan · {safeLastScan}</span>
      <div className="posture-tile-score-row">
        <span className="posture-tile-score">{safeScore}</span>
        <span className="posture-tile-of" aria-hidden="true">
          / 100
        </span>
      </div>
      <div className="posture-tile-foot">
        <span className={`posture-tile-label tone-${tone}`}>{label}</span>
        {safeTarget && (
          <span className="posture-tile-target">{safeTarget}</span>
        )}
      </div>
    </div>
  );
}
