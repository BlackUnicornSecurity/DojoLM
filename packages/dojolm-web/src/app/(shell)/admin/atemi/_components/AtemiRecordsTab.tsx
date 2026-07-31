// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/atemi Records-tab body.
 *
 * P2d (v2-skin-surface-audit live-practice D1/D2) — restored to the wave-g2
 * "Live Practice v2" reference: a two-column band of "Probe records" (the
 * queue / 録 first-run empty state, with the view's single torii-red
 * "Record a probe pass" primary in its header) beside the "How a probe
 * pass works" explainer. The prior Filters / ToS-Attestation / Summary /
 * Probe-History / Probe-Execution rail + the stray red "Production warning"
 * banner are retired — the key-storage caveat now lives only in the neutral
 * `details` disclosure the design ships.
 */

"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/design/shell/Panel";
import { Steps, type StepsItem } from "@/design/shell/Steps";
import { SystemBanner } from "@/design/system/SystemBanner";
import type { FleetSummary, StateFilter, TosRecord } from "./types";
import { stateBadgeClass } from "./atemi-helpers";

// "How a probe pass works" — corpus copy, verbatim (wave-g2/Live Practice v2).
const PROBE_PASS_STEPS: readonly StepsItem[] = [
  {
    title: "Register a target",
    sub: "Name the vendor and target model you're allowed to test.",
  },
  {
    title: "Attest before probing",
    sub: "Sign the terms-of-service attestation for that target.",
  },
  {
    title: "Record the pass",
    sub: "Fire a fleet-wide probe; results and breaches land back here.",
  },
];

