// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export type DnaTreeStatus = 'live' | 'deprecated' | 'frozen' | 'pending';

export interface DnaTreeNode {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Node display label (e.g. model id, lineage step name). Capped at LABEL_MAX. */
  readonly label: string;
  /** Optional status — drives the per-node pill class + ARIA fragment. */
  readonly status?: DnaTreeStatus;
  /** Optional children. Recursion is capped at DNA_TREE_MAX_DEPTH. */
  readonly children?: readonly DnaTreeNode[];
}

export interface DnaTreeProps {
  /** Root node(s). Top-level array is capped at DNA_TREE_MAX_ROOTS. */
  readonly nodes: readonly DnaTreeNode[];
  /** Optional accessible label for the tree root (e.g. "GPT-4o lineage"). */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** Defensive cap on the top-level node count. */
export const DNA_TREE_MAX_ROOTS = 64;
/** Defensive cap on children-per-parent. */
export const DNA_TREE_MAX_CHILDREN = 64;
/** Defensive cap on recursion depth. Beyond this depth, descendants are dropped. */
export const DNA_TREE_MAX_DEPTH = 16;

const LABEL_MAX = 120;
const ARIA_LABEL_MAX = 120;

/**
 * Static aria-fragment lookup for each node status. Indexed via the
 * closed union — never spliced raw — so a runtime widening cast on
 * `status` cannot carry attacker-controlled text into the AT layer.
 */
const STATUS_LABEL: Record<DnaTreeStatus, string> = {
  live: 'live',
  deprecated: 'deprecated',
  frozen: 'frozen',
  pending: 'pending',
};

const STATUS_PILL: Record<DnaTreeStatus, string> = {
  live: 'LIVE',
  deprecated: 'DEPR',
  frozen: 'FROZEN',
  pending: 'PEND',
};

interface RenderArgs {
  readonly node: DnaTreeNode;
  readonly depth: number;
}

function TreeNode({ node, depth }: RenderArgs) {
  const safeLabel = cap(node.label, LABEL_MAX);
  const status = node.status;
  const summary = status
    ? `${safeLabel} — ${STATUS_LABEL[status]}`
    : safeLabel;
  const children =
    node.children && depth < DNA_TREE_MAX_DEPTH
      ? node.children.slice(0, DNA_TREE_MAX_CHILDREN)
      : [];
  const hasChildren = children.length > 0;
  return (
    <li
      className={`dna-tree-node${status ? ` status-${status}` : ''}`}
      role="treeitem"
      aria-label={summary}
      data-node-id={node.id}
      data-depth={depth}
    >
      <span className="dna-tree-node-row">
        <span className="dna-tree-node-bullet" aria-hidden="true" />
        <span className="dna-tree-node-label">{safeLabel}</span>
        {status && (
          <span className={`dna-tree-node-status ${status}`}>
            {STATUS_PILL[status]}
          </span>
        )}
      </span>
      {hasChildren && (
        <ul className="dna-tree-children" role="group">
          {children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Atemi / Amaterasu lineage tree. Hierarchical, indented model-genealogy
 * view rendered as `role="tree"` with `role="treeitem"` nodes and
 * `role="group"` children — matches ARIA 1.2 tree pattern. Branch lines
 * are drawn via CSS borders on `.dna-tree-children`. Each node optionally
 * carries a status pill (live / deprecated / frozen / pending), driven
 * through a static `STATUS_LABEL` map for the ARIA summary.
 *
 * Display-only: this primitive does not implement collapse/expand
 * interaction, so `aria-expanded` is intentionally omitted from
 * treeitems (per ARIA 1.2 the attribute SHOULD be set when the node is
 * actually toggleable; setting `true` on a static tree misleads AT
 * users who would expect interactivity). Wrap with a stateful
 * controller if expand/collapse is required by a consumer.
 *
 * Defensive caps: `DNA_TREE_MAX_ROOTS=64`, `DNA_TREE_MAX_CHILDREN=64`,
 * `DNA_TREE_MAX_DEPTH=16`. Anything beyond is sliced — protects against
 * unbounded API-supplied lineage payloads.
 */
export function DnaTree({
  nodes,
  ariaLabel,
  className,
  testId,
}: DnaTreeProps) {
  const safeRoots = nodes.slice(0, DNA_TREE_MAX_ROOTS);
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const rootClass = `dna-tree${className ? ` ${className}` : ''}`;
  return (
    <ul
      className={rootClass}
      role="tree"
      aria-label={safeAriaLabel ?? 'Lineage tree'}
      data-testid={testId ?? 'dna-tree'}
    >
      {safeRoots.map((n) => (
        <TreeNode key={n.id} node={n} depth={0} />
      ))}
    </ul>
  );
}
