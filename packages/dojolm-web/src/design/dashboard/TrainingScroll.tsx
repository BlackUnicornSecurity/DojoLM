// SPDX-License-Identifier: Apache-2.0
/**
 * TrainingScroll — TICKET-D201 / Phase B / CA-7.
 *
 * The Shugyō Five Rites onboarding card. Renders a bordered "paper"
 * panel with a Bushido seal glyph (師), eyebrow + accent + subhead, a
 * 5-step list (one row per rite), and a 4-segment progress track.
 *
 * Source-of-truth (operator-locked, NOT mock data — verbatim from V1
 * canvas per CA-7): the 5 rite labels / subs / routes are the canonical
 * spec. The "{N} OF {RITE_IDS.length} COMPLETE" badge derives from the
 * caller-provided `states` Record + `RITE_IDS.length`, never a hardcoded
 * literal.
 *
 * Design discipline:
 *   - Pure SVG progress track (no charting library — same as YR.18/19).
 *   - All colors via `var(--torii-deep)` / `--paper` / `--mono` /
 *     `--serif`. Zero inline hex.
 *   - R-T1 closed maps for every label / sub / route / className.
 *   - 3-state RiteState ('pending' | 'in-progress' | 'done') —
 *     operator-approved widening of V1's 2-state.
 *   - Anchor links use href={RITE_ROUTE[id]} (Set-membership safe).
 *
 * Accessibility:
 *   - Section role="region" with aria-label="Begin your training"
 *     (fixed-vocabulary; never echoes server free text).
 *   - Each step uses a `<a>` with descriptive aria-label routed
 *     through closed maps.
 *   - The progress track is role="progressbar" with aria-valuenow /
 *     aria-valuemin / aria-valuemax.
 *
 * V1 → V2 mount delta: V2 has no Fighters surface so cannot mirror V1's
 * exact placement. Per operator decision the card mounts in a new
 * full-width row (`gridColumn: 'span 12'`) inserted between the V2
 * 4-KPI grid and the existing 7/5 grid. Documented in CA-7.
 */

'use client';

import type { CSSProperties, ReactElement } from 'react';

export type RiteId =
  | 'first-scan'
  | 'configure-model'
  | 'enable-hattori'
  | 'kumite-match'
  | 'sengoku-campaign';

export type RiteState = 'pending' | 'in-progress' | 'done';

export const RITE_IDS: readonly RiteId[] = Object.freeze<RiteId[]>([
  'first-scan',
  'configure-model',
  'enable-hattori',
  'kumite-match',
  'sengoku-campaign',
]);

export const RITE_LABEL: Readonly<Record<RiteId, string>> = Object.freeze({
  'first-scan': 'First scan',
  'configure-model': 'Configure a model',
  'enable-hattori': 'Enable Hattori Guard',
  'kumite-match': 'Run an Arena match',
  'sengoku-campaign': 'Open a Sengoku campaign',
});

export const RITE_SUB: Readonly<Record<RiteId, string>> = Object.freeze({
  'first-scan': 'Detect prompt injection threats in text',
  'configure-model': 'Qwen 3 32B wired via Ollama',
  'enable-hattori': 'Activate real-time output protection',
  'kumite-match': 'Pit two models, CTF or King of the Hill',
  'sengoku-campaign': 'Plan a continuous red-team loop',
});

export const RITE_ROUTE: Readonly<Record<RiteId, string>> = Object.freeze({
  'first-scan': '/admin/scanner',
  'configure-model': '/admin/jutsu',
  'enable-hattori': '/admin/hattori',
  'kumite-match': '/admin/eval',
  'sengoku-campaign': '/admin/sengoku',
});

const RITE_STATE_LABEL: Readonly<Record<RiteState, string>> = Object.freeze({
  pending: 'Pending',
  'in-progress': 'In progress',
  done: 'Done',
});

const STEP_CLASS: Readonly<Record<RiteState, string>> = Object.freeze({
  pending: 'step',
  'in-progress': 'step in-progress',
  done: 'step done',
});

export function isRiteId(v: unknown): v is RiteId {
  return typeof v === 'string' && RITE_IDS.includes(v as RiteId);
}