interface AtemiRecordsTabProps {
  readonly records: readonly TosRecord[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly summary: FleetSummary;
  readonly hasPendingAttestation: boolean;
  readonly probeBusy: boolean;
  readonly probeError: string | null;
  readonly onRetry?: () => void;
  // P2d D2 — the designed red primary is the Probe-records header action.
  readonly onRecordProbe: () => void;
  readonly recordDisabled: boolean;
  readonly recordAriaLabel: string;
}

export function AtemiRecordsTab({
  records,
  loading,
  error,
  summary,
  hasPendingAttestation,
  probeBusy,
  probeError,
  onRetry,
  onRecordProbe,
  recordDisabled,
  recordAriaLabel,
}: AtemiRecordsTabProps) {
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");

  const vendors = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) set.add(r.vendor);
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (vendorFilter !== "all" && r.vendor !== vendorFilter) return false;
      if (stateFilter !== "all" && r.state !== stateFilter) return false;
      return true;
    });
  }, [records, vendorFilter, stateFilter]);

  return (
    <section
      id="atemi-panel-records"
      role="tabpanel"
      aria-labelledby="atemi-panel-records-trigger"
      tabIndex={0}
      data-testid="atemi-tab-body-records"
    >
      <div style={{ padding: "12px 24px 0" }}>
        <SystemBanner
          active={hasPendingAttestation}
          tone="warn"
          title="Pending attestations"
          testId="pending-attestation-banner"
        >
          {summary.pending} tuple{summary.pending === 1 ? "" : "s"} awaiting
          operator signature. Complete attestation via the signed-attestation
          CLI before probing those targets.
        </SystemBanner>
      </div>

      <h2 className="sr-only">Atemi records workbench</h2>

      <div style={{ padding: "0 24px 12px" }}>
        <div className="g2-wide">
          <Panel
            headingLevel={3}
            title="Probe records"
            sub="Registered vendor · target pairs"
            meta={
              <span className="end">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onRecordProbe}
                  disabled={recordDisabled}
                  data-testid="atemi-record-button"
                  aria-label={recordAriaLabel}
                >
                  {probeBusy ? "Recording…" : "Record a probe pass"}
                </button>
              </span>
            }
          >
            {/* P2d D2 — probe failures surface here (the retired Probe-
                execution panel used to own this banner). */}
            <SystemBanner
              active={probeError !== null}
              tone="danger"
              title="Probe failed"
              testId="atemi-probe-error"
            >
              {probeError ?? ""}
            </SystemBanner>

            <div className="filters">
              <div className="wb-field" data-testid="atemi-vendor-filter-field">
                <label htmlFor="atemi-vendor-filter">Vendor</label>
                <select
                  id="atemi-vendor-filter"
                  data-testid="atemi-vendor-filter"
                  className="wb-select"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  disabled={records.length === 0}
                >
                  <option value="all">All vendors</option>
                  {vendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="wb-field">
                <label htmlFor="atemi-state-filter">State</label>
                <select
                  id="atemi-state-filter"
                  data-testid="atemi-state-filter"
                  className="wb-select"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value as StateFilter)}
                >
                  <option value="all">All states</option>
                  <option value="active">Active</option>
                  <option value="attested">Attested</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {loading && (
              <p role="status" style={{ marginTop: 12 }}>
                Fetching attestations…
              </p>
            )}
            {error && (
              <div
                role="alert"
                data-testid="atemi-error"
                className="wb-banner danger"
                style={{ marginTop: 12 }}
              >
                {error}
                {onRetry && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={onRetry}
                    data-testid="atemi-error-retry"
                    aria-label="Retry loading the attestation records"
                    style={{ marginLeft: "var(--space-2)" }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {!loading && !error && records.length === 0 && (
              <div className="empty" data-testid="atemi-empty" style={{ marginTop: 8 }}>
                <div className="kj" lang="ja" aria-hidden="true">
                  録
                </div>
                <h4>No targets registered yet</h4>
                <p>
                  A record is a vendor · target pair you can attest and probe.
                  Register one, then record a probe pass against it.
                </p>
                <div className="links">
                  {/* ponytail: registration is a signed-attestation-CLI
                      operation — no in-UI write path exists, so the affordance
                      is present-but-disabled (honest) rather than a dead
                      click. The title names where registration actually runs. */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    data-testid="atemi-register-target"
                    disabled
                    title="Registration runs through the signed-attestation CLI"
                    aria-label="Register a target (via the signed-attestation CLI)"
                  >
                    Register a target
                  </button>
                </div>
              </div>
            )}
            {!loading && !error && records.length > 0 && filtered.length === 0 && (
              <p
                data-testid="atemi-filter-empty"
                className="wb-hint"
                style={{ marginTop: 12 }}
              >
                No records match the current filters.
              </p>
            )}
            {!loading && !error && filtered.length > 0 && (
              <table
                className="wb-table"
                aria-label="ToS attestation records"
                data-testid="atemi-records-table"
                style={{ marginTop: 12 }}
              >
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Target ID</th>
                    <th>State</th>
                    <th>Operator</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.vendor}:${r.targetId}`}>
                      <td>{r.vendor}</td>
                      <td>{r.targetId}</td>
                      <td>
                        <span className={stateBadgeClass(r.state)}>
                          {r.state}
                        </span>
                      </td>
                      <td>{r.operatorId ?? "—"}</td>
                      <td>{r.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {/* P2c/P2d — the designed "How a probe pass works" explainer heads
              the Records right column (corpus wave-g2/Live Practice v2). */}
          <Panel headingLevel={3} title="How a probe pass works">
            <div data-testid="atemi-probe-pass-steps">
              <Steps items={PROBE_PASS_STEPS} numbered={false} />
            </div>
            <details
              className="f-more"
              style={{ marginTop: 14 }}
              data-testid="atemi-key-storage-note"
            >
              <summary>Key storage &amp; production targets</summary>
              <p>
                Dev mode keeps per-target keys in memory only — they&apos;re
                lost on restart. Configure persistent key storage before
                probing a production target. Attestation state changes (attest
                · activate · revoke) are signed operations, not toggles.
              </p>
            </details>
          </Panel>
        </div>
      </div>
    </section>
  );
}
