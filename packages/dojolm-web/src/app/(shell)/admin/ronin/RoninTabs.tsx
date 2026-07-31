// SPDX-License-Identifier: Apache-2.0
/**
 * RoninTabs — YR.20 / G-037 / G-038 / G-039.
 *
 * Sibling subcomponents to /admin/ronin/RoninAdminClient.tsx:
 *
 *   - PlanningTab            → GET /api/ronin/planning/targets
 *                              + POST add new target (any authenticated
 *                              operator; per-user-scoped store).
 *   - IntelligenceTab        → GET /api/ronin/intelligence
 *                              + GET /api/ronin/cves merged display.
 *   - SubmissionWizardPanel  → 4-step wizard (target → details →
 *                              evidence → review) form hitting
 *                              POST /api/ronin/submissions (admin
 *                              under withAuth). Issue #348 G-038
 *                              splinter closeout — replaces the
 *                              YR.20 single-step MVP per
 *                              v1-v2-restore-ronin-tabs.
 *   - AISeverityCalculator   → closed-form deterministic severity
 *                              estimator. Accepts a few categorical
 *                              inputs and returns a 0-10 score band.
 *                              Local-only — no network call. Used
 *                              embedded inside the SubmissionWizard.
 *
 * Discriminant-redaction (R-T1):
 *   - SUBMISSION_SEVERITY_LABEL : closed enum → fixed-vocabulary label
 *   - SUBMISSION_SEVERITY_CHIP  : closed enum → chip class
 *   - INTEL_TYPE_LABEL          : closed enum → display label
 *   - PRIORITY_LABEL / STATUS_LABEL : closed enums → display labels
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
// E-A9 Phase B — narrow direct-component-path imports per
// the darwin-perf import rule. The bare `@/design`
// barrel hangs vitest on darwin under jsdom.
import { Panel } from "@/design/shell/Panel";
import { cap } from "@/design/primitives/_caps";
import {
  AISeverityCalculator,
  isSubmissionSeverity,
  SUBMISSION_SEVERITY_CHIP,
  SUBMISSION_SEVERITY_LABEL,
  type SubmissionSeverity,
} from "./RoninSeverityCalculator";

export {
  AISeverityCalculator,
  computeAiSeverity,
} from "./RoninSeverityCalculator";
export { IntelligenceTab } from "./RoninIntelligenceTab";

type PlanningStatus = "active" | "paused" | "completed" | "archived";
type PlanningPriority = "P0" | "P1" | "P2" | "P3";
type PlanningScope = "in-scope" | "out-of-scope" | "edge";

const PRIORITY_LABEL: Record<PlanningPriority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
};

const STATUS_LABEL: Record<PlanningStatus, string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  completed: "COMPLETED",
  archived: "ARCHIVED",
};

const SCOPE_LABEL: Record<PlanningScope, string> = {
  "in-scope": "In-scope",
  "out-of-scope": "Out-of-scope",
  edge: "Edge",
};

const VALID_PLANNING_STATUSES: ReadonlySet<PlanningStatus> = new Set([
  "active",
  "paused",
  "completed",
  "archived",
]);
const VALID_PLANNING_PRIORITIES: ReadonlySet<PlanningPriority> = new Set([
  "P0",
  "P1",
  "P2",
  "P3",
]);
const VALID_PLANNING_SCOPES: ReadonlySet<PlanningScope> = new Set([
  "in-scope",
  "out-of-scope",
  "edge",
]);

const ID_MAX = 64;
const TITLE_MAX = 200;
const URL_MAX = 2048;
const NOTES_MAX = 2_000;
const TS_MAX = 32;
const MAX_TARGETS_DISPLAYED = 50;

function isPlanningStatus(v: unknown): v is PlanningStatus {
  return (
    typeof v === "string" && VALID_PLANNING_STATUSES.has(v as PlanningStatus)
  );
}

function isPlanningPriority(v: unknown): v is PlanningPriority {
  return (
    typeof v === "string" &&
    VALID_PLANNING_PRIORITIES.has(v as PlanningPriority)
  );
}

function isPlanningScope(v: unknown): v is PlanningScope {
  return typeof v === "string" && VALID_PLANNING_SCOPES.has(v as PlanningScope);
}

interface PlanningTargetLite {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly status: PlanningStatus;
  readonly priority: PlanningPriority;
  readonly scope: PlanningScope;
  readonly createdAt: string;
}

function sanitizeTarget(raw: unknown): PlanningTargetLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;
  if (typeof r.url !== "string") return null;
  if (!isPlanningStatus(r.status)) return null;
  if (!isPlanningPriority(r.priority)) return null;
  if (!isPlanningScope(r.scope)) return null;
  return {
    id: cap(r.id, ID_MAX),
    title: cap(r.title, TITLE_MAX),
    url: cap(r.url, URL_MAX),
    status: r.status,
    priority: r.priority,
    scope: r.scope,
    createdAt: cap(typeof r.createdAt === "string" ? r.createdAt : "", TS_MAX),
  };
}

// =============================================================================
// SubmissionWizardPanel (G-038)
// =============================================================================

type WizardErrorCode = "forbidden" | "invalid-input" | "network" | "server";
const WIZARD_ERROR_COPY: Record<WizardErrorCode, string> = {
  forbidden: "Submission refused. Confirm admin access.",
  "invalid-input": "Missing or malformed input — check title + programId.",
  network: "Network error. Check your connection.",
  server: "Submissions service unavailable. Retry shortly.",
};

// Issue #348 G-038 splinter — 4-step wizard. Closed enum drives the
// step ribbon, navigation gates, and the per-step validation contract.
type WizardStep = "target" | "details" | "evidence" | "review";
const WIZARD_STEPS: readonly WizardStep[] = [
  "target",
  "details",
  "evidence",
  "review",
];
const WIZARD_STEP_LABEL: Record<WizardStep, string> = {
  target: "Target",
  details: "Details",
  evidence: "Evidence",
  review: "Review",
};
const WIZARD_STEP_NUMBER: Record<WizardStep, number> = {
  target: 1,
  details: 2,
  evidence: 3,
  review: 4,
};

const SAFE_PROGRAM_ID = /^[A-Za-z0-9_-]{1,64}$/;
const EVIDENCE_LINE_MAX = 2000;
const EVIDENCE_MAX_LINES = 10;

function splitEvidence(raw: string): readonly string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, EVIDENCE_MAX_LINES)
    .map((line) => line.slice(0, EVIDENCE_LINE_MAX));
}

export function SubmissionWizardPanel() {
  const [step, setStep] = useState<WizardStep>("target");
  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState("");
  const [severity, setSeverity] = useState<SubmissionSeverity>("medium");
  const [evidenceText, setEvidenceText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WizardErrorCode | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function targetValid(): boolean {
    return SAFE_PROGRAM_ID.test(programId);
  }
  function detailsValid(): boolean {
    return title.length > 0 && title.length <= TITLE_MAX;
  }
  // Evidence is optional — empty is acceptable. The step always passes.
  function reviewValid(): boolean {
    return targetValid() && detailsValid();
  }

  function gotoNext() {
    setError(null);
    if (step === "target") {
      if (!targetValid()) {
        setError("invalid-input");
        return;
      }
      setStep("details");
      return;
    }
    if (step === "details") {
      if (!detailsValid()) {
        setError("invalid-input");
        return;
      }
      setStep("evidence");
      return;
    }
    if (step === "evidence") {
      setStep("review");
      return;
    }
  }

  function gotoBack() {
    setError(null);
    if (step === "details") setStep("target");
    else if (step === "evidence") setStep("details");
    else if (step === "review") setStep("evidence");
  }

  async function onSubmit() {
    if (busy) return;
    if (!reviewValid()) {
      setError("invalid-input");
      return;
    }
    setBusy(true);
    setError(null);
    setCreatedId(null);
    try {
      const evidence = splitEvidence(evidenceText);
      const res = await fetchWithAuth("/api/ronin/submissions", {
        method: "POST",
        body: JSON.stringify({
          title,
          programId,
          severity,
          status: "submitted",
          ...(evidence.length > 0 ? { evidence } : {}),
        }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setError("forbidden");
        else if (res.status === 400) setError("invalid-input");
        else setError("server");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        submission?: { id?: unknown };
      } | null;
      if (body?.submission && typeof body.submission.id === "string") {
        setCreatedId(cap(body.submission.id, ID_MAX));
      }
    } catch {
      setError("network");
    } finally {
      setBusy(false);
    }
  }

  const evidenceLines = useMemo(
    () => splitEvidence(evidenceText),
    [evidenceText],
  );

  return (
    <Panel
      title="New submission"
      sub="4-step wizard · target → details → evidence → review"
    >
      <ol
        data-testid="ronin-wizard-step-strip"
        aria-label="Submission wizard steps"
        style={{
          display: "flex",
          gap: 6,
          listStyle: "none",
          padding: 0,
          margin: "0 0 14px",
          flexWrap: "wrap",
        }}
      >
        {WIZARD_STEPS.map((s) => {
          const active = s === step;
          const passed = WIZARD_STEP_NUMBER[s] < WIZARD_STEP_NUMBER[step];
          return (
            <li
              key={s}
              data-testid={`ronin-wizard-step-${s}`}
              data-active={active ? "true" : "false"}
              data-passed={passed ? "true" : "false"}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                border: "1px solid var(--paper-rule, #5b5446)",
                borderRadius: 999,
                background: active
                  ? "var(--torii-hi, #b25a3f)"
                  : passed
                    ? "var(--fg-dim)"
                    : "transparent",
                color: active || passed ? "var(--paper, #f3ecd8)" : "inherit",
              }}
              aria-current={active ? "step" : undefined}
            >
              <span aria-hidden="true">{WIZARD_STEP_NUMBER[s]}. </span>
              {WIZARD_STEP_LABEL[s]}
            </li>
          );
        })}
      </ol>

      {error !== null && (
        <div
          role="alert"
          data-testid="ronin-wizard-error"
          className="wb-banner danger"
        >
          {WIZARD_ERROR_COPY[error]}
        </div>
      )}
      {createdId !== null && (
        <div
          role="status"
          data-testid="ronin-wizard-created"
          className="wb-banner ok"
          style={{ marginBottom: 10 }}
        >
          Submission queued · id <code>{createdId}</code>
        </div>
      )}

      {step === "target" && (
        <div data-testid="ronin-wizard-step-body-target">
          <div className="wb-field">
            <label htmlFor="ronin-wizard-program">Program id</label>
            <input
              id="ronin-wizard-program"
              data-testid="ronin-wizard-program-input"
              type="text"
              className="wb-input"
              value={programId}
              onChange={(e) => setProgramId(e.target.value.slice(0, ID_MAX))}
              disabled={busy}
              placeholder="program-public"
              autoComplete="off"
            />
            <p className="wb-hint" style={{ fontSize: 11, marginTop: 6 }}>
              Pick the bug-bounty program. Alphanumeric + dash/underscore only.
            </p>
          </div>
        </div>
      )}

      {step === "details" && (
        <div data-testid="ronin-wizard-step-body-details">
          <div className="wb-field">
            <label htmlFor="ronin-wizard-title">Title</label>
            <input
              id="ronin-wizard-title"
              data-testid="ronin-wizard-title-input"
              type="text"
              className="wb-input"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              disabled={busy}
              autoComplete="off"
            />
          </div>
          <div className="wb-field" style={{ marginTop: 10 }}>
            <label htmlFor="ronin-wizard-severity">Severity</label>
            <select
              id="ronin-wizard-severity"
              data-testid="ronin-wizard-severity-select"
              className="wb-select"
              value={severity}
              onChange={(e) => {
                const next = e.target.value;
                if (isSubmissionSeverity(next)) setSeverity(next);
              }}
              disabled={busy}
            >
              {(
                Object.keys(SUBMISSION_SEVERITY_LABEL) as SubmissionSeverity[]
              ).map((s) => (
                <option key={s} value={s}>
                  {SUBMISSION_SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <AISeverityCalculator onScore={(res) => setSeverity(res.band)} />
        </div>
      )}

      {step === "evidence" && (
        <div data-testid="ronin-wizard-step-body-evidence">
          <div className="wb-field">
            <label htmlFor="ronin-wizard-evidence">
              Evidence (optional, one entry per line)
            </label>
            {/* E7.S12 / E9.S10 (retires F-4-032 P3) — long-text field
                gets lang="en" + spellcheck="true" defaults. WCAG SC 1.3.5
                + 1.4.12. Ronin evidence is operator-authored prose (one
                entry per line: HTTP capture descriptions, reproducer
                steps, log excerpt commentary) — natural-language
                spellcheck is correct here. */}
            <textarea
              id="ronin-wizard-evidence"
              data-testid="ronin-wizard-evidence-input"
              className="wb-input"
              rows={8}
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              disabled={busy}
              placeholder="HTTP request capture\nReproducer steps\nLog excerpt"
              lang="en"
              spellCheck="true"
            />
            <p className="wb-hint" style={{ fontSize: 11, marginTop: 6 }}>
              {evidenceLines.length} line{evidenceLines.length === 1 ? "" : "s"}
              {" · max "}
              {EVIDENCE_MAX_LINES}
              {" lines, "}
              {EVIDENCE_LINE_MAX}
              {" chars each."}
            </p>
          </div>
        </div>
      )}

      {step === "review" && (
        <div data-testid="ronin-wizard-step-body-review">
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Review</h4>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "4px 12px",
              fontSize: 12,
            }}
          >
            <dt style={{ color: "var(--fg-dim)" }}>Program</dt>
            <dd
              data-testid="ronin-wizard-review-program"
              style={{ margin: 0, fontFamily: "var(--mono)" }}
            >
              {programId}
            </dd>
            <dt style={{ color: "var(--fg-dim)" }}>Title</dt>
            <dd data-testid="ronin-wizard-review-title" style={{ margin: 0 }}>
              {title}
            </dd>
            <dt style={{ color: "var(--fg-dim)" }}>Severity</dt>
            <dd
              data-testid="ronin-wizard-review-severity"
              style={{ margin: 0 }}
            >
              <span className={SUBMISSION_SEVERITY_CHIP[severity]}>
                {SUBMISSION_SEVERITY_LABEL[severity]}
              </span>
            </dd>
            <dt style={{ color: "var(--fg-dim)" }}>Evidence</dt>
            <dd
              data-testid="ronin-wizard-review-evidence"
              style={{ margin: 0 }}
            >
              {evidenceLines.length === 0 ? (
                <em style={{ color: "var(--fg-dim)" }}>None</em>
              ) : (
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {evidenceLines.map((line, ix) => (
                    <li
                      key={ix}
                      style={{ fontFamily: "var(--mono)", fontSize: 11 }}
                    >
                      {cap(line, 200)}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={gotoBack}
          disabled={busy || step === "target"}
          data-testid="ronin-wizard-back-button"
        >
          ← Back
        </button>
        {step !== "review" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={gotoNext}
            disabled={busy}
            data-testid="ronin-wizard-next-button"
            aria-label={`Continue to ${
              WIZARD_STEP_LABEL[
                WIZARD_STEPS[WIZARD_STEP_NUMBER[step]] ?? "review"
              ]
            }`}
          >
            Next →
          </button>
        )}
        {step === "review" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={busy || !reviewValid()}
            data-testid="ronin-wizard-create-button"
            aria-label={
              busy
                ? "Submitting bug-bounty submission…"
                : "Submit bug-bounty submission"
            }
          >
            {busy ? "Submitting bounty…" : "Submit bounty"}
          </button>
        )}
      </div>
    </Panel>
  );
}

// =============================================================================
// PlanningTab (G-037)
// =============================================================================

export function PlanningTab() {
  const [targets, setTargets] = useState<readonly PlanningTargetLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/ronin/planning/targets", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          targets?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Planning targets unavailable");
          setTargets([]);
          return;
        }
        const safe: PlanningTargetLite[] = [];
        for (const item of body.targets ?? []) {
          const t = sanitizeTarget(item);
          if (t && safe.length < MAX_TARGETS_DISPLAYED) safe.push(t);
        }
        setTargets(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setTargets([]);
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
      title="Planning targets"
      sub={
        loading
          ? "Fetching planning targets…"
          : error
            ? error
            : `${targets.length} targets · per-operator scope`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="ronin-planning-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && targets.length === 0 && (
        <p className="wb-hint" data-testid="ronin-planning-empty">
          No planning targets. Target creation is not available on this screen.
        </p>
      )}
      {targets.length > 0 && (
        <table
          className="wb-table"
          aria-label="Ronin planning targets"
          data-testid="ronin-planning-table"
        >
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Scope</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.id} data-testid={`ronin-planning-row-${t.id}`}>
                <td>
                  <div>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
                    {t.url}
                  </div>
                </td>
                <td>
                  <span aria-label={`Status ${STATUS_LABEL[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td>
                  <span aria-label={`Priority ${PRIORITY_LABEL[t.priority]}`}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </td>
                <td>{SCOPE_LABEL[t.scope]}</td>
                <td style={{ fontSize: 11 }}>{t.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
