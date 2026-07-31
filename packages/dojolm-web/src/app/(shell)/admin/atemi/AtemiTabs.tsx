// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `atemi` is a typed EmptyState product module here, never a retired NavId. */
/**
 * AtemiTabs — YR.20 / G-062 / G-063 / G-064.
 *
 * Sibling subcomponents to /admin/atemi/page.tsx. Houses the 4 new
 * tabs added on top of the existing Records workbench:
 *
 *   - SkillsLibraryTab → GET /api/atemi/attack-tools
 *   - PlaybooksTab     → GET /api/atemi/playbooks (list + locked Run CTA)
 *   - SessionsTab      → in-session probe-history table (re-render of the
 *                        existing page.tsx state, exposed under its own tab)
 *   - ConceptReconTab  → textarea + analyze stub. Concept-recon library
 *                        is a YR.21 follow-up; the tab ships in disabled
 *                        state with a clearly-labelled hint.
 *
 * Stop-condition handling (per YR.20 prompt):
 *   - /api/atemi/playbooks is GET-only — the PlaybookRunner ships the
 *     list view + a disabled Run button per row + an EmptyState that
 *     explains "execution endpoint pending". No outbound model calls
 *     happen from this client-side component, so enforceGuardMode at
 *     the route layer is not yet applicable; tracked for YR.21.
 *
 * Discriminant-redaction (R-T1):
 *   - SEVERITY_CHIP / SEVERITY_LABEL : closed AtemiSeverity → chip class
 *     and fixed-vocabulary label. Server-supplied display strings
 *     (target, name, summary) pass through `cap()` at the sanitizer.
 *   - ATTACK_CLASS_LABEL              : closed enum → display label.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
// Atemi-PR-2 — narrow sub-path imports per
// the darwin-perf import rule.
import { Panel } from "@/design/shell/Panel";
import { EmptyState } from "@/design/system/EmptyState";
import { cap } from "@/design/primitives/_caps";
import { pluralize } from "@/lib/pluralize";
import type { AivssScore } from "bu-tpi/aivss";
import { AttackToolRow } from "./AttackToolRow";
import { PlaybookRunner, type PlaybookOption } from "./PlaybookRunner";
import { ConceptReconPanel } from "./ConceptReconPanel";
import { AtemiAttackLogPanel } from "./_components/AtemiAttackLogPanel";
import { AtemiSessionRecorderPanel } from "./_components/AtemiSessionRecorderPanel";

export const ATEMI_SEVERITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
] as const;

export type AtemiSeverity = (typeof ATEMI_SEVERITIES)[number];

export const ATEMI_ATTACK_CLASSES = [
  "prompt-injection",
  "jailbreak",
  "extraction",
  "tool-abuse",
  "multi-modal",
  "agentic-loop",
  "compliance-bypass",
  "reconnaissance",
] as const;

export type AtemiAttackClass = (typeof ATEMI_ATTACK_CLASSES)[number];

export interface AttackToolLite {
  readonly id: string;
  readonly name: string;
  readonly attackClass: AtemiAttackClass;
  readonly severity: AtemiSeverity;
  readonly target: string;
  readonly summary: string;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field (placeholder; today the
   * client derives via `findingToAivssMetrics` + `calculate` at row-render
   * time when this field is absent). When `/api/atemi/attack-tools` begins
   * emitting `tool.aivss` directly (TICKET-G3-API), the server value wins
   * over the client derivation.
   */
  readonly aivss?: AivssScore;
}

interface PlaybookLite {
  readonly id: string;
  readonly name: string;
  readonly severity: AtemiSeverity;
  readonly target: string;
  readonly summary: string;
  readonly stepCount: number;
}

export interface ProbeHistoryEntryLite {
  readonly ts: string;
  readonly started: number;
  readonly skipped: number;
  readonly errors: number;
  readonly durationMs: number;
}

export const SEVERITY_CHIP: Readonly<Record<AtemiSeverity, string>> = {
  CRITICAL: "wb-badge alert",
  HIGH: "wb-badge warn",
  MEDIUM: "wb-badge muted",
  LOW: "wb-badge ok",
  INFO: "wb-badge muted",
};

export const SEVERITY_LABEL: Readonly<Record<AtemiSeverity, string>> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
};

