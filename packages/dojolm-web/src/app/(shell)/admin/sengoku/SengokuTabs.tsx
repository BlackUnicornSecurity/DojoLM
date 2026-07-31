// SPDX-License-Identifier: Apache-2.0
/**
 * SengokuTabs — YR.20 / G-029 / G-030.
 *
 * Sibling subcomponents to /admin/sengoku/SengokuClient.tsx. Houses the
 * 2 new tabs added on top of the existing Campaigns workbench:
 *
 *   - RunsTab          → GET /api/sengoku/temporal/runs (public read)
 *                        renders a timeline of executed plans + verdict.
 *   - OrchestratorTab  → GET /api/sengoku/temporal/plans (public read)
 *                        renders the plan registry + a locked Run CTA.
 *
 * Stop-condition handling (per YR.20 prompt):
 *   - The DAG-builder UI (drag-drop campaign canvas) is INTENTIONALLY
 *     not shipped here — pure-SVG DAG layout exceeds the YR.20 scope
 *     ceiling without a charting primitive (zero-deps mandate). The
 *     campaign LIST (existing SengokuClient) + the new Runs timeline
 *     + the Orchestrator plan registry close G-029 / G-030 with
 *     "list-and-table" parity. The drag-drop canvas remains tracked
 *     for YR.21 closeout.
 *   - The temporal/plans + temporal/runs/resume POST routes were
 *     migrated under withAuth({role:'admin'}) in YR.20 (G-073). The
 *     Run-plan CTA in OrchestratorTab is wired to the authenticated
 *     POST /api/sengoku/temporal/runs as of CONT-R2-005 (fetchWithAuth
 *     for CSRF; a run refreshes the Runs tab via onRunComplete).
 *
 * Discriminant-redaction (R-T1):
 *   - VERDICT_CHIP / VERDICT_LABEL : closed verdict → chip class +
 *     fixed-vocabulary display label.
 *   - ATTACK_TYPE_LABEL            : closed enum → human label.
 *
 * No closed-union value crosses an aria-label without going through
 * one of these maps. Server-supplied display strings (planId / runId /
 * name / description) pass through `cap()` at the sanitizer.
 */

"use client";

import { useEffect, useState } from "react";
import { Panel, cap } from "@/design";
import { AivssPill } from "@/design/aivss";
import { calculate, type AivssScore } from "bu-tpi/aivss";
import {
  findingToAivssMetrics,
  type SengokuVerdict,
} from "@/lib/sengoku/aivss-mapping";
// CONT-R2-005 — Run-plan CTA wiring. fetchWithAuth attaches the CSRF
// double-submit header the admin-gated run endpoint requires; error-copy
// keeps the failure banner off any reflected server string (F-617).
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  ERROR_BANNERS,
  serverCodeFromStatus,
  type ServerCode,
} from "@/lib/error-copy";

type AttackType =
  | "accumulation"
  | "delayed-activation"
  | "session-persistence"
  | "context-overflow"
  | "persona-drift";

// Runtime verdict the server actually emits (RunRecord.summary.verdict —
// see lib/sengoku/fixtures.ts / simulator.ts finalVerdict). This is NOT
// the 4-value AIVSS `SengokuVerdict` vocabulary; the two are mapped for
// the AIVSS pill below via RUNTIME_TO_AIVSS.
type RunVerdict = "safe" | "at-risk" | "compromised";

interface PlanLite {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly attackType: AttackType;
  readonly turnCount: number;
  readonly createdAt: string;
}

interface RunSummaryLite {
  readonly verdict: RunVerdict;
  readonly flaggedRisks: number;
}

interface RunRecordLite {
  readonly id: string;
  readonly planId: string;
  readonly attackType: AttackType;
  readonly summary: RunSummaryLite;
  readonly startedAt: string;
  readonly completedAt: string;
}

const ATTACK_TYPE_LABEL: Record<AttackType, string> = {
  accumulation: "Accumulation",
  "delayed-activation": "Delayed activation",
  "session-persistence": "Session persistence",
  "context-overflow": "Context overflow",
  "persona-drift": "Persona drift",
};