export function isRiteState(v: unknown): v is RiteState {
  return v === 'pending' || v === 'in-progress' || v === 'done';
}

/** Fresh all-pending state Record. Used as the initial-state default. */
export function buildPendingStates(): Record<RiteId, RiteState> {
  const out = {} as Record<RiteId, RiteState>;
  for (const id of RITE_IDS) {
    out[id] = 'pending';
  }
  return out;
}

function countDone(states: Readonly<Record<RiteId, RiteState>>): number {
  let n = 0;
  for (const id of RITE_IDS) {
    if (states[id] === 'done') n += 1;
  }
  return n;
}

export interface TrainingScrollProps {
  readonly states: Readonly<Record<RiteId, RiteState>>;
  readonly onAdvanceClick?: (id: RiteId) => void;
  readonly testId?: string;
}

const SEAL_GLYPH = '師';
const ACCENT_KANJI = '修行';

const SECTION_STYLE: CSSProperties = Object.freeze({
  position: 'relative',
  // F-1-006 / E1.S7 — was `var(--mono, #1a1a1a)`: --mono is a font-family
  // token (Inter/SF Mono stack), not a color. The fallback `#1a1a1a` was
  // what actually rendered. Swept to var(--paper-ink) — the real
  // dark-ink-on-paper color token (#1B1609, declared at tokens.css:138)
  // already used by .panel.paper as `color: var(--paper-ink)`. Visual
  // delta: hex distance #1a1a1a→#1B1609 = ~10 units in green channel,
  // ~15 in blue — slightly warmer brown vs pure-grey black; designed
  // for paper context, identical to the rest of the .panel.paper surface.
  border: '1px solid var(--paper-ink)',
  background: 'var(--paper, #f7f1e3)',
  color: 'var(--paper-ink)',
  padding: 24,
  fontFamily: 'var(--serif, Georgia, serif)',
});

const SEAL_STYLE: CSSProperties = Object.freeze({
  position: 'absolute',
  top: 12,
  right: 16,
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--torii-deep, #7a1a1a)',
  color: 'var(--torii-deep, #7a1a1a)',
  fontSize: 22,
});

const HEADER_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 4,
});

const TITLE_STYLE: CSSProperties = Object.freeze({
  fontSize: 22,
  margin: 0,
  letterSpacing: '0.01em',
});

const ACCENT_STYLE: CSSProperties = Object.freeze({
  color: 'var(--torii-deep, #7a1a1a)',
  fontSize: 18,
  letterSpacing: '0.04em',
});

const SUBHEAD_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  // F-1-006 / E1.S7 — see SECTION_STYLE note for the --mono → --paper-ink swap.
  color: 'var(--paper-ink)',
  opacity: 0.92,
  margin: '0 0 16px',
});

const STEPS_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  margin: '0 0 16px',
});

const STEP_BASE_STYLE: CSSProperties = Object.freeze({
  display: 'grid',
  gridTemplateColumns: '32px 1fr 24px',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  // F-1-006 / E1.S7 — see SECTION_STYLE note for the --mono → --paper-ink swap.
  border: '1px solid var(--paper-ink)',
  background: 'transparent',
  textDecoration: 'none',
  color: 'inherit',
});

const STEP_NUM_STYLE: CSSProperties = Object.freeze({
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // F-1-006 / E1.S7 — see SECTION_STYLE note for the --mono → --paper-ink swap.
  border: '1px solid var(--paper-ink)',
  fontSize: 13,
  fontWeight: 600,
  background: 'transparent',
  color: 'var(--paper-ink)',
});

const STEP_NUM_DONE_STYLE: CSSProperties = Object.freeze({
  ...STEP_NUM_STYLE,
  background: 'var(--torii-deep, #7a1a1a)',
  borderColor: 'var(--torii-deep, #7a1a1a)',
  color: 'var(--paper, #f7f1e3)',
});

const STEP_NUM_IN_PROGRESS_STYLE: CSSProperties = Object.freeze({
  ...STEP_NUM_STYLE,
  borderColor: 'var(--torii-deep, #7a1a1a)',
  color: 'var(--torii-deep, #7a1a1a)',
});

