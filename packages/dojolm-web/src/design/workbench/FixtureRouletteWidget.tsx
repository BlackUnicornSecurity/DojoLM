// SPDX-License-Identifier: Apache-2.0
/**
 * FixtureRouletteWidget — TICKET-D-210 Workbench widget primitive.
 *
 * Restores V1 "Fixture Roulette" (Story 1.5.4) on `/console`. Pure
 * presentational — no fetches, no contexts. Closed-enum mime-prefix
 * discriminator (`PreviewKind`) + closed `SEVERITY_LABEL` map + frozen
 * `WIDGET_KICKER` / `WIDGET_ARIA_LABEL` / `BUTTON_LABEL`. Defensive cap
 * `TEXT_PREVIEW_MAX = 400`. Mounts on `/console` via
 * `WorkbenchWidgetId = 'fixture-roulette'`.
 */

'use client';

import { useMemo, type ReactElement } from 'react';
import {
  ROOT_STYLE,
  HEAD_ROW_STYLE,
  KICKER_STYLE,
  SUB_STYLE,
  ROULETTE_BOX_STYLE,
  ROULETTE_GLYPH_STYLE,
  ROULETTE_HINT_STYLE,
  CATEGORY_CHIP_STYLE,
  FILE_NAME_STYLE,
  VERDICT_ROW_STYLE,
  BUTTON_ROW_STYLE,
  PRIMARY_BUTTON_STYLE,
  SECONDARY_BUTTON_STYLE,
  EMPTY_CTA_STYLE,
} from './FixtureRouletteWidget.styles';
import { FixtureRoulettePreview } from './FixtureRouletteWidget.preview';

export const TEXT_PREVIEW_MAX = 400;

export type PreviewKind = 'image' | 'audio' | 'video' | 'text';

export const EXT_TO_PREVIEW_KIND: Readonly<Record<string, PreviewKind>> =
  Object.freeze({
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
    '.bmp': 'image', '.webp': 'image',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
    '.mp4': 'video', '.webm': 'video',
  });

export type VerdictDecision = 'BLOCK' | 'ALLOW';
export type VerdictSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'NONE';

export const SEVERITY_LABEL: Readonly<Record<VerdictSeverity, string>> =
  Object.freeze({
    CRITICAL: 'Critical',
    WARNING: 'Warning',
    INFO: 'Info',
    NONE: 'Clean',
  });

const WIDGET_KICKER: Readonly<Record<'fixture-roulette', string>> =
  // Sentence case — panel title (audit D5; Workbench v2.html:154).
  Object.freeze({ 'fixture-roulette': 'Fixture roulette' });

const WIDGET_ARIA_LABEL: Readonly<Record<'fixture-roulette', string>> =
  Object.freeze({ 'fixture-roulette': 'Fixture Roulette widget' });

const BUTTON_LABEL: Readonly<
  Record<'discover' | 'rolling' | 'scan' | 'scanning' | 'again', string>
> = Object.freeze({
  discover: 'Discover an attack',
  rolling: 'Rolling…',
  scan: 'Scan It',
  scanning: 'Scanning…',
  again: 'Again',
});

/** Header sub (Workbench v2.html:154). */
const WIDGET_SUB = 'Draw a random payload';
/** Dashed roulette-box helper line (Workbench v2.html:159). */
const ROULETTE_HINT = 'Draw a fixture to study its anatomy.';

export function getFileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function getPreviewKind(filename: string): PreviewKind {
  const ext = getFileExt(filename);
  return EXT_TO_PREVIEW_KIND[ext] ?? 'text';
}

export interface FixturePick {
  readonly category: string;
  readonly file: string;
  readonly textContent: string | null;
  readonly rawUrl: string;
}

export interface FixtureVerdict {
  readonly decision: VerdictDecision;
  readonly findings: number;
  readonly severity: VerdictSeverity;
}

