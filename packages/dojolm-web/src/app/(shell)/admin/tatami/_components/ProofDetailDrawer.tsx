// SPDX-License-Identifier: Apache-2.0
/**
 * ProofDetailDrawer — single-proof detail viewer for /admin/tatami.
 *
 * Mirrors validation/_panels#ReportDrawer: a fixed-overlay dialog whose body is
 * rendered inline (NOT a Radix sheet). Loading / error+retry are explicit; the fetch
 * is cancel-on-unmount so a fast close can't write stale state.
 *
 * S1 / TATAMI-PROOF-DETAIL-VIEW — fetches GET /api/tatami/proofs/[id]?view=proof. The
 * /admin/* surface is admin-gated, so the reader is always elevated and the route
 * returns `{ proofId, proof }` — the FULL stored proof (capturedBy, input/output
 * hashes, retention/legal-hold, preview count, the B7 `hashLink`). `toDetail` falls
 * back to the customer-safe `{ receipt }` shape for any non-elevated/edge response
 * (defensive — that branch shows `generatedAt` + the receipt's `chain[0]` anchor in
 * place of the proof's internal rows). Either way the B7 self-anchor (seq / prevHash /
 * contentHash, truncated with the full value in the title tooltip) is surfaced from
 * `proof.hashLink` or `receipt.chain[0]`. Neither shape carries a raw payload.
 *
 * Evidence-quality (Epic 3) — maturity / trust state+tier / replay-safety /
 * reproducibility render as the `TatamiProofBadges` chip cluster (design/tatami)
 * instead of plain KV rows. Both response shapes serialise all four axes, so all
 * four badges show; the aggregate renders only fields that are present, so a sparse
 * response degrades to fewer badges and never invents one.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { KV } from "@/design";
import {
  TatamiProofBadges,
  TatamiReceiptActions,
  type TatamiBadgeFields,
} from "@/design/tatami";
import type {
  TatamiMaturity,
  TatamiReplaySafety,
  TatamiReproducibility,
  TatamiTrustState,
  TatamiTrustTier,
} from "@/lib/tatami/types";
import {
  caseStatusChipClass,
  humanizeReplaySafetyReason,
  severityLabel,
  shortId,
} from "../_lib";
import { ExplainPanel } from "./ExplainPanel";
import { Timestamp } from "./Timestamp";

/** Tab-focusable descendants, in document order (skips disabled / tabindex=-1). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** B7 hash link — a proof's single self-anchor (`hashLink`) or a receipt chain entry. */
interface DetailHashLink {
  readonly seq: number;
  readonly prevHash: string;
  readonly contentHash: string;
}

/**
 * Narrow a loosely-typed server string to a known Tatami enum member, returning
 * `undefined` for anything unrecognised. The badges read REAL persisted enums, so a
 * value the schema does not define is DROPPED (the badge simply does not render)
 * rather than crashing the closed `Record` lookup inside the badge components. The
 * `Record<T, true>` literal forces this list to stay exhaustive — adding a member to
 * the canonical enum in `lib/tatami/types` fails the build here until it is listed.
 */
function memberOf<T extends string>(keys: Record<T, true>) {
  return (v: unknown): T | undefined =>
    typeof v === "string" && Object.prototype.hasOwnProperty.call(keys, v)
      ? (v as T)
      : undefined;
}
const toMaturity = memberOf<TatamiMaturity>({
  live: true,
  synthetic: true,
  fixture: true,
  stub: true,
  replay: true,
});
const toTrustState = memberOf<TatamiTrustState>({
  draft: true,
  sealed: true,
  verified: true,
  partially_verified: true,
  redacted: true,
  exported: true,
  challenged: true,
  superseded: true,
  broken_chain: true,
});
const toTrustTier = memberOf<TatamiTrustTier>({
  local: true,
  hashed: true,
  worm: true,
  signed: true,
  attested: true,
});
const toReplaySafety = memberOf<TatamiReplaySafety>({
  replayable: true,
  replayable_redacted: true,
  not_replayable: true,
});
const toReproducibility = memberOf<TatamiReproducibility>({
  deterministic: true,
  "stochastic-characterized": true,
  "stochastic-single": true,
  "non-reproducible": true,
});

