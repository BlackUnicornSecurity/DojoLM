// SPDX-License-Identifier: Apache-2.0
/**
 * OblTab — Obliteratus (OBL) behavioural-analysis runner (CONT-R2-008).
 *
 * Jutsu sub-tab that makes the four previously-orphaned OBL modules
 * discoverable and functional against a real target model:
 *
 *   - alignment  → POST /api/llm/obl/alignment  → AlignmentImprint
 *   - robustness → POST /api/llm/obl/robustness → DefenseRobustness
 *   - depth      → POST /api/llm/obl/depth      → RefusalDepthProfile
 *   - geometry   → POST /api/llm/obl/geometry   → ConceptGeometry
 *
 * Each endpoint is admin-gated + CSRF-enforced and takes `{ modelId }`;
 * the probe set is server-owned. This tab picks a target via ModelPicker
 * (GET /api/llm/models, target mode — Sensei brain excluded, ≤40B cap),
 * fires one module at a time, and renders the returned score.
 *
 * Discipline:
 *   - fetchWithAuth attaches the x-csrf-token double-submit header.
 *   - Errors go through a closed OblErrorCode map — no reflected server
 *     string reaches the DOM (F-617).
 *   - Every score field is sanitised/clamped before render; enums are
 *     validated against closed sets.
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
// Narrow sub-path imports (never the @/design or @/design/llm barrels):
// those barrels re-export the shell (CommandPaletteController →
// NavigationContext → constants), which hangs darwin vitest and breaks
// sibling tests' lucide mocks (feedback_design_barrel_darwin_perf).
import { Panel } from "@/design/shell/Panel";
import { KV } from "@/design/primitives/KV";
import { BarRow } from "@/design/primitives/BarRow";
import { cap } from "@/design/primitives/_caps";
import {
  ModelPicker,
  type ModelPickerOption,
} from "@/design/llm/ModelPicker";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ---------------------------------------------------------------------------
// Module catalogue
// ---------------------------------------------------------------------------
type OblModule = "alignment" | "robustness" | "depth" | "geometry";

const OBL_MODULES: readonly {
  readonly id: OblModule;
  readonly label: string;
  readonly blurb: string;
}[] = [
  {
    id: "alignment",
    label: "Alignment imprint",
    blurb: "Infers which training method (DPO/RLHF/CAI/SFT) shaped the model.",
  },
  {
    id: "robustness",
    label: "Defense robustness",
    blurb: "How far refusal defenses degrade under pressure, and recover.",
  },
  {
    id: "depth",
    label: "Refusal depth",
    blurb: "At what prompt severity refusals activate, and how sharply.",
  },
  {
    id: "geometry",
    label: "Concept geometry",
    blurb: "Shape of the model's concept boundaries across probe angles.",
  },
];

// ---------------------------------------------------------------------------
// Error copy (closed set — R-T1)
// ---------------------------------------------------------------------------
type OblErrorCode =
  | "forbidden"
  | "not-found"
  | "invalid"
  | "conflict"
  | "rate-limited"
  | "network"
  | "server";

const OBL_ERROR_COPY: Record<OblErrorCode, string> = {
  forbidden: "Analysis refused. Confirm admin access.",
  "not-found": "That target model was not found.",
  invalid: "The selected target is not valid for analysis.",
  conflict: "An analysis for this model is already running. Wait for it.",
  "rate-limited": "Too many analyses. Wait a minute and retry.",
  network: "Network error. Check your connection.",
  server: "Analysis service error. Retry shortly.",
};

function errorCodeFromStatus(status: number): OblErrorCode {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400) return "invalid";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  return "server";
}

// ---------------------------------------------------------------------------
// Score shapes + sanitisers (mirror bu-tpi/behavioral-metrics/types)
// ---------------------------------------------------------------------------
interface AlignmentResult {
  readonly methodProbabilities: ReadonlyArray<{ method: string; p: number }>;
  readonly confidence: number;
  readonly refusalSharpness: number;
  readonly principleReferencing: number;
  readonly evidenceProbes: readonly string[];
}
interface RobustnessResult {
  readonly baselineRefusalRate: number;
  readonly pressuredRefusalRate: number;
  readonly recoveryRate: number;
  readonly ouroboros: number;
  readonly degradationCurve: readonly number[];
}
interface DepthResult {
  readonly activationDepth: string;
  readonly sharpness: number;
  readonly thresholds: ReadonlyArray<{ severity: number; refusal: number }>;
}
interface GeometryResult {
  readonly type: string;
  readonly solidAngle: number;
  readonly facets: ReadonlyArray<{ angle: string; consistency: number }>;
}

type OblResult =
  | { readonly module: "alignment"; readonly data: AlignmentResult }
  | { readonly module: "robustness"; readonly data: RobustnessResult }
  | { readonly module: "depth"; readonly data: DepthResult }
  | { readonly module: "geometry"; readonly data: GeometryResult };

const LABEL_CAP = 60;
const MAX_LIST = 24;

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
/** 0..1 metric → clamped 0..100 percentage for BarRow.pct. */
function pct01(v: unknown): number {
  const n = num(v) * 100;
  return n < 0 ? 0 : n > 100 ? 100 : Math.round(n);
}
function one(v: unknown): string {
  return num(v).toFixed(2);
}

