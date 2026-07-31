// SPDX-License-Identifier: Apache-2.0
/**
 * CompareTab — YR.18 / G-019 sub-component for `/admin/jutsu` Compare tab.
 *
 * Renders the compliance transfer-matrix heatmap with a chip strip for
 * model selection (up to 4 models) and a click-cell drill-down.
 * Extracted from JutsuClient to keep that file under the 800-line cap.
 *
 * Discriminant-redaction (R-T1):
 *   - CORRELATION_BUCKET_COPY / CORRELATION_BUCKET_COLOR are closed
 *     maps; cells render via `bucketCorrelation(corr)` lookup. Raw
 *     numeric correlation never goes into an aria-label.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { cap } from "@/design";

interface TransferScoreEntry {
  readonly sourceModelId: string;
  readonly targetModelId: string;
  readonly correlation: number;
  readonly sharedVulnerabilities: readonly string[];
}

interface TransferMatrixResponse {
  readonly scores: readonly TransferScoreEntry[];
  readonly modelNames: Record<string, string>;
  readonly warriorCount: number;
  readonly minWarriors: number;
  readonly eligible: boolean;
}

const MAX_COMPARE_MODELS = 4;

type CorrelationBucket = "low" | "med" | "high" | "very-high";
const CORRELATION_BUCKET_COPY: Record<CorrelationBucket, string> = {
  low: "low correlation",
  med: "medium correlation",
  high: "high correlation",
  "very-high": "very high correlation",
};
const CORRELATION_BUCKET_COLOR: Record<CorrelationBucket, string> = {
  low: "rgba(74, 222, 128, 0.25)",
  med: "rgba(251, 191, 36, 0.35)",
  high: "rgba(249, 115, 22, 0.45)",
  "very-high": "rgba(239, 68, 68, 0.55)",
};

function bucketCorrelation(c: number): CorrelationBucket {
  if (c >= 0.75) return "very-high";
  if (c >= 0.5) return "high";
  if (c >= 0.25) return "med";
  return "low";
}

function sanitizeMatrixResponse(raw: unknown): TransferMatrixResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const scoresRaw = Array.isArray(r.scores) ? r.scores : [];
  const scores: TransferScoreEntry[] = [];
  for (const item of scoresRaw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.sourceModelId !== "string" ||
      typeof e.targetModelId !== "string"
    )
      continue;
    const correlation =
      typeof e.correlation === "number" && Number.isFinite(e.correlation)
        ? e.correlation
        : 0;
    const sv = Array.isArray(e.sharedVulnerabilities)
      ? e.sharedVulnerabilities
          .filter((s): s is string => typeof s === "string")
          .slice(0, 24)
      : [];
    scores.push({
      sourceModelId: e.sourceModelId,
      targetModelId: e.targetModelId,
      correlation,
      sharedVulnerabilities: sv,
    });
  }
  const modelNames: Record<string, string> = {};
  if (r.modelNames && typeof r.modelNames === "object") {
    for (const [k, v] of Object.entries(
      r.modelNames as Record<string, unknown>,
    )) {
      if (typeof v === "string") modelNames[k] = v;
    }
  }
  return {
    scores,
    modelNames,
    warriorCount: typeof r.warriorCount === "number" ? r.warriorCount : 0,
    minWarriors: typeof r.minWarriors === "number" ? r.minWarriors : 0,
    eligible: r.eligible === true,
  };
}

export interface CompareTabProps {
  readonly active: boolean;
  readonly onLoadError: () => void;
}

export function CompareTab({
  active,
  onLoadError,
}: CompareTabProps): ReactElement {
  const [matrix, setMatrix] = useState<TransferMatrixResponse | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixLoaded, setMatrixLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    a: string;
    b: string;
  } | null>(null);
  const onLoadErrorRef = useRef(onLoadError);

  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);

  useEffect(() => {
    if (!active || matrixLoaded) return;
    let cancelled = false;
    setMatrixLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/compliance/transfer-matrix", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (!res.ok) {
          onLoadErrorRef.current();
          setMatrix(null);
          return;
        }
        const raw: unknown = await res.json().catch(() => null);
        const safe = sanitizeMatrixResponse(raw);
        if (cancelled) return;
        setMatrix(safe);
      } catch {
        if (!cancelled) {
          onLoadErrorRef.current();
          setMatrix(null);
        }
      } finally {
        if (!cancelled) {
          setMatrixLoading(false);
          setMatrixLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, matrixLoaded]);

  const compareScoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    if (!matrix) return map;
    for (const s of matrix.scores) {
      const key =
        s.sourceModelId < s.targetModelId
          ? `${s.sourceModelId}|${s.targetModelId}`
          : `${s.targetModelId}|${s.sourceModelId}`;
      map.set(key, s.correlation);
    }
    return map;
  }, [matrix]);

  const selectedCellEntry = useMemo(() => {
    if (!matrix || !selectedCell) return null;
    return (
      matrix.scores.find(
        (s) =>
          (s.sourceModelId === selectedCell.a &&
            s.targetModelId === selectedCell.b) ||
          (s.sourceModelId === selectedCell.b &&
            s.targetModelId === selectedCell.a),
      ) ?? null
    );
  }, [matrix, selectedCell]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE_MODELS) return prev;
      return [...prev, id];
    });
    setSelectedCell(null);
  }, []);

  return (
    <div data-testid="jutsu-compare-content">
      {matrixLoading && (
        <p className="wb-hint" data-testid="jutsu-compare-loading">
          Loading transfer matrix…
        </p>
      )}
      {!matrixLoading && matrix !== null && (
        <>
          <div style={{ marginBottom: 8 }}>
            <span className="wb-hint">
              Select up to {MAX_COMPARE_MODELS} models:
            </span>
            <div
              role="group"
              aria-label="Models to compare"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginTop: 4,
              }}
            >
              {Object.entries(matrix.modelNames)
                .slice(0, 24)
                .map(([id, name]) => {
                  const selected = selectedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="btn btn-ghost"
                      data-testid={`jutsu-compare-chip-${id}`}
                      onClick={() => toggleSelected(id)}
                      aria-pressed={selected}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        border: selected
                          ? "1px solid var(--torii-hi)"
                          : "1px solid var(--b-1, #333)",
                        borderRadius: 999,
                        background: selected
                          ? "rgba(239, 68, 68, 0.15)"
                          : "transparent",
                        cursor: "pointer",
                        color: "inherit",
                      }}
                    >
                      {cap(name, 40)}
                    </button>
                  );
                })}
            </div>
          </div>

          {!matrix.eligible && (
            <p className="wb-hint" data-testid="jutsu-compare-not-eligible">
              Need at least {matrix.minWarriors} warriors with completed
              matches; have {matrix.warriorCount}.
            </p>
          )}

          {matrix.eligible && selectedIds.length < 2 && (
            <p className="wb-hint" data-testid="jutsu-compare-pick-two">
              Pick 2–{MAX_COMPARE_MODELS} models to render the heatmap.
            </p>
          )}

          {matrix.eligible && selectedIds.length >= 2 && (
            <div data-testid="jutsu-compare-grid" style={{ overflowX: "auto" }}>
              <table
                style={{ borderCollapse: "collapse", fontSize: 11 }}
                aria-label="Compliance correlation heatmap"
              >
                <thead>
                  <tr>
                    <th />
                    {selectedIds.map((id) => (
                      <th
                        key={`col-${id}`}
                        style={{ padding: "4px 6px", textAlign: "left" }}
                      >
                        {cap(matrix.modelNames[id] ?? id, 24)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedIds.map((rowId) => (
                    <tr key={`row-${rowId}`}>
                      <th
                        scope="row"
                        style={{
                          padding: "4px 6px",
                          textAlign: "left",
                          fontWeight: "normal",
                        }}
                      >
                        {cap(matrix.modelNames[rowId] ?? rowId, 24)}
                      </th>
                      {selectedIds.map((colId) => {
                        if (rowId === colId) {
                          return (
                            <td
                              key={`cell-${rowId}-${colId}`}
                              style={{
                                padding: "4px 6px",
                                color: "var(--fg-mute, #888)",
                              }}
                            >
                              —
                            </td>
                          );
                        }
                        const key =
                          rowId < colId
                            ? `${rowId}|${colId}`
                            : `${colId}|${rowId}`;
                        const corr = compareScoreLookup.get(key);
                        if (corr === undefined) {
                          return (
                            <td
                              key={`cell-${rowId}-${colId}`}
                              style={{
                                padding: "4px 6px",
                                color: "var(--fg-mute, #888)",
                              }}
                            >
                              n/a
                            </td>
                          );
                        }
                        const bucket = bucketCorrelation(corr);
                        return (
                          <td
                            key={`cell-${rowId}-${colId}`}
                            data-testid={`jutsu-compare-cell-${rowId}-${colId}`}
                            style={{ padding: 0 }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCell({ a: rowId, b: colId })
                              }
                              aria-label={`${matrix.modelNames[rowId] ?? rowId} vs ${matrix.modelNames[colId] ?? colId} ${CORRELATION_BUCKET_COPY[bucket]}`}
                              style={{
                                background: CORRELATION_BUCKET_COLOR[bucket],
                                width: "100%",
                                padding: "6px 8px",
                                border: 0,
                                cursor: "pointer",
                                color: "inherit",
                              }}
                            >
                              {(corr * 100).toFixed(0)}%
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedCellEntry !== null && (
            <div
              data-testid="jutsu-compare-detail"
              style={{
                marginTop: 12,
                padding: 8,
                border: "1px solid var(--b-1, #333)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <strong>
                {cap(
                  matrix.modelNames[selectedCellEntry.sourceModelId] ??
                    selectedCellEntry.sourceModelId,
                  32,
                )}{" "}
                ↔{" "}
                {cap(
                  matrix.modelNames[selectedCellEntry.targetModelId] ??
                    selectedCellEntry.targetModelId,
                  32,
                )}
              </strong>
              <div className="wb-hint" style={{ marginTop: 4 }}>
                {
                  CORRELATION_BUCKET_COPY[
                    bucketCorrelation(selectedCellEntry.correlation)
                  ]
                }{" "}
                · {(selectedCellEntry.correlation * 100).toFixed(1)}%
              </div>
              {selectedCellEntry.sharedVulnerabilities.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span className="wb-hint">Shared vulnerabilities:</span>
                  <ul style={{ margin: "2px 0 0 16px", padding: 0 }}>
                    {selectedCellEntry.sharedVulnerabilities
                      .slice(0, 12)
                      .map((v) => (
                        <li key={v}>{cap(v, 64)}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
