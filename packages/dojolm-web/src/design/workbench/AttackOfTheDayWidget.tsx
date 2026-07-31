// SPDX-License-Identifier: Apache-2.0
/**
 * AttackOfTheDayWidget — TICKET-D-209 Workbench widget primitive.
 *
 * Restores V1 dashboard's "Attack of the Day" widget on the V2.1
 * `/console` Workbench surface. Pure presentational primitive — receives
 * a single `attack` payload and an optional `onTry` callback. No fetches,
 * no contexts, no state. The live consumer (`<AttackOfTheDayWidgetLive>`)
 * picks the daily index deterministically from `PAYLOAD_CATALOG` and
 * passes it down to this primitive.
 *
 * Per ADR-0096 §3 amendment 2026-05-07 (D-206 closeout) the widget
 * mounts on `/console` via `WorkbenchWidgetId = 'attack-of-the-day'`.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `WIDGET_KICKER` — closed kicker label (no inline literal at the
 *     render site).
 *   - `WIDGET_ARIA_LABEL` — closed map keyed by widget id segment so
 *     aria text routes through a freeze guard.
 *   - `EMPTY_HINT` — closed fallback copy used when the attack payload
 *     is missing required fields.
 *   - `TRY_BUTTON_LABEL` — closed map; the Try CTA never emits raw
 *     interpolated text.
 *
 * Defensive caps:
 *   - `PAYLOAD_PREVIEW_MAX = 220` chars — every render of `payload` is
 *     truncated + ellipsized to keep the preview block bounded.
 *
 * Color + tint: `var(--*)` tokens only. Zero inline hex.
 *
 * Empty / partial-data behaviour:
 *   - If `attack.payload` is empty / missing, the preview block falls
 *     back to `EMPTY_HINT` and the Try CTA is disabled (renders nothing
 *     when `onTry` is not provided either).
 *   - If `attack.category` is empty, the chip is omitted but the rest
 *     of the widget renders normally.
 *
 * Zero new deps. ≤200 lines.
 */

'use client';

import {
  useCallback,
  useMemo,
  type ReactElement,
} from 'react';
import {
  ROOT_STYLE,
  HEAD_ROW_STYLE,
  KICKER_STYLE,
  SUB_STYLE,
  HEAD_END_STYLE,
  PAYLOAD_BLOCK_STYLE,
  TRY_BUTTON_STYLE,
  BUTTON_ROW_STYLE,
  VIEW_FAMILY_LINK_STYLE,
  EMPTY_HINT_STYLE,
} from './AttackOfTheDayWidget.styles';

/**
 * Render-time cap on the rendered payload preview. The full payload is
 * still passed to `onTry`; only the visual block is truncated.
 */
export const PAYLOAD_PREVIEW_MAX = 220;

/** Frozen widget kicker — single source of truth. */
const WIDGET_KICKER: Readonly<Record<'attack-of-the-day', string>> =
  Object.freeze({
    // Sentence case — panel title (audit D5; Workbench v2.html:143).
    'attack-of-the-day': 'Attack of the day',
  });

/** Frozen aria-label map. Routes through a closed key, not raw string. */
const WIDGET_ARIA_LABEL: Readonly<Record<'attack-of-the-day', string>> =
  Object.freeze({
    'attack-of-the-day': 'Attack of the Day widget',
  });

/** Frozen empty / fallback copy. */
const EMPTY_HINT: Readonly<Record<'no-payload' | 'no-attack', string>> =
  Object.freeze({
    'no-payload': 'No payload preview available.',
    'no-attack': 'No attack of the day available.',
  });

/** Frozen Try CTA labels. */
const TRY_BUTTON_LABEL: Readonly<Record<'idle' | 'unavailable', string>> =
  Object.freeze({
    idle: 'Try this attack',
    unavailable: 'Try unavailable',
  });

/** Header sub (Workbench v2.html:143). */
const WIDGET_SUB = 'From the fixture library';

/** Secondary CTA — links to the fixture family (Workbench v2.html:148). */
const VIEW_FAMILY_LABEL = 'View fixture family';

/**
 * Truncate-with-ellipsis helper. Returns the original string when
 * shorter than the cap. Pure — no DOM, no globals.
 */