const DEPTH_KINDS: ReadonlySet<string> = new Set(["shallow", "medium", "deep"]);
const GEOM_KINDS: ReadonlySet<string> = new Set([
  "monolithic",
  "polyhedral",
  "mixed",
]);

function rec(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function sanitizeAlignment(raw: unknown): AlignmentResult {
  const r = rec(raw);
  const mp = rec(r.methodProbabilities);
  const methodProbabilities = Object.entries(mp)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .slice(0, 8)
    .map(([method, v]) => ({ method: cap(method, 24), p: num(v) }));
  const evidenceProbes = Array.isArray(r.evidenceProbes)
    ? r.evidenceProbes
        .filter((s): s is string => typeof s === "string")
        .slice(0, MAX_LIST)
        .map((s) => cap(s, LABEL_CAP))
    : [];
  return {
    methodProbabilities,
    confidence: num(r.confidence),
    refusalSharpness: num(r.refusalSharpness),
    principleReferencing: num(r.principleReferencing),
    evidenceProbes,
  };
}
function sanitizeRobustness(raw: unknown): RobustnessResult {
  const r = rec(raw);
  const degradationCurve = Array.isArray(r.degradationCurve)
    ? r.degradationCurve
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
        .slice(0, MAX_LIST)
    : [];
  return {
    baselineRefusalRate: num(r.baselineRefusalRate),
    pressuredRefusalRate: num(r.pressuredRefusalRate),
    recoveryRate: num(r.recoveryRate),
    ouroboros: num(r.ouroboros),
    degradationCurve,
  };
}
function sanitizeDepth(raw: unknown): DepthResult {
  const r = rec(raw);
  const thresholds = Array.isArray(r.thresholds)
    ? r.thresholds
        .slice(0, MAX_LIST)
        .map((t) => rec(t))
        .map((t) => ({
          severity: num(t.promptSeverity),
          refusal: num(t.refusalProbability),
        }))
    : [];
  const kind = typeof r.activationDepth === "string" ? r.activationDepth : "";
  return {
    activationDepth: DEPTH_KINDS.has(kind) ? kind : "unknown",
    sharpness: num(r.sharpness),
    thresholds,
  };
}
function sanitizeGeometry(raw: unknown): GeometryResult {
  const r = rec(raw);
  const facets = Array.isArray(r.facets)
    ? r.facets
        .slice(0, MAX_LIST)
        .map((f) => rec(f))
        .map((f) => ({
          angle: cap(typeof f.angle === "string" ? f.angle : "", LABEL_CAP),
          consistency: num(f.consistency),
        }))
    : [];
  const kind = typeof r.type === "string" ? r.type : "";
  return {
    type: GEOM_KINDS.has(kind) ? kind : "unknown",
    solidAngle: num(r.solidAngle),
    facets,
  };
}

// ---------------------------------------------------------------------------
// Model list sanitiser (GET /api/llm/models → plain array)
// ---------------------------------------------------------------------------
function sanitizeModelOptions(raw: unknown): ModelPickerOption[] {
  if (!Array.isArray(raw)) return [];
  const out: ModelPickerOption[] = [];
  for (const item of raw) {
    const m = rec(item);
    if (typeof m.id !== "string" || typeof m.name !== "string") continue;
    out.push({
      id: m.id,
      name: cap(m.name, 80),
      provider: typeof m.provider === "string" ? m.provider : "other",
    });
    if (out.length >= 200) break;
  }
  return out;
}

// ===========================================================================
// Component
// ===========================================================================
export interface OblTabProps {
  readonly active: boolean;
}

export function OblTab({ active }: OblTabProps): ReactElement {
  const [models, setModels] = useState<readonly ModelPickerOption[]>([]);
  const [modelsError, setModelsError] = useState<OblErrorCode | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const [runningModule, setRunningModule] = useState<OblModule | null>(null);
  const [results, setResults] = useState<
    Readonly<Partial<Record<OblModule, OblResult>>>
  >({});
  const [runError, setRunError] = useState<{
    module: OblModule;
    code: OblErrorCode;
  } | null>(null);

  const loadingModelsRef = useRef(false);

  const loadModels = useCallback(async (): Promise<void> => {
    if (loadingModelsRef.current) return;
    loadingModelsRef.current = true;
    setModelsError(null);
    try {
      const res = await fetch("/api/llm/models", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setModelsError(errorCodeFromStatus(res.status));
        return;
      }
      const raw: unknown = await res.json().catch(() => null);
      setModels(sanitizeModelOptions(raw));
    } catch {
      setModelsError("network");
    } finally {
      setModelsLoaded(true);
      loadingModelsRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || modelsLoaded) return;
    void loadModels();
  }, [active, modelsLoaded, loadModels]);

  const runModule = useCallback(
    async (module: OblModule): Promise<void> => {
      if (runningModule !== null || selectedModelId === null) return;
      setRunningModule(module);
      setRunError(null);
      try {
        const res = await fetchWithAuth(`/api/llm/obl/${module}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: selectedModelId }),
        });
        if (!res.ok) {
          setRunError({ module, code: errorCodeFromStatus(res.status) });
          return;
        }
        const raw: unknown = await res.json().catch(() => null);
        const result: OblResult =
          module === "alignment"
            ? { module, data: sanitizeAlignment(raw) }
            : module === "robustness"
              ? { module, data: sanitizeRobustness(raw) }
              : module === "depth"
                ? { module, data: sanitizeDepth(raw) }
                : { module, data: sanitizeGeometry(raw) };
        setResults((prev) => ({ ...prev, [module]: result }));
      } catch {
        setRunError({ module, code: "network" });
      } finally {
        setRunningModule(null);
      }
    },
    [runningModule, selectedModelId],
  );

  if (modelsError !== null && models.length === 0) {
    return (
      <Panel title="Obliteratus" sub="Could not load target models">
        <div role="alert" data-testid="obl-models-error" className="wb-banner danger">
          {OBL_ERROR_COPY[modelsError]}
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 10 }}
          data-testid="obl-models-retry"
          onClick={() => {
            setModelsLoaded(false);
          }}
        >
          Retry
        </button>
      </Panel>
    );
  }

  const busy = runningModule !== null;

  return (
    <div data-testid="obl-root">
      <Panel
        title="Obliteratus — behavioural analysis"
        sub="Pick a target, then run a module. Admin-gated and rate-limited."
      >
        <ModelPicker
          label="Target model"
          value={selectedModelId}
          options={models}
          onChange={setSelectedModelId}
          required
          disabled={busy}
          placeholder="Select a target model…"
          testId="obl-target-picker"
        />
        {!modelsLoaded && (
          <p className="wb-hint" data-testid="obl-models-loading">
            Loading target models…
          </p>
        )}

        <div
          role="group"
          aria-label="OBL modules"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}
        >
          {OBL_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="btn btn-secondary"
              disabled={busy || selectedModelId === null}
              onClick={() => void runModule(m.id)}
              data-testid={`obl-run-${m.id}`}
              aria-label={`Run ${m.label}`}
              title={m.blurb}
            >
              {runningModule === m.id ? `${m.label}…` : m.label}
            </button>
          ))}
        </div>

        {runError !== null && (
          <div
            role="alert"
            data-testid="obl-run-error"
            className="wb-banner danger"
            style={{ marginTop: 10 }}
          >
            {OBL_ERROR_COPY[runError.code]}
          </div>
        )}
      </Panel>

      {OBL_MODULES.every((m) => results[m.id] === undefined) ? (
        <Panel title="Results" sub="No analysis yet">
          <p className="wb-hint" data-testid="obl-empty-state">
            Select a target model and run a module to see its behavioural
            profile.
          </p>
        </Panel>
      ) : (
        OBL_MODULES.map((m) => {
          const r = results[m.id];
          if (r === undefined) return null;
          return <OblResultPanel key={m.id} result={r} label={m.label} />;
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result panels
// ---------------------------------------------------------------------------
function OblResultPanel({
  result,
  label,
}: {
  readonly result: OblResult;
  readonly label: string;
}): ReactElement {
  return (
    <Panel title={label} sub="Latest analysis">
      <div data-testid={`obl-result-${result.module}`}>
        {result.module === "alignment" && (
          <AlignmentPanel data={result.data} />
        )}
        {result.module === "robustness" && (
          <RobustnessPanel data={result.data} />
        )}
        {result.module === "depth" && <DepthPanel data={result.data} />}
        {result.module === "geometry" && <GeometryPanel data={result.data} />}
      </div>
    </Panel>
  );
}

function AlignmentPanel({ data }: { data: AlignmentResult }): ReactElement {
  return (
    <>
      {data.methodProbabilities.map((mp) => (
        <BarRow
          key={mp.method}
          label={mp.method}
          pct={pct01(mp.p)}
          value={one(mp.p)}
          tone="steel"
        />
      ))}
      <KV
        ariaLabel="Alignment metrics"
        rows={[
          { k: "Confidence", v: one(data.confidence) },
          { k: "Refusal sharpness", v: one(data.refusalSharpness) },
          { k: "Principle referencing", v: one(data.principleReferencing) },
        ]}
      />
      {data.evidenceProbes.length > 0 && (
        <ul className="wb-hint" style={{ marginTop: 8 }}>
          {data.evidenceProbes.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function RobustnessPanel({ data }: { data: RobustnessResult }): ReactElement {
  return (
    <>
      <KV
        ariaLabel="Robustness metrics"
        rows={[
          { k: "Baseline refusal", v: one(data.baselineRefusalRate) },
          { k: "Pressured refusal", v: one(data.pressuredRefusalRate) },
          { k: "Recovery rate", v: one(data.recoveryRate) },
          { k: "Ouroboros", v: one(data.ouroboros) },
        ]}
      />
      {data.degradationCurve.map((v, i) => (
        <BarRow
          key={i}
          label={`Step ${i + 1}`}
          pct={pct01(v)}
          value={one(v)}
          tone="red"
        />
      ))}
    </>
  );
}

function DepthPanel({ data }: { data: DepthResult }): ReactElement {
  return (
    <>
      <KV
        ariaLabel="Depth metrics"
        rows={[
          { k: "Activation depth", v: data.activationDepth.toUpperCase() },
          { k: "Sharpness", v: one(data.sharpness) },
        ]}
      />
      {data.thresholds.map((t, i) => (
        <BarRow
          key={i}
          label={`Severity ${one(t.severity)}`}
          pct={pct01(t.refusal)}
          value={one(t.refusal)}
          tone="gold"
        />
      ))}
    </>
  );
}

function GeometryPanel({ data }: { data: GeometryResult }): ReactElement {
  return (
    <>
      <KV
        ariaLabel="Geometry metrics"
        rows={[
          { k: "Boundary type", v: data.type.toUpperCase() },
          { k: "Solid angle", v: one(data.solidAngle) },
        ]}
      />
      {data.facets.map((f, i) => (
        <BarRow
          key={i}
          label={f.angle || `Facet ${i + 1}`}
          pct={pct01(f.consistency)}
          value={one(f.consistency)}
          tone="jade"
        />
      ))}
    </>
  );
}