export const ATTACK_CLASS_LABEL: Readonly<Record<AtemiAttackClass, string>> = {
  "prompt-injection": "Prompt injection",
  jailbreak: "Jailbreak",
  extraction: "Extraction",
  "tool-abuse": "Tool abuse",
  "multi-modal": "Multi-modal",
  "agentic-loop": "Agentic loop",
  "compliance-bypass": "Compliance bypass",
  reconnaissance: "Reconnaissance",
};

const VALID_SEVERITIES: ReadonlySet<AtemiSeverity> = new Set([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

const VALID_ATTACK_CLASSES: ReadonlySet<AtemiAttackClass> = new Set([
  "prompt-injection",
  "jailbreak",
  "extraction",
  "tool-abuse",
  "multi-modal",
  "agentic-loop",
  "compliance-bypass",
  "reconnaissance",
]);

const ID_MAX = 64;
const NAME_MAX = 120;
const TARGET_MAX = 120;
const SUMMARY_MAX = 360;
const MAX_TOOLS_DISPLAYED = 50;
const MAX_PLAYBOOKS_DISPLAYED = 50;
const MAX_HISTORY_DISPLAYED = 25;

function isSeverity(v: unknown): v is AtemiSeverity {
  return typeof v === "string" && VALID_SEVERITIES.has(v as AtemiSeverity);
}

function isAttackClass(v: unknown): v is AtemiAttackClass {
  return (
    typeof v === "string" && VALID_ATTACK_CLASSES.has(v as AtemiAttackClass)
  );
}

function sanitizeTool(raw: unknown): AttackToolLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (!isSeverity(r.severity)) return null;
  if (!isAttackClass(r.attackClass)) return null;
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    attackClass: r.attackClass,
    severity: r.severity,
    target: cap(
      typeof r.target === "string" ? r.target : "unknown",
      TARGET_MAX,
    ),
    summary: cap(typeof r.summary === "string" ? r.summary : "", SUMMARY_MAX),
  };
}

function sanitizePlaybook(raw: unknown): PlaybookLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (!isSeverity(r.severity)) return null;
  const stepsArr = Array.isArray(r.steps) ? r.steps : [];
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    severity: r.severity,
    target: cap(
      typeof r.target === "string" ? r.target : "unknown",
      TARGET_MAX,
    ),
    summary: cap(typeof r.summary === "string" ? r.summary : "", SUMMARY_MAX),
    stepCount: stepsArr.length,
  };
}

// =============================================================================
// SkillsLibraryTab — /api/atemi/attack-tools
// =============================================================================

// E-A7 Phase B — 4-mode attack mode strip lives at the page-head level.
// The SkillsLibraryTab now accepts an optional `attackMode` prop so the
// shared page-head <ModeSelector> can drive the server-side severity
// allow-list filter (per YR.16 / G-065). When omitted the tab reverts
// to its V2 behavior of fetching all tools (no mode filter).
export type AtemiAttackMode = "passive" | "basic" | "advanced" | "aggressive";
const VALID_ATTACK_MODES: ReadonlySet<AtemiAttackMode> = new Set([
  "passive",
  "basic",
  "advanced",
  "aggressive",
]);

export interface SkillsLibraryTabProps {
  /**
   * Active attack mode. When set, the SkillsLibraryTab passes
   * `?mode=<m>` to `/api/atemi/attack-tools`; the route filters tools
   * via a severity allow-list per YR.16 / G-065. When undefined, the
   * pre-E-A7 behavior is preserved (no mode filter applied).
   */
  readonly attackMode?: AtemiAttackMode;
}

