// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';
import { GraphPlaceholder } from '../system/GraphPlaceholder';

export type DnaGraphNodeStatus = 'live' | 'deprecated' | 'frozen' | 'pending';

export interface DnaGraphNode {
  /** Stable id (used as React key + edge endpoint). */
  readonly id: string;
  /** Caller-supplied x coordinate (0..100 viewport units). Clamped. */
  readonly x: number;
  /** Caller-supplied y coordinate (0..100 viewport units). Clamped. */
  readonly y: number;
  /** Optional display label (rendered inside the node circle). */
  readonly label?: string;
  /** Optional status — drives the node circle tone. */
  readonly status?: DnaGraphNodeStatus;
}

export interface DnaGraphEdge {
  /** Source node id. */
  readonly from: string;
  /** Target node id. */
  readonly to: string;
}

export interface DnaGraphProps {
  /** Graph nodes. Empty array → falls back to GraphPlaceholder. */
  readonly nodes: readonly DnaGraphNode[];
  /** Graph edges. Capped at DNA_GRAPH_MAX_EDGES. */
  readonly edges: readonly DnaGraphEdge[];
  /** Optional accessible label (e.g. "Llama-2 attack DNA · 2026 Q1"). */
  readonly ariaLabel?: string;
  /** Optional viewBox dimension (square). Defaults to 100. */
  readonly viewBoxSize?: number;
  readonly className?: string;
  readonly testId?: string;
}

/** Defensive cap on node array. */
export const DNA_GRAPH_MAX_NODES = 256;
/** Defensive cap on edge array. */
export const DNA_GRAPH_MAX_EDGES = 512;

const ID_MAX = 64;
// TICKET-DNA-GRAPH-LABELS-V2 (2026-05-22): reduced from 24 → 12. Even
// after the maxWidth: 560px CSS cap shipped in PR #858, 17-char labels
// like "compliance-bypass" / "prompt-injection" still overlap their
// neighbours because the SVG `<text>` is rendered in user-units that
// scale with the viewport (5.6× at 560px on the default 100×100
// viewBox). The display label is now capped to 12 chars with an
// ellipsis; the FULL uncapped label remains accessible via the inline
// `<title>` element rendered below the visible text — hover for sighted
// users, announced by screen readers.
const LABEL_MAX = 12;
const TITLE_LABEL_MAX = 64;
const ARIA_LABEL_MAX = 120;

const STATUS_LABEL: Record<DnaGraphNodeStatus, string> = {
  live: 'live',
  deprecated: 'deprecated',
  frozen: 'frozen',
  pending: 'pending',
};

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Amaterasu lightweight node-edge lineage graph. Nodes positioned by
 * caller-supplied (x, y) in 0..100 viewport units; edges drawn as SVG
 * lines between parent→child id pairs. Empty `nodes` falls back to
 * `<GraphPlaceholder>` (Amaterasu Sumi-e empty-state). Renders as
 * `role="img"` with an aria-label summary indexing the closed status
 * union via a static `STATUS_LABEL` map.
 *
 * Defensive caps: `DNA_GRAPH_MAX_NODES=256`, `DNA_GRAPH_MAX_EDGES=512`,
 * coordinate clamps to 0..100, label cap 24, id cap 64. Defends against
 * unbounded API-supplied lineage payloads.
 */
export function DnaGraph({
  nodes,
  edges,
  ariaLabel,
  viewBoxSize = 100,
  className,
  testId,
}: DnaGraphProps) {
  if (nodes.length === 0) {
    return <GraphPlaceholder state="empty" testId={testId ?? 'dna-graph-empty'} />;
  }
  const safeView = clamp(viewBoxSize, 50, 1000);
  const safeNodes = nodes.slice(0, DNA_GRAPH_MAX_NODES).map((n) => ({
    id: cap(n.id, ID_MAX),
    x: clamp(n.x, 0, 100),
    y: clamp(n.y, 0, 100),
    // TICKET-DNA-GRAPH-LABELS-V2 — visible label is capped at LABEL_MAX
    // (12) for layout; the full uncapped label is preserved as
    // `fullLabel` so the `<title>` tooltip below shows the operator the
    // complete name on hover / for AT users.
    label: n.label !== undefined ? cap(n.label, LABEL_MAX) : undefined,
    fullLabel: n.label !== undefined ? cap(n.label, TITLE_LABEL_MAX) : undefined,
    status: n.status,
  }));
  const nodeIndex = new Map(safeNodes.map((n) => [n.id, n] as const));
  const safeEdges = edges
    .slice(0, DNA_GRAPH_MAX_EDGES)
    .map((e) => ({ from: cap(e.from, ID_MAX), to: cap(e.to, ID_MAX) }))
    .filter((e) => nodeIndex.has(e.from) && nodeIndex.has(e.to));
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const counts = safeNodes.reduce<Record<string, number>>((acc, n) => {
    if (n.status) {
      const word = STATUS_LABEL[n.status];
      acc[word] = (acc[word] ?? 0) + 1;
    }
    return acc;
  }, {});
  const statusSummary = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  const summary =
    safeAriaLabel ??
    `Lineage graph: ${safeNodes.length} nodes, ${safeEdges.length} edges${
      statusSummary ? ` (${statusSummary})` : ''
    }`;
  const rootClass = `dna-graph${className ? ` ${className}` : ''}`;
  const scaleX = (x: number) => (x / 100) * safeView;
  const scaleY = (y: number) => (y / 100) * safeView;
  return (
    <svg
      className={rootClass}
      role="img"
      aria-label={summary}
      viewBox={`0 0 ${safeView} ${safeView}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid={testId ?? 'dna-graph'}
    >
      <g className="dna-graph-edges" aria-hidden="true">
        {safeEdges.map((e, i) => {
          const a = nodeIndex.get(e.from);
          const b = nodeIndex.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}->${e.to}-${i}`}
              x1={scaleX(a.x)}
              y1={scaleY(a.y)}
              x2={scaleX(b.x)}
              y2={scaleY(b.y)}
              className="dna-graph-edge"
            />
          );
        })}
      </g>
      <g className="dna-graph-nodes">
        {safeNodes.map((n) => (
          <g
            key={n.id}
            className={`dna-graph-node${n.status ? ` status-${n.status}` : ''}`}
            data-node-id={n.id}
          >
            <circle
              cx={scaleX(n.x)}
              cy={scaleY(n.y)}
              r={3.2}
              className="dna-graph-node-circle"
            />
            {n.label && (
              <text
                x={scaleX(n.x)}
                y={scaleY(n.y) - 5}
                className="dna-graph-node-label"
                textAnchor="middle"
              >
                {/* TICKET-DNA-GRAPH-LABELS-V2 — inline <title> reveals the
                    full uncapped label on hover (and is announced by
                    screen readers). Visible text below is capped to
                    LABEL_MAX (12 chars) for layout. */}
                <title>{n.fullLabel ?? n.label}</title>
                {n.label}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