/**
 * Narrow whichever shape the route returned into the badge fields. BOTH the full
 * proof (`?view=proof`) AND the customer-safe receipt serialise all five axes —
 * `maturity` / `trustState` / `trustTier` / `replaySafety` / `reproducibility` are
 * real persisted fields on `TatamiProof` and are carried verbatim into the receipt
 * (see lib/tatami/receipt.ts). `trustTier` folds into the trust badge as a tooltip
 * qualifier rather than its own chip, so the five stored axes surface as FOUR visible
 * badges (see {@link TatamiBadgeFields}) — and both responses render all four honestly.
 * `TatamiProofBadges` renders a badge ONLY for a field that is present, so a response
 * genuinely missing one degrades to fewer badges, never a fabricated one.
 */
function toBadgeFields(raw: {
  readonly maturity?: unknown;
  readonly trustState?: unknown;
  readonly trustTier?: unknown;
  readonly replaySafety?: unknown;
  readonly reproducibility?: unknown;
}): TatamiBadgeFields {
  return {
    maturity: toMaturity(raw.maturity),
    trustState: toTrustState(raw.trustState),
    trustTier: toTrustTier(raw.trustTier),
    replaySafety: toReplaySafety(raw.replaySafety),
    reproducibility: toReproducibility(raw.reproducibility),
  };
}

/** Whether the cluster has at least one renderable badge (trustTier alone is only a
 *  qualifier on the trust badge, so it does not count). */
function anyBadgePresent(b: TatamiBadgeFields | undefined): boolean {
  return (
    b != null &&
    (b.maturity != null ||
      b.trustState != null ||
      b.replaySafety != null ||
      b.reproducibility != null)
  );
}

/**
 * Unified detail the drawer renders, sourced from EITHER the full stored proof
 * (`?view=proof`, elevated readers — S1 / TATAMI-PROOF-DETAIL-VIEW) OR, fail-closed,
 * the customer-safe receipt. Internal-only fields populate only for a proof;
 * `generatedAt` only for a receipt. `/admin/*` is admin-gated, so the in-page reader
 * is always elevated and normally sees the proof; the receipt branch is the defensive
 * fallback for any non-elevated/edge response.
 */
interface ProofDetailView {
  readonly kind: "proof" | "receipt";
  readonly proofId?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly source?: { readonly module?: string; readonly runId?: string };
  /** Evidence-quality enums, narrowed for the badge cluster (replaces the former
   *  plain Maturity / Trust state / Trust tier KV rows; carried by both shapes). */
  readonly badges?: TatamiBadgeFields;
  /** P2.1 — reason codes behind the replay-safety verdict, for the muted "why"
   *  line under the badges. Proof branch only (the receipt fallback omits them). */
  readonly replaySafetyReasons?: readonly string[];
  readonly severity?: string;
  readonly verdict?: string;
  // proof-only (internal)
  readonly capturedBy?: string;
  readonly inputHash?: string;
  readonly outputHash?: string;
  readonly retentionClass?: string;
  readonly legalHold?: boolean;
  readonly createdAt?: string;
  readonly previewCount?: number;
  // receipt-only
  readonly generatedAt?: string;
  // B7 self-anchor: proof.hashLink OR receipt.chain[0]
  readonly anchor?: DetailHashLink;
}

