// SPDX-License-Identifier: Apache-2.0
/**
 * Service-coverage GAP matrix — reproduces the design's `.gapmat` table
 * (wave-d "Guard v2.html" §Service coverage): Inter sentence-case headers,
 * grouped rows (Defense categories / Industry packs) with a collapse
 * toggle, the OK / Gap / — legend, and the "no templates applied yet"
 * sev-note. Replaces the shared `ServiceCoverageGrid` primitive on this
 * surface (which renders flat, ungrouped, mono-caps headers with a red
 * wash behind gap cells — none of which the design uses).
 */

import { useState } from "react";
import type { ServiceCoverageCell, ServiceCoverageRow } from "@/design";

export interface CoverageMatrixProps {
  readonly columns: readonly string[];
  readonly defenseRows: readonly ServiceCoverageRow[];
  readonly packRows: readonly ServiceCoverageRow[];
  readonly coveredCount: number;
  readonly appliedCount: number;
  readonly onGotoTemplates: () => void;
  readonly testId?: string;
}

function CoverageCell({ cell }: { readonly cell: ServiceCoverageCell }) {
  if (cell === "ok") return <span className="gm-ok">✓ OK</span>;
  if (cell === "gap") return <span className="gm-gap">Gap</span>;
  return (
    <span className="gm-none" aria-label="mode does not gate this category">
      —
    </span>
  );
}

function GroupBody({
  rows,
  label,
  meta,
  open,
  onToggle,
  colSpan,
}: {
  readonly rows: readonly ServiceCoverageRow[];
  readonly label: string;
  readonly meta: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly colSpan: number;
}) {
  return (
    <tbody>
      <tr className="grp-row">
        <td colSpan={colSpan}>
          <button
            type="button"
            className={`grp-btn${open ? "" : " closed"}`}
            aria-expanded={open}
            onClick={onToggle}
          >
            <span className="car" aria-hidden="true">
              ▾
            </span>
            {label}
            <span className="meta">{meta}</span>
          </button>
        </td>
      </tr>
      {open &&
        rows.map((r) => (
          <tr className="data" key={r.id}>
            <td className="svc">{r.service}</td>
            {r.cells.map((cell, i) => (
              <td key={`${r.id}-${i}`}>
                <CoverageCell cell={cell} />
              </td>
            ))}
          </tr>
        ))}
    </tbody>
  );
}

export function CoverageMatrix({
  columns,
  defenseRows,
  packRows,
  coveredCount,
  appliedCount,
  onGotoTemplates,
  testId,
}: CoverageMatrixProps) {
  const [openDefense, setOpenDefense] = useState(true);
  const [openPacks, setOpenPacks] = useState(false);
  const colSpan = columns.length + 1;

  return (
    <div>
      <div className="gapmat-scroll">
        <table className="gapmat" data-testid={testId}>
          <thead>
            <tr>
              <th className="svc">Category</th>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <GroupBody
            rows={defenseRows}
            label="Defense categories"
            meta={`${defenseRows.length} categories · ${
              coveredCount === 0 ? "no templates applied" : `${coveredCount} covered`
            }`}
            open={openDefense}
            onToggle={() => setOpenDefense((v) => !v)}
            colSpan={colSpan}
          />
          {packRows.length > 0 && (
            <GroupBody
              rows={packRows}
              label="Industry packs"
              meta={`${packRows.length} categories · not gated under any mode`}
              open={openPacks}
              onToggle={() => setOpenPacks((v) => !v)}
              colSpan={colSpan}
            />
          )}
        </table>
      </div>

      <div className="gm-legend">
        <span className="it">
          <span className="gm-ok">✓ OK</span> template applied, category covered
        </span>
        <span className="it">
          <span className="gm-gap">Gap</span> gated, no template applied yet
        </span>
        <span className="it">
          <span className="gm-none">—</span> mode doesn&apos;t gate this category
        </span>
      </div>

      {appliedCount === 0 && (
        <p className="sev-note">
          No templates applied yet — every gated category shows a gap until one
          is applied from{" "}
          <button
            type="button"
            className="link-steel link-steel-inline"
            onClick={onGotoTemplates}
          >
            Defense templates
          </button>
          .
        </p>
      )}
    </div>
  );
}