export function SkillsLibraryTab({ attackMode }: SkillsLibraryTabProps = {}) {
  const [tools, setTools] = useState<readonly AttackToolLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Closed-set narrow before threading into the URL so a tampered prop
  // never lands as a free-form query param.
  const safeMode: AtemiAttackMode | null =
    attackMode && VALID_ATTACK_MODES.has(attackMode) ? attackMode : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = safeMode
          ? `/api/atemi/attack-tools?mode=${encodeURIComponent(safeMode)}`
          : "/api/atemi/attack-tools";
        const res = await fetchWithAuth(url, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          tools?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Skills library unavailable");
          setTools([]);
          return;
        }
        const safe: AttackToolLite[] = [];
        for (const item of body.tools ?? []) {
          const t = sanitizeTool(item);
          if (t && safe.length < MAX_TOOLS_DISPLAYED) safe.push(t);
        }
        setTools(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setTools([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [safeMode]);

  return (
    <Panel
      title="Skills library"
      // E9.S9 — F-6-030 P2 retire: sub-line follows the registered
      // forms.md convention. Loading state uses mode 2 (present-progressive
      // verb + ellipsis); populated state uses mode 3 (count-only via
      // pluralize). Error mode is NOT a sub-line state per the convention
      // — the in-panel <wb-banner danger> below carries the error message,
      // and the sub-line falls back to count-only (with the last known
      // tool count, even if 0) so it stays a stable label.
      sub={
        loading
          ? "Fetching attack tools…"
          : pluralize(tools.length, "attack tool", "attack tools")
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="atemi-skills-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && tools.length === 0 && (
        <EmptyState
          module="atemi"
          state="empty"
          title="No attack tools loaded"
          sub="The skills library is sourced from the attack-tool registry. Reload the registry to populate this list."
          cta={{ label: "Reload registry", href: "/admin/atemi?tab=skills" }}
          testId="atemi-skills-empty"
          compact
        />
      )}
      {tools.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Atemi skills library table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Atemi skills library"
            data-testid="atemi-skills-table"
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Severity</th>
                <th>AIVSS</th>
                <th>Target</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <AttackToolRow key={t.id} tool={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// =============================================================================
// PlaybooksTab — /api/atemi/playbooks (list + locked Run CTA)
// =============================================================================

export function PlaybooksTab() {
  const [playbooks, setPlaybooks] = useState<readonly PlaybookLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const runnerRef = useRef<HTMLDivElement | null>(null);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/atemi/playbooks", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          playbooks?: readonly unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError("Playbooks unavailable");
          setPlaybooks([]);
          return;
        }
        const safe: PlaybookLite[] = [];
        for (const item of body.playbooks ?? []) {
          const p = sanitizePlaybook(item);
          if (p && safe.length < MAX_PLAYBOOKS_DISPLAYED) safe.push(p);
        }
        setPlaybooks(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setPlaybooks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runnerOptions = useMemo<readonly PlaybookOption[]>(
    () => playbooks.map((p) => ({ id: p.id, name: p.name })),
    [playbooks],
  );

  function onRowRunClick(id: string): void {
    setSelectedPlaybookId(id);
    if (runnerRef.current) {
      runnerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <Panel
      title="Playbooks"
      // E9.S9 — F-6-030 P2 retire: forms.md sub-line convention. Mode 2
      // for loading, mode 3 for populated (pluralize + middot facet for
      // the secondary "stub runner" status). Error message is rendered
      // in the body banner, not the sub-line.
      sub={
        loading
          ? "Fetching playbooks…"
          : `${pluralize(playbooks.length, "playbook", "playbooks")} · stub runner active (T-508)`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="atemi-playbooks-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      <p
        className="wb-hint"
        data-testid="atemi-playbooks-runner-hint"
        style={{ marginBottom: 10, fontSize: 11, color: "var(--fg-dim)" }}
      >
        <strong>Runner status:</strong> the run endpoint is live. Today the
        route returns synthetic per-step results from the fixture corpus — no
        live driver yet. Engine wiring is coming in a future release.
      </p>
      <div ref={runnerRef}>
        <PlaybookRunner
          playbooks={runnerOptions}
          {...(selectedPlaybookId !== null && {
            initialPlaybookId: selectedPlaybookId,
          })}
        />
      </div>
      {!loading && !error && playbooks.length === 0 && (
        <EmptyState
          module="atemi"
          state="empty"
          title="No playbooks loaded"
          sub="Seed an Atemi family to start adversarial search and populate the playbook list."
          cta={{ label: "Open Records", href: "/admin/atemi" }}
          testId="atemi-playbooks-empty"
          compact
        />
      )}
      {playbooks.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Atemi playbooks table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Atemi playbooks"
            data-testid="atemi-playbooks-table"
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Severity</th>
                <th>Target</th>
                <th>Steps</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {playbooks.map((p) => (
                <tr key={p.id} data-testid={`atemi-playbook-row-${p.id}`}>
                  <td>
                    <div>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
                      {p.summary}
                    </div>
                  </td>
                  <td>
                    <span
                      className={SEVERITY_CHIP[p.severity]}
                      aria-label={`Severity ${SEVERITY_LABEL[p.severity]}`}
                    >
                      {SEVERITY_LABEL[p.severity]}
                    </span>
                  </td>
                  <td>{p.target}</td>
                  <td>{p.stepCount}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-testid={`atemi-playbook-run-${p.id}`}
                      aria-label={`Select ${p.name} in the playbook runner`}
                      onClick={() => onRowRunClick(p.id)}
                    >
                      Select
                    </button>
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

// =============================================================================
// SessionsTab — in-session probe history
// =============================================================================

export interface SessionsTabProps {
  readonly probeHistory: readonly ProbeHistoryEntryLite[];
}

export function SessionsTab({ probeHistory }: SessionsTabProps) {
  const display = useMemo(
    () => probeHistory.slice(0, MAX_HISTORY_DISPLAYED),
    [probeHistory],
  );
  return (
    <div
      className="atemi-sessions-grid"
      data-testid="atemi-sessions-tab-grid"
      style={{
        display: "grid",
        // Atemi-PR-6 layout: 2-column above (Session recorder narrow on
        // left, Sessions probe-history wider on right), Attack log spans
        // full width below. Replaces the prior 3-Panels-stacked-with-zero-
        // gap layout that founder flagged as "touching each other".
        gridTemplateColumns: "minmax(280px, 380px) 1fr",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/*
      Atemi-PR-4 — TICKET-L-702 follow-up: SessionRecorder consumer wiring.
      Mounted side-by-side with the in-session probe-history panel because
      the recorder is the control surface that *produces* the recorded
      sessions that `AtemiAttackLogPanel` (below) renders. Start/Stop/
      Discard write directly to atemi-session-storage; the AttackLog
      re-hydrates on its next mount or refresh.
    */}
      <Panel
        title="Session recorder"
        sub="Capture an attack session for the audit trail"
      >
        <AtemiSessionRecorderPanel testId="atemi-sessions-recorder" />
      </Panel>

      <Panel
        title="Sessions"
        sub={`${probeHistory.length} in-session probe runs · durable storage coming soon`}
      >
        {display.length === 0 ? (
          <EmptyState
            module="atemi"
            state="empty"
            title="No probe runs in this session yet"
            sub="Open the Records tab to fire a probe — sessions populate as runs complete."
            cta={{
              label: "Open Records tab",
              href: "/admin/atemi?tab=records",
            }}
            testId="atemi-sessions-empty"
            compact
          />
        ) : (
          <div
            className="v2-data-scroll"
            role="region"
            aria-label="Atemi probe-session history table scroll area"
            tabIndex={0}
          >
            <table
              className="wb-table"
              aria-label="Atemi probe-session history"
              data-testid="atemi-sessions-table"
            >
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Started</th>
                  <th>Skipped</th>
                  <th>Errors</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {display.map((h) => (
                  <tr key={h.ts} data-testid={`atemi-session-row-${h.ts}`}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                      {h.ts}
                    </td>
                    <td>
                      <span className="wb-badge ok">{h.started}</span>
                    </td>
                    <td>
                      <span className="wb-badge muted">{h.skipped}</span>
                    </td>
                    <td>
                      <span
                        className={`wb-badge ${h.errors > 0 ? "alert" : "muted"}`}
                      >
                        {h.errors}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{h.durationMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/*
      Atemi-PR-1 — TICKET-L-702 consumer wiring for the AttackLog
      design primitive. Reads recorded sessions from
      `atemi-session-storage.ts`, flattens events into the closed-
      enum AttackLogEntry[] shape, mounts the primitive. Spans both
      grid columns so the per-attack table has full horizontal room —
      session-recorder + in-session probe-history sit above in the
      2-col row.
    */}
      <div style={{ gridColumn: "1 / -1" }}>
        <Panel
          title="Attack log"
          sub="Per-attack history retained in this browser"
        >
          <AtemiAttackLogPanel testId="atemi-sessions-attack-log" />
        </Panel>
      </div>
    </div>
  );
}

// =============================================================================
// ConceptReconTab — TICKET-T-509 graduation (was: analyze-disabled stub).
// Mounts <ConceptReconPanel> which posts to /api/atemi/concept-recon.
// =============================================================================

export function ConceptReconTab() {
  return (
    <Panel
      title="Concept recon"
      sub="Analyze a concept with the preview engine"
    >
      <ConceptReconPanel />
    </Panel>
  );
}