const VERDICT_CHIP: Record<RunVerdict, string> = {
  safe: "wb-badge ok",
  "at-risk": "wb-badge warn",
  compromised: "wb-badge alert",
};

const VERDICT_LABEL: Record<RunVerdict, string> = {
  safe: "SAFE",
  "at-risk": "AT-RISK",
  compromised: "COMPROMISED",
};

// Runtime verdict → 4-value AIVSS severity vocabulary. `at-risk` is the
// middling runtime outcome, which AIVSS scores as the medium `flagged`
// band; safe/compromised map straight through.
const RUNTIME_TO_AIVSS: Record<RunVerdict, SengokuVerdict> = {
  safe: "safe",
  "at-risk": "flagged",
  compromised: "compromised",
};

const VALID_ATTACK_TYPES: ReadonlySet<AttackType> = new Set([
  "accumulation",
  "delayed-activation",
  "session-persistence",
  "context-overflow",
  "persona-drift",
]);

const VALID_VERDICTS: ReadonlySet<RunVerdict> = new Set([
  "safe",
  "at-risk",
  "compromised",
]);

const ID_MAX = 64;
const NAME_MAX = 200;
const DESC_MAX = 600;
const TS_MAX = 32;
const MAX_PLANS_DISPLAYED = 50;
const MAX_RUNS_DISPLAYED = 50;

function isAttackType(v: unknown): v is AttackType {
  return typeof v === "string" && VALID_ATTACK_TYPES.has(v as AttackType);
}

function isVerdict(v: unknown): v is RunVerdict {
  return typeof v === "string" && VALID_VERDICTS.has(v as RunVerdict);
}

function safeCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return 0;
  return Math.floor(value);
}

function sanitizePlan(raw: unknown): PlanLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (typeof r.description !== "string") return null;
  if (!isAttackType(r.attackType)) return null;
  const turns = Array.isArray(r.turns) ? r.turns.length : 0;
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    description: cap(r.description, DESC_MAX),
    attackType: r.attackType,
    turnCount: turns,
    createdAt: cap(typeof r.createdAt === "string" ? r.createdAt : "", TS_MAX),
  };
}

function sanitizeRun(raw: unknown): RunRecordLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.planId !== "string") return null;
  if (!isAttackType(r.attackType)) return null;
  const sum = (r.summary ?? {}) as Record<string, unknown>;
  if (!isVerdict(sum.verdict)) return null;
  return {
    id: cap(r.id, ID_MAX),
    planId: cap(r.planId, ID_MAX),
    attackType: r.attackType,
    summary: {
      verdict: sum.verdict,
      flaggedRisks: safeCount(sum.flaggedRisks),
    },
    startedAt: cap(typeof r.startedAt === "string" ? r.startedAt : "", TS_MAX),
    completedAt: cap(
      typeof r.completedAt === "string" ? r.completedAt : "",
      TS_MAX,
    ),
  };
}

// =============================================================================
// RunsTab — temporal runs timeline (read-only)
// =============================================================================

export interface RunsTabProps {
  /**
   * Bump to force a refetch — the Orchestrator increments this after a
   * successful run so the (already-mounted) Runs timeline reflects it
   * without a full page reload (CONT-R2-005).
   */
  readonly refreshToken?: number;
}