/** Raw server shapes (loosely typed — the drawer renders defensively). */
interface RawProof {
  readonly id?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly source?: { readonly module?: string; readonly runId?: string };
  readonly trustState?: string;
  readonly trustTier?: string;
  readonly maturity?: string;
  readonly replaySafety?: string;
  readonly replaySafetyReasons?: readonly unknown[];
  readonly reproducibility?: string;
  readonly severity?: string;
  readonly verdict?: string;
  readonly capturedBy?: string;
  readonly inputHash?: string;
  readonly outputHash?: string;
  readonly retentionClass?: string;
  readonly legalHold?: boolean;
  readonly createdAt?: string;
  readonly previews?: readonly unknown[];
  readonly hashLink?: DetailHashLink;
}
interface RawReceipt {
  readonly proofId?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly source?: { readonly module?: string; readonly runId?: string };
  readonly trustState?: string;
  readonly trustTier?: string;
  readonly maturity?: string;
  readonly replaySafety?: string;
  readonly reproducibility?: string;
  readonly severity?: string;
  readonly generatedAt?: string;
  readonly chain?: readonly DetailHashLink[];
}

/** Normalise the `?view=proof` response (full proof) or its receipt fallback. */
function toDetail(body: {
  proof?: RawProof;
  receipt?: RawReceipt;
}): ProofDetailView | null {
  const { proof, receipt } = body;
  if (proof) {
    return {
      kind: "proof",
      proofId: proof.id,
      title: proof.title,
      summary: proof.summary,
      source: proof.source,
      badges: toBadgeFields(proof),
      replaySafetyReasons: Array.isArray(proof.replaySafetyReasons)
        ? proof.replaySafetyReasons
            .filter((r): r is string => typeof r === "string")
            .slice(0, 16)
        : undefined,
      severity: proof.severity,
      verdict: proof.verdict,
      capturedBy: proof.capturedBy,
      inputHash: proof.inputHash,
      outputHash: proof.outputHash,
      retentionClass: proof.retentionClass,
      legalHold: proof.legalHold,
      createdAt: proof.createdAt,
      previewCount: Array.isArray(proof.previews)
        ? proof.previews.length
        : undefined,
      anchor: proof.hashLink,
    };
  }
  if (receipt) {
    return {
      kind: "receipt",
      proofId: receipt.proofId,
      title: receipt.title,
      summary: receipt.summary,
      source: receipt.source,
      badges: toBadgeFields(receipt),
      severity: receipt.severity,
      generatedAt: receipt.generatedAt,
      anchor: receipt.chain?.[0],
    };
  }
  return null;
}

/** S4 — a case (summary) that references this proof, for the reverse-link list. */
interface RelatedCase {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

function truncateHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
}