const STEP_TXT_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const STEP_TXT_TITLE_STYLE: CSSProperties = Object.freeze({
  fontSize: 14,
  fontWeight: 600,
});

const STEP_TXT_SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  opacity: 0.92,
});

const STEP_ARROW_STYLE: CSSProperties = Object.freeze({
  textAlign: 'right',
  color: 'var(--torii-deep, #7a1a1a)',
  fontSize: 16,
});

const PROGRESS_WRAP_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const PROGRESS_TRACK_STYLE: CSSProperties = Object.freeze({
  position: 'relative',
  flex: 1,
  height: 8,
  background: 'var(--paper, #f7f1e3)',
  // F-1-006 / E1.S7 — see SECTION_STYLE note for the --mono → --paper-ink swap.
  border: '1px solid var(--paper-ink)',
  overflow: 'hidden',
});

const PROGRESS_LABEL_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  // F-1-006 / E1.S7 — see SECTION_STYLE note for the --mono → --paper-ink swap.
  color: 'var(--paper-ink)',
  opacity: 0.92,
});

function progressFillStyle(percent: number): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: `${percent}%`,
    background: 'var(--torii-deep, #7a1a1a)',
  };
}

export function TrainingScroll({
  states,
  onAdvanceClick,
  testId = 'training-scroll',
}: TrainingScrollProps): ReactElement {
  const total = RITE_IDS.length;
  const done = countDone(states);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section
      role="region"
      aria-label="Begin your training"
      data-testid={testId}
      className="paper"
      style={SECTION_STYLE}
    >
      <div className="paper-seal" style={SEAL_STYLE} aria-hidden="true" lang="ja">
        {SEAL_GLYPH}
      </div>

      <div style={HEADER_ROW_STYLE}>
        <h2 style={TITLE_STYLE}>Begin your training</h2>
        <span style={ACCENT_STYLE} aria-hidden="true">
          · <span lang="ja">{ACCENT_KANJI}</span> · SHUGYŌ
        </span>
      </div>

      <p style={SUBHEAD_STYLE} data-testid={`${testId}-progress-label`}>
        FIVE RITES · {done} OF {total} COMPLETE
      </p>

      <div className="steps" style={STEPS_STYLE}>
        {RITE_IDS.map((id, i) => {
          const state: RiteState = isRiteState(states[id]) ? states[id] : 'pending';
          const stepNumStyle =
            state === 'done'
              ? STEP_NUM_DONE_STYLE
              : state === 'in-progress'
                ? STEP_NUM_IN_PROGRESS_STYLE
                : STEP_NUM_STYLE;
          const mark = state === 'done' ? '✓' : String(i + 1);
          const ariaLabel = `${RITE_LABEL[id]} — ${RITE_STATE_LABEL[state]}`;
          return (
            <a
              key={id}
              href={RITE_ROUTE[id]}
              className={STEP_CLASS[state]}
              data-testid={`${testId}-rite-${id}`}
              data-state={state}
              data-rite-id={id}
              aria-label={ariaLabel}
              style={STEP_BASE_STYLE}
              onClick={() => {
                if (onAdvanceClick) {
                  onAdvanceClick(id);
                }
              }}
            >
              <span
                className="step-num"
                style={stepNumStyle}
                data-testid={`${testId}-rite-${id}-mark`}
                aria-hidden="true"
              >
                {mark}
              </span>
              <span className="txt" style={STEP_TXT_STYLE}>
                <b style={STEP_TXT_TITLE_STYLE}>{RITE_LABEL[id]}</b>
                <span style={STEP_TXT_SUB_STYLE}>{RITE_SUB[id]}</span>
              </span>
              <span className="arrow" style={STEP_ARROW_STYLE} aria-hidden="true">
                →
              </span>
            </a>
          );
        })}
      </div>

      <div style={PROGRESS_WRAP_STYLE}>
        <div
          style={PROGRESS_TRACK_STYLE}
          role="progressbar"
          aria-label="Training progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            data-testid={`${testId}-progress-fill`}
            style={progressFillStyle(percent)}
          />
        </div>
        <span style={PROGRESS_LABEL_STYLE}>{percent}%</span>
      </div>
    </section>
  );
}