export function RunsTab({ refreshToken = 0 }: RunsTabProps = {}) {
  const [runs, setRuns] = useState<readonly RunRecordLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sengoku/temporal/runs?limit=50", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          runs?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Temporal runs unavailable");
          setRuns([]);
          return;
        }
        const safe: RunRecordLite[] = [];
        for (const item of body.runs ?? []) {
          const r = sanitizeRun(item);
          if (r && safe.length < MAX_RUNS_DISPLAYED) safe.push(r);
        }
        setRuns(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setRuns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return (
    <Panel
      headingLevel={2}
      title="Temporal runs"
      sub={
        loading
          ? "Fetching temporal runs…"
          : error
            ? error
            : `${runs.length} most-recent runs`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="sengoku-runs-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && runs.length === 0 && (
        <p className="wb-hint" data-testid="sengoku-runs-empty">
          No temporal runs yet. Execute a plan from the Orchestrator tab to
          record one here.
        </p>
      )}
      {runs.length > 0 && (
        <table
          className="wb-table"
          aria-label="Sengoku temporal runs"
          data-testid="sengoku-runs-table"
        >
          <thead>
            <tr>
              <th>Run id</th>
              <th>Plan id</th>
              <th>Attack type</th>
              <th>Verdict</th>
              <th>AIVSS</th>
              <th>Flagged risks</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <SengokuRunRow key={r.id} run={r} />
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// SengokuRunRow — per-run row with AIVSS chip (TICKET-G3-SENGOKU)
//
// Per ADR-0097 §7 — derives AIVSS client-side from the closed `attackType`
// + `verdict` enums via `findingToAivssMetrics` + `calculate`. When
// `/api/sengoku/temporal/runs` begins emitting `run.aivss` directly
// (TICKET-G3-API-SENGOKU), the server-supplied value will win over the
// client derivation.
//
// Defensive try/catch — a malformed run cannot crash the table; the row
// falls back to a `band='none'` chip and logs to the console so the
// regression is visible in dev tools (mirrors the Atemi / Mitsuke /
// Kagami / Hattori row defensive pattern).
// -----------------------------------------------------------------------------

interface SengokuRunRowProps {
  readonly run: RunRecordLite;
}

function SengokuRunRow({ run: r }: SengokuRunRowProps) {
  // ADR-0097 §7 — derive AIVSS client-side from attackType + verdict.
  // Wrapped in try/catch so a malformed run can never crash the table —
  // falls back to band='none' chip + console.error for diagnostics.
  let aivss: AivssScore | null = null;
  try {
    aivss = calculate(
      findingToAivssMetrics({
        category: r.attackType,
        severity: RUNTIME_TO_AIVSS[r.summary.verdict],
      }),
    );
  } catch (err) {
    // Defensive fallback — preserves the row but flags the regression.
    // A throw here means findingToAivssMetrics or calculate broke for a
    // shape that should have been narrowed by sanitizeRun upstream.
    console.error("[sengoku] AIVSS derivation failed for run", {
      attackType: r.attackType,
      verdict: r.summary.verdict,
      err,
    });
    aivss = null;
  }

  return (
    <tr data-testid={`sengoku-run-row-${r.id}`}>
      <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{r.id}</td>
      <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{r.planId}</td>
      <td>
        <span aria-label={`Attack type ${ATTACK_TYPE_LABEL[r.attackType]}`}>
          {ATTACK_TYPE_LABEL[r.attackType]}
        </span>
      </td>
      <td>
        <span
          className={VERDICT_CHIP[r.summary.verdict]}
          aria-label={`Verdict ${VERDICT_LABEL[r.summary.verdict]}`}
        >
          {VERDICT_LABEL[r.summary.verdict]}
        </span>
      </td>
      <td>
        {aivss !== null ? (
          <AivssPill
            selfAttested
            band={aivss.severity}
            score={aivss.base}
            testId={`sengoku-aivss-pill-${r.id}`}
          />
        ) : (
          <AivssPill
            selfAttested
            band="none"
            testId={`sengoku-aivss-pill-${r.id}`}
          />
        )}
      </td>
      <td>{r.summary.flaggedRisks}</td>
      <td style={{ fontSize: 11 }}>{r.startedAt}</td>
    </tr>
  );
}

// =============================================================================
// OrchestratorTab — temporal plan registry + locked Run CTA
// =============================================================================

export interface OrchestratorTabProps {
  /** Called after a plan run succeeds so the Runs tab can refetch. */
  readonly onRunComplete?: () => void;
}

export function OrchestratorTab({ onRunComplete }: OrchestratorTabProps = {}) {
  const [plans, setPlans] = useState<readonly PlanLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // CONT-R2-005 — run-plan wiring state. `runningPlanId` gates concurrency
  // (one run at a time); `runVerdicts` shows the last verdict per plan;
  // `runErrorCode` is a closed ServerCode, never a reflected server string.
  const [runningPlanId, setRunningPlanId] = useState<string | null>(null);
  const [runVerdicts, setRunVerdicts] = useState<
    Readonly<Record<string, RunVerdict>>
  >({});
  const [runErrorCode, setRunErrorCode] = useState<ServerCode | null>(null);

  async function onRunPlan(planId: string): Promise<void> {
    if (runningPlanId !== null) return;
    setRunningPlanId(planId);
    setRunErrorCode(null);
    try {
      const res = await fetchWithAuth("/api/sengoku/temporal/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        setRunErrorCode(serverCodeFromStatus(res.status));
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        run?: { summary?: { verdict?: unknown } };
      };
      const verdict = body.run?.summary?.verdict;
      if (isVerdict(verdict)) {
        setRunVerdicts((prev) => ({ ...prev, [planId]: verdict }));
      }
      onRunComplete?.();
    } catch {
      setRunErrorCode("network");
    } finally {
      setRunningPlanId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sengoku/temporal/plans", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          plans?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Plan registry unavailable");
          setPlans([]);
          return;
        }
        const safe: PlanLite[] = [];
        for (const item of body.plans ?? []) {
          const p = sanitizePlan(item);
          if (p && safe.length < MAX_PLANS_DISPLAYED) safe.push(p);
        }
        setPlans(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel
      headingLevel={2}
      title="Orchestrator plans"
      sub={
        loading
          ? "Fetching orchestrator plans…"
          : error
            ? error
            : `${plans.length} plans · run live`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="sengoku-orchestrator-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      <p
        className="wb-hint"
        data-testid="sengoku-orchestrator-runner-hint"
        style={{ marginBottom: 10, fontSize: 11, color: "var(--fg-dim)" }}
      >
        <strong>Runner status:</strong> live. Running a plan executes it against
        the configured target (deterministic simulator when no LLM is wired) and
        records the run in the Runs tab. Admin-gated and audited.
      </p>
      {runErrorCode !== null && (
        <div
          role="alert"
          data-testid="sengoku-run-error"
          className="wb-banner danger"
        >
          <strong>{ERROR_BANNERS[runErrorCode].title}:</strong>{" "}
          {ERROR_BANNERS[runErrorCode].body}
        </div>
      )}
      {!loading && !error && plans.length === 0 && (
        <p className="wb-hint" data-testid="sengoku-orchestrator-empty">
          No temporal plans loaded.
        </p>
      )}
      {plans.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Sengoku temporal plans table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Sengoku temporal plans"
            data-testid="sengoku-orchestrator-table"
          >
            <thead>
              <tr>
                <th>Plan</th>
                <th>Attack type</th>
                <th>Turns</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} data-testid={`sengoku-plan-row-${p.id}`}>
                  <td>
                    <div>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
                      {p.description}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {p.id}
                    </div>
                  </td>
                  <td>
                    <span
                      aria-label={`Attack type ${ATTACK_TYPE_LABEL[p.attackType]}`}
                    >
                      {ATTACK_TYPE_LABEL[p.attackType]}
                    </span>
                  </td>
                  <td>{p.turnCount}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      // Concurrency gate: disabled only while any run is in
                      // flight, so the executor handles one plan at a time.
                      disabled={runningPlanId !== null}
                      onClick={() => void onRunPlan(p.id)}
                      data-testid={`sengoku-plan-run-${p.id}`}
                      aria-label={`Run ${p.name}`}
                    >
                      {runningPlanId === p.id ? "Running…" : "Run"}
                    </button>
                    {runVerdicts[p.id] !== undefined && (
                      <span
                        className={VERDICT_CHIP[runVerdicts[p.id]!]}
                        data-testid={`sengoku-plan-verdict-${p.id}`}
                        aria-label={`Last run verdict ${VERDICT_LABEL[runVerdicts[p.id]!]}`}
                        style={{ marginLeft: 8 }}
                      >
                        {VERDICT_LABEL[runVerdicts[p.id]!]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