function clampPreview(raw: string, max: number): string {
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

/**
 * Frozen attack-payload shape — caller passes a single attack object.
 * The id field is required so the `onTry` callback can wire downstream
 * scanner / navigation handlers without re-resolving the entry.
 */
export interface AttackOfTheDayAttack {
  readonly id: string;
  readonly category: string;
  readonly payload: string;
}

export interface AttackOfTheDayWidgetProps {
  readonly attack: AttackOfTheDayAttack | null;
  readonly onTry?: (attackId: string) => void;
  /**
   * Secondary "View fixture family" CTA handler (Workbench v2.html:148).
   * The link only renders when supplied — the live consumer wires it to
   * the Payloads (fixture library) surface.
   */
  readonly onViewFamily?: () => void;
  /** Override for `data-testid` to allow multi-mount in test fixtures. */
  readonly testId?: string;
}

/**
 * AttackOfTheDayWidget — pure presentational widget body. Caller owns
 * the attack-selection logic (see `<AttackOfTheDayWidgetLive>`).
 */
export function AttackOfTheDayWidget(
  props: AttackOfTheDayWidgetProps,
): ReactElement {
  const { attack, onTry, onViewFamily, testId } = props;
  const resolvedTestId = testId ?? 'workbench-widget-attack-of-the-day';

  const previewText = useMemo(() => {
    if (!attack || !attack.payload) return null;
    return clampPreview(attack.payload, PAYLOAD_PREVIEW_MAX);
  }, [attack]);

  const handleTry = useCallback(() => {
    if (!attack || !onTry) return;
    onTry(attack.id);
  }, [attack, onTry]);

  if (!attack) {
    return (
      <div
        role="region"
        aria-label={WIDGET_ARIA_LABEL['attack-of-the-day']}
        data-testid={resolvedTestId}
        style={ROOT_STYLE}
      >
        <div style={HEAD_ROW_STYLE}>
          <h3 style={KICKER_STYLE}>{WIDGET_KICKER['attack-of-the-day']}</h3>
          <span style={SUB_STYLE}>{WIDGET_SUB}</span>
        </div>
        <p style={EMPTY_HINT_STYLE} data-testid={`${resolvedTestId}-empty`}>
          {EMPTY_HINT['no-attack']}
        </p>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={WIDGET_ARIA_LABEL['attack-of-the-day']}
      data-testid={resolvedTestId}
      style={ROOT_STYLE}
    >
      {/* Header — title + inline sub + category chip top-right
          (Workbench v2.html:143 `.p-hd`). */}
      <div style={HEAD_ROW_STYLE}>
        <h3 style={KICKER_STYLE}>{WIDGET_KICKER['attack-of-the-day']}</h3>
        <span style={SUB_STYLE}>{WIDGET_SUB}</span>
        {attack.category ? (
          <span
            className="chip"
            style={HEAD_END_STYLE}
            data-testid={`${resolvedTestId}-category`}
          >
            {attack.category}
          </span>
        ) : null}
      </div>
      {previewText ? (
        <pre
          style={PAYLOAD_BLOCK_STYLE}
          data-testid={`${resolvedTestId}-payload`}
        >
          {previewText}
        </pre>
      ) : (
        <p style={EMPTY_HINT_STYLE} data-testid={`${resolvedTestId}-empty`}>
          {EMPTY_HINT['no-payload']}
        </p>
      )}
      {onTry || onViewFamily ? (
        <div style={BUTTON_ROW_STYLE}>
          {onTry ? (
            <button
              type="button"
              onClick={handleTry}
              disabled={!previewText}
              style={TRY_BUTTON_STYLE}
              data-testid={`${resolvedTestId}-try`}
            >
              {previewText
                ? TRY_BUTTON_LABEL.idle
                : TRY_BUTTON_LABEL.unavailable}
            </button>
          ) : null}
          {onViewFamily ? (
            <button
              type="button"
              onClick={onViewFamily}
              style={VIEW_FAMILY_LINK_STYLE}
              data-testid={`${resolvedTestId}-view-family`}
            >
              {VIEW_FAMILY_LABEL}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