export interface FixtureRouletteWidgetProps {
  readonly picked: FixturePick | null;
  readonly verdict: FixtureVerdict | null;
  readonly rolling: boolean;
  readonly scanning: boolean;
  readonly onRoll: () => void;
  readonly onScan: () => void;
  readonly testId?: string;
}

function clampPreview(raw: string, max: number): string {
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export function FixtureRouletteWidget(
  props: FixtureRouletteWidgetProps,
): ReactElement {
  const { picked, verdict, rolling, scanning, onRoll, onScan, testId } = props;
  const resolvedTestId = testId ?? 'workbench-widget-fixture-roulette';

  const previewKind = useMemo<PreviewKind | null>(
    () => (picked ? getPreviewKind(picked.file) : null),
    [picked],
  );

  const textPreview = useMemo<string | null>(() => {
    if (!picked || previewKind !== 'text') return null;
    if (!picked.textContent) return null;
    return clampPreview(picked.textContent, TEXT_PREVIEW_MAX);
  }, [picked, previewKind]);

  if (!picked || !previewKind) {
    return (
      <div
        role="region"
        aria-label={WIDGET_ARIA_LABEL['fixture-roulette']}
        data-testid={resolvedTestId}
        style={ROOT_STYLE}
      >
        <div style={HEAD_ROW_STYLE}>
          <h3 style={KICKER_STYLE}>{WIDGET_KICKER['fixture-roulette']}</h3>
          <span style={SUB_STYLE}>{WIDGET_SUB}</span>
        </div>
        {/* Dashed roulette box with the 武 glyph + helper line (audit D11;
            Workbench v2.html:156-161). Glyph is decorative → lang="ja" +
            aria-hidden. */}
        <div style={ROULETTE_BOX_STYLE}>
          <span style={ROULETTE_GLYPH_STYLE} lang="ja" aria-hidden="true">
            武
          </span>
          <p style={ROULETTE_HINT_STYLE}>{ROULETTE_HINT}</p>
          <button
            type="button"
            onClick={onRoll}
            disabled={rolling}
            style={EMPTY_CTA_STYLE}
            data-testid={`${resolvedTestId}-discover`}
          >
            {rolling ? BUTTON_LABEL.rolling : BUTTON_LABEL.discover}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={WIDGET_ARIA_LABEL['fixture-roulette']}
      data-testid={resolvedTestId}
      style={ROOT_STYLE}
    >
      <p style={KICKER_STYLE}>{WIDGET_KICKER['fixture-roulette']}</p>
      <span style={CATEGORY_CHIP_STYLE} data-testid={`${resolvedTestId}-category`}>{picked.category}</span>
      <p style={FILE_NAME_STYLE} data-testid={`${resolvedTestId}-file`}>{picked.file}</p>
      <FixtureRoulettePreview
        previewKind={previewKind}
        file={picked.file}
        rawUrl={picked.rawUrl}
        textPreview={textPreview}
        testId={resolvedTestId}
      />
      {verdict ? (
        <div style={VERDICT_ROW_STYLE} data-testid={`${resolvedTestId}-verdict`}>
          <span data-testid={`${resolvedTestId}-verdict-decision`}>
            {verdict.decision}
          </span>
          <span data-testid={`${resolvedTestId}-verdict-severity`}>
            {SEVERITY_LABEL[verdict.severity]}
          </span>
          <span data-testid={`${resolvedTestId}-verdict-findings`}>
            {verdict.findings} finding{verdict.findings === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}
      <div style={BUTTON_ROW_STYLE}>
        <button
          type="button"
          onClick={onScan}
          disabled={scanning}
          style={PRIMARY_BUTTON_STYLE}
          data-testid={`${resolvedTestId}-scan`}
        >
          {scanning ? BUTTON_LABEL.scanning : BUTTON_LABEL.scan}
        </button>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          style={SECONDARY_BUTTON_STYLE}
          data-testid={`${resolvedTestId}-again`}
        >
          {rolling ? BUTTON_LABEL.rolling : BUTTON_LABEL.again}
        </button>
      </div>
    </div>
  );
}
