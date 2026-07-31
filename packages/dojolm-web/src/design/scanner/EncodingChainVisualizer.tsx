// SPDX-License-Identifier: Apache-2.0
/**
 * EncodingChainVisualizer — YR.18 / G-021.
 *
 * Flow-diagram of detected encoding/decoding chain. Each step is a
 * labeled box; an arrow connects step n → n+1. Pure SVG, no charting
 * library dependency (per YR.18 stop condition).
 *
 * Data shape: `chain: readonly EncodingChainStep[]`. The caller passes
 * in the chain extracted from `scanResponse.encodingChain`. If the
 * chain is empty or undefined, the caller renders the EmptyState
 * upstream — this primitive only renders non-empty chains.
 *
 * Discriminant-redaction: the `kind` field is a closed string-literal
 * union; the box label is the closed-map `KIND_LABEL[kind]`. Free-text
 * `detail` is rendered with a 64-char cap.
 */

'use client';

import { type ReactElement } from 'react';

export type EncodingChainKind =
  | 'plaintext'
  | 'base64'
  | 'hex'
  | 'url'
  | 'unicode'
  | 'rot13'
  | 'html'
  | 'unknown';

export interface EncodingChainStep {
  readonly kind: EncodingChainKind;
  readonly detail?: string;
}

export interface EncodingChainVisualizerProps {
  readonly chain: readonly EncodingChainStep[];
  readonly testId?: string;
}

const KIND_LABEL: Record<EncodingChainKind, string> = {
  plaintext: 'Plaintext',
  base64: 'Base64',
  hex: 'Hex',
  url: 'URL',
  unicode: 'Unicode',
  rot13: 'ROT13',
  html: 'HTML',
  unknown: 'Unknown',
};

const KIND_TONE: Record<EncodingChainKind, string> = {
  plaintext: 'var(--accent-jade, #4ade80)',
  base64: 'var(--accent-gold, #fbbf24)',
  hex: 'var(--accent-gold, #fbbf24)',
  url: 'var(--accent-gold, #fbbf24)',
  unicode: 'var(--torii-hi)',
  rot13: 'var(--accent-gold, #fbbf24)',
  html: 'var(--torii-hi)',
  unknown: 'var(--fg-mute, #888)',
};

const STEP_W = 100;
const STEP_H = 56;
const STEP_GAP = 28;
const VBOX_H = 96;
const ARROW_W = STEP_GAP - 4;
const DETAIL_CAP = 64;

function capDetail(s: string | undefined): string | null {
  if (!s) return null;
  if (s.length <= DETAIL_CAP) return s;
  return `${s.slice(0, DETAIL_CAP - 1)}…`;
}

export function EncodingChainVisualizer({
  chain,
  testId = 'encoding-chain-visualizer',
}: EncodingChainVisualizerProps): ReactElement | null {
  if (chain.length === 0) return null;

  const totalW = chain.length * STEP_W + Math.max(0, chain.length - 1) * STEP_GAP;
  const stepY = (VBOX_H - STEP_H) / 2;
  // Marker id is derived from testId so multiple instances on the same
  // page (e.g. side-by-side scans) don't collide on the SVG <defs> id.
  const markerId = `${testId}-arrowhead`;

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={`Encoding chain: ${chain.map((s) => KIND_LABEL[s.kind]).join(' → ')}`}
      style={{ width: '100%', overflowX: 'auto' }}
    >
      <svg
        width={totalW}
        height={VBOX_H}
        viewBox={`0 0 ${totalW} ${VBOX_H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg-mute, #888)" />
          </marker>
        </defs>
        {chain.map((step, idx) => {
          const x = idx * (STEP_W + STEP_GAP);
          const tone = KIND_TONE[step.kind];
          const detail = capDetail(step.detail);
          return (
            <g key={`step-${idx}`} data-testid={`${testId}-step-${idx}`}>
              <rect
                x={x}
                y={stepY}
                width={STEP_W}
                height={STEP_H}
                rx={6}
                ry={6}
                fill="transparent"
                stroke={tone}
                strokeWidth={1.5}
              />
              <text
                x={x + STEP_W / 2}
                y={stepY + 22}
                textAnchor="middle"
                fontSize={12}
                fill={tone}
                fontWeight={600}
              >
                {KIND_LABEL[step.kind]}
              </text>
              {detail !== null && (
                <text
                  x={x + STEP_W / 2}
                  y={stepY + 40}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--fg-mute, #888)"
                >
                  {detail}
                </text>
              )}
              {idx < chain.length - 1 && (
                <line
                  x1={x + STEP_W}
                  y1={VBOX_H / 2}
                  x2={x + STEP_W + ARROW_W}
                  y2={VBOX_H / 2}
                  stroke="var(--fg-mute, #888)"
                  strokeWidth={1.5}
                  markerEnd={`url(#${markerId})`}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