export function ProofDetailDrawer({
  proofId,
  onClose,
}: {
  proofId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ProofDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // S4 — cases that reference this proof (reverse link). null = not loaded yet.
  const [cases, setCases] = useState<readonly RelatedCase[] | null>(null);
  // Bump to re-run the detail fetch after an error (retry affordance).
  const [attempt, setAttempt] = useState(0);
  // The dialog panel (focus-trap scope) + its close button (initial focus).
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // WCAG 2.4.3 (Focus Order) — move focus INTO the dialog on open and RESTORE
  // it to the triggering control on close. Without this the keyboard caret
  // stays on the now-obscured page behind the modal overlay. Runs once per
  // mount: the close button always exists (it is rendered in every state), so
  // it is the stable initial focus target. The cleanup restores focus to
  // whatever was focused when the drawer opened (the row's "View" button).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  // WCAG 2.1.2 (No Keyboard Trap, inverse) + 2.4.3 — Escape closes; Tab is
  // trapped within the dialog so focus cannot escape to the inert page behind
  // the overlay. Focusables are re-queried per keystroke because the set
  // changes with state (loading → receipt rows / error+Retry).
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (root === null) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // S1 — request the full proof (?view=proof). The admin-gated surface means the
        // reader is always elevated and gets `{ proof }`; toDetail falls back to the
        // receipt for any non-elevated/edge response (defensive).
        const res = await fetch(`/api/tatami/proofs/${proofId}?view=proof`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError("Detail unavailable");
          setDetail(null);
          return;
        }
        setDetail(toDetail(body as { proof?: RawProof; receipt?: RawReceipt }));
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Network error");
        setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proofId, attempt]);

  // S4 / TATAMI-PROOF-REVERSE-CASE-LINK — which cases reference this proof. Read-time
  // reverse nav (case→proof is the source of truth; the proof is never mutated). This
  // is SUPPLEMENTARY, so a failure just hides the section — it never blocks the proof
  // detail above. Cancel-on-unmount so a fast close can't write stale state.
  useEffect(() => {
    let cancelled = false;
    setCases(null);
    void (async () => {
      try {
        const qs = new URLSearchParams({ proofId, limit: "50" });
        const res = await fetch(`/api/tatami/cases?${qs.toString()}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setCases([]);
          return;
        }
        const list = (body as { cases?: readonly RelatedCase[] }).cases ?? [];
        setCases(
          list.map((c) => ({ id: c.id, title: c.title, status: c.status })),
        );
      } catch {
        if (!cancelled) setCases([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proofId, attempt]);

  const anchor = detail?.anchor;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tatami-drawer-heading"
      data-testid="tatami-proof-drawer"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          padding: "var(--space-5)",
          width: 480,
          maxWidth: "90vw",
          borderLeft: "1px solid var(--b-1)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3)",
          }}
        >
          <h2 id="tatami-drawer-heading" style={{ marginTop: 0, fontSize: 16 }}>
            Proof {shortId(proofId)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="btn"
            data-testid="tatami-proof-drawer-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading && (
          <p
            role="status"
            aria-live="polite"
            style={{ fontSize: 12.5, color: "var(--fg-dim)" }}
          >
            Fetching proof detail…
          </p>
        )}

        {error && (
          <div
            role="alert"
            data-testid="tatami-proof-drawer-error"
            style={{ fontSize: 12.5, color: "var(--torii-hi)" }}
          >
            {error}
            <button
              type="button"
              className="btn sm"
              style={{ marginLeft: "var(--space-2)" }}
              data-testid="tatami-proof-drawer-retry"
              onClick={() => setAttempt((a) => a + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          detail?.badges &&
          anyBadgePresent(detail.badges) && (
            // Evidence-quality badges (maturity · trust state/tier · replay-safety ·
            // reproducibility) replace the former plain KV rows. Each chip reads a REAL
            // persisted enum; absent axes simply don't render (honest, never fabricated).
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div
                data-testid="tatami-proof-badges"
                role="group"
                aria-label="Evidence quality"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                }}
              >
                <TatamiProofBadges proof={detail.badges} />
              </div>
              {/* P2.1 — the muted "why" behind a not-replayable / replayable-redacted
                verdict. Renders only when reason codes are present (a replayable proof
                carries none); humanised, with an unknown code shown verbatim. */}
              {detail.replaySafetyReasons &&
                detail.replaySafetyReasons.length > 0 && (
                  // No aria-label: it would REPLACE the read-out text. The self-descriptive
                  // reason copy is the accessible name; the badge group above carries the
                  // "Evidence quality" context.
                  <p
                    data-testid="tatami-replay-why"
                    style={{
                      margin: "var(--space-2) 0 0",
                      fontSize: 12,
                      color: "var(--fg-dim)",
                    }}
                  >
                    {detail.replaySafetyReasons
                      .map(humanizeReplaySafetyReason)
                      .join(" · ")}
                  </p>
                )}
            </div>
          )}

        {!loading && !error && detail && (
          <KV
            ariaLabel="Proof detail"
            rows={[
              {
                k: "Proof ID",
                v: <span className="mono">{detail.proofId ?? proofId}</span>,
              },
              { k: "Title", v: detail.title ?? "—" },
              { k: "Summary", v: detail.summary ?? "—" },
              {
                k: "Module",
                v: <span className="mono">{detail.source?.module ?? "—"}</span>,
              },
              {
                k: "Run ID",
                v: <span className="mono">{detail.source?.runId ?? "—"}</span>,
              },
              { k: "Severity", v: severityLabel(detail.severity) },
              // S1 — internal-only fields, shown only when the full proof is served
              // (elevated reader). The receipt branch shows `Generated` instead.
              ...(detail.kind === "proof"
                ? [
                    { k: "Verdict", v: detail.verdict ?? "—" },
                    // m-4 — the hashed owner is a 64-char digest; truncate it head…tail
                    // like the hash rows beside it (full value in `title`) so it no longer
                    // wraps and visually dominates the panel.
                    {
                      k: "Captured by",
                      v: (
                        <span
                          className="mono"
                          data-testid="tatami-proof-captured-by"
                          title={detail.capturedBy}
                        >
                          {detail.capturedBy
                            ? truncateHash(detail.capturedBy)
                            : "—"}
                        </span>
                      ),
                    },
                    {
                      k: "Input hash",
                      v: (
                        <span className="mono" title={detail.inputHash}>
                          {detail.inputHash
                            ? truncateHash(detail.inputHash)
                            : "—"}
                        </span>
                      ),
                    },
                    {
                      k: "Output hash",
                      v: (
                        <span className="mono" title={detail.outputHash}>
                          {detail.outputHash
                            ? truncateHash(detail.outputHash)
                            : "—"}
                        </span>
                      ),
                    },
                    { k: "Retention", v: detail.retentionClass ?? "—" },
                    { k: "Legal hold", v: detail.legalHold ? "yes" : "no" },
                    {
                      k: "Previews",
                      v:
                        detail.previewCount !== undefined
                          ? String(detail.previewCount)
                          : "—",
                    },
                    {
                      k: "Captured at",
                      v: <Timestamp iso={detail.createdAt} className="mono" />,
                    },
                  ]
                : [
                    {
                      k: "Generated",
                      v: (
                        <Timestamp iso={detail.generatedAt} className="mono" />
                      ),
                    },
                  ]),
              {
                k: "Content hash",
                v: anchor ? (
                  <span
                    className="mono"
                    title={anchor.contentHash}
                    data-testid="tatami-proof-content-hash"
                  >
                    {truncateHash(anchor.contentHash)}
                  </span>
                ) : (
                  "—"
                ),
              },
              { k: "Seq", v: anchor ? String(anchor.seq) : "—" },
              {
                k: "Prev hash",
                v: (
                  <span className="mono" style={{ wordBreak: "break-all" }}>
                    {anchor?.prevHash ?? "—"}
                  </span>
                ),
              },
            ]}
          />
        )}

        {/* P0.2 / DoD#7 — Copy / Download the self-verifiable customer-safe receipt.
            Renders once the proof detail is loaded; the actions re-fetch the receipt
            from the `?format=` endpoint on demand (server renders MD/JSON). */}
        {!loading && !error && detail && (
          <TatamiReceiptActions proofId={detail.proofId ?? proofId} />
        )}

        {/* P2.4 — evidence-grounded Explain panel (Kaisetsu). Posts only on submit;
            grounds every answer in this proof + the cases it is filed under
            (`cases` is null while loading / [] on a failed supplementary fetch, so
            the optional chain degrades safely). */}
        {!loading && !error && detail && (
          <ExplainPanel
            proofId={detail.proofId ?? proofId}
            caseIds={cases?.map((c) => c.id) ?? []}
          />
        )}

        {/* S4 — reverse link: the cases this proof is filed under. */}
        {!loading && !error && cases !== null && (
          <div
            style={{ marginTop: "var(--space-4)" }}
            data-testid="tatami-proof-cases"
          >
            <h3 style={{ fontSize: 13, margin: "0 0 var(--space-2)" }}>
              Filed under cases ({cases.length})
            </h3>
            {cases.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                Not filed under any case.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {cases.map((c) => (
                  <li
                    key={c.id}
                    data-testid={`tatami-proof-case-${c.id}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <span className={caseStatusChipClass(c.status)}>
                      <span className="dot" />
                      {c.status}
                    </span>
                    <span style={{ flex: 1 }}>{c.title}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--fg-dim)" }}
                      title={c.id}
                    >
                      {shortId(c.id)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
