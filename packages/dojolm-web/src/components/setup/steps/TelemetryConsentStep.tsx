// SPDX-License-Identifier: Apache-2.0
/**
 * File: TelemetryConsentStep.tsx
 * Purpose: Step 5 — Data Sharing & Telemetry disclosure + acknowledgement
 *          (E6.S3 / F-8-006).
 *
 * Legal driver (revised per Decision Log D-12, 2026-06-16 — see
 * project_business_model.md and /legal/privacy §5):
 *   - The research corpus is anonymised (k-anonymity + PII sanitiser) before
 *     use, so it is not personal data and GDPR Art. 6 does not apply to it.
 *   - The thin per-install envelope rides legitimate interests
 *     (GDPR Art. 6(1)(f)) with a free right to object (Art. 21). Telemetry is
 *     NOT mandatory and NOT a condition of using the community edition.
 *   - GDPR Art. 13/14 — this step is the transparency notice for that
 *     processing; the operator acknowledges the disclosure (it is not a
 *     consent-to-mandatory-processing gate).
 *   - ePrivacy Art. 5(3) / ICO PECR — strictly-necessary storage only.
 *   - CCPA 1798.135 — opt-out / disclosure parity for US operators.
 *
 * FOUNDER-APPROVED-2026-07-05 (the operator) — F-QA-018: the visible D-12 wording
 * below is founder-approved for the OSS release (external counsel ratification
 * waived); it must stay consistent with /legal/privacy. The admin-gate coupling
 * (see showAdminGateBanner and app/(shell)/admin/layout.tsx) still requires this
 * acknowledgement before the console unlocks — D-12 says the console should NOT
 * be gated on telemetry; removing that gate is a separate, DEFERRED-BEHAVIOURAL
 * post-launch item (not a counsel/legal blocker), out of scope for this pass.
 *
 * Disclosure pieces required by the spec:
 *   1. Plain-language description of what telemetry collects.
 *   2. Link to /legal/privacy.
 *   3. Build-channel disclosure (cloud vs self-host).
 *   4. Acknowledgement checkbox.
 *
 * Accessibility:
 *   - WCAG 4.1.3 (Status Messages): submission errors render in a
 *     `role="alert"` banner that screen readers announce immediately.
 *   - WCAG 3.3.2 (Labels or Instructions): every form control has a
 *     visible label; the privacy link uses descriptive anchor text;
 *     the submit button is disabled until the checkbox is ticked so the
 *     primary action's affordance matches its state.
 *
 * Design tokens: uses `.wb-field`, `.wb-input`, `.wb-banner`, `.btn`,
 * `.btn-primary`, `.panel`, `var(--torii-*)`, `var(--paper-*)` — no
 * inline hex / Tailwind utility colours. Matches the rest of the
 * Yamabushi-audited setup steps.
 */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldAlert, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import {
  getBuildChannel,
  getBuildChannelLabel,
  getBuildChannelDisclosure,
} from "@/lib/build-channel";
import { readCsrfToken } from "@/lib/csrf-cookie";
import type { BuildChannel } from "@/lib/db/types";

interface TelemetryConsentStepProps {
  /**
   * Fires after the server-side ack write succeeds. The wizard then
   * advances to the Review step. The ISO-8601 timestamp the server
   * stamped on the row is forwarded so Review can display it.
   */
  onComplete: (ackAt: string, channel: BuildChannel) => void;
  onBack?: () => void;

  /**
   * Optional banner shown when the operator landed on this step after a
   * /admin/* gate redirect (`?reason=telemetry-consent-required`). The
   * banner spells out, in plain language, why the navigation snapped
   * back to /setup.
   */
  showAdminGateBanner?: boolean;
}

const TELEMETRY_PURPOSE_BULLETS: readonly string[] = [
  "Adversarial probe outcomes (which test cases ran, which models scored what).",
  "Model registration metadata (provider name, model id, no API keys).",
  "Anonymised platform usage signals (page navigations, error rates).",
  "No prompts, no model responses, no PII from your operators or members.",
] as const;

export function TelemetryConsentStep({
  onComplete,
  onBack,
  showAdminGateBanner = false,
}: TelemetryConsentStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // The build channel is read at module-eval time on the client; the server
  // re-checks at ack time via /api/setup/telemetry-consent. A tampered
  // client cannot persist a different channel than the one shipped.
  const channel = getBuildChannel();
  const channelLabel = getBuildChannelLabel(channel);
  const channelDisclosure = getBuildChannelDisclosure(channel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!acknowledged) {
      setError("Please tick the acknowledgement checkbox to continue.");
      return;
    }

    setSubmitting(true);

    try {
      // CSRF: the tpi_csrf cookie is set by the prior wizard step's
      // /api/setup/admin handshake; withAuth requires the matching
      // x-csrf-token header on cookie-auth POSTs (route-guard.ts).
      const csrf = readCsrfToken();
      const res = await fetch("/api/setup/telemetry-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          acknowledged: true,
          buildChannel: channel,
        }),
      });

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Failed to record acknowledgement" }));
        setError(data.error ?? "Failed to record acknowledgement");
        setSubmitting(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const ackAt =
        typeof data.acknowledged_telemetry_at === "string"
          ? data.acknowledged_telemetry_at
          : new Date().toISOString();
      onComplete(ackAt, channel);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section
      className="panel"
      aria-labelledby="setup-telemetry-title"
      data-testid="setup-telemetry-consent-step"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 5 of 6</div>
        <div
          className="setup-step-icon"
          aria-hidden="true"
          style={{
            margin: "0 auto 10px",
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(var(--torii-rgb), 0.12)",
            border: "1px solid rgba(var(--torii-rgb), 0.4)",
          }}
        >
          <ShieldAlert
            className="h-6 w-6"
            style={{ color: "var(--torii-deep)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-telemetry-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--paper-ink)",
            letterSpacing: "-0.005em",
          }}
        >
          Telemetry consent
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            color: "var(--paper-mute)",
            fontSize: 12.5,
          }}
        >
          Acknowledge what telemetry collects and where it goes.
        </p>
      </header>

      {/* DEFERRED-BEHAVIOURAL (post-launch; not a counsel/legal blocker) — F-QA-018:
          under D-12 the admin console should NOT be gated on this acknowledgement.
          The gate still exists (app/(shell)/admin/layout.tsx) pending a separate
          behavioural fire; until then this banner explains why the operator was
          routed back here, without the prior "locked / mandatory" framing. */}
      {showAdminGateBanner && (
        <div
          role="status"
          className="wb-banner warn"
          data-testid="setup-telemetry-admin-gate-banner"
          style={{ marginBottom: 14 }}
        >
          You reached this step from the admin console. Review the telemetry
          disclosure below and acknowledge it to continue.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {error && (
          <div
            role="alert"
            className="wb-banner danger"
            data-testid="setup-telemetry-error"
          >
            <AlertCircle
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginRight: "var(--space-2)", verticalAlign: "middle" }}
            />
            {error}
          </div>
        )}

        <section
          aria-labelledby="setup-telemetry-purpose-heading"
          style={{
            padding: 14,
            borderRadius: "var(--r-md)",
            border: "1px solid var(--b-1)",
            background: "rgba(var(--white-rgb), 0.02)",
          }}
        >
          <h4
            id="setup-telemetry-purpose-heading"
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            What gets collected
          </h4>
          <ul
            style={{
              margin: "8px 0 0",
              paddingLeft: 18,
              fontSize: 12,
              color: "var(--fg-dim)",
              lineHeight: 1.6,
            }}
          >
            {TELEMETRY_PURPOSE_BULLETS.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: "var(--fg-dim)",
              lineHeight: 1.6,
            }}
          >
            Aggregated, de-identified telemetry funds the free, Apache-2.0
            community edition and powers open industry safety benchmarks. The
            corpus is anonymised (a k-anonymity threshold plus an upload-side
            PII sanitiser) before use, so it does not identify you. We process
            it under our legitimate interest (GDPR Art. 6(1)(f)), and you can
            object at any time, at no cost — the community edition keeps working
            either way. Telemetry is not a condition of use. Full details in our{" "}
            <Link
              href="/legal/privacy"
              data-testid="setup-telemetry-privacy-link"
              style={{
                color: "var(--torii-hi)",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Privacy policy
              <ExternalLink
                className="h-3 w-3"
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  marginLeft: "var(--space-1)",
                  verticalAlign: "baseline",
                }}
              />
            </Link>
            .
          </p>
        </section>

        <section
          aria-labelledby="setup-telemetry-channel-heading"
          data-testid="setup-telemetry-channel-block"
          style={{
            padding: 14,
            borderRadius: "var(--r-md)",
            border: "1px solid var(--b-1)",
            background: "rgba(var(--white-rgb), 0.02)",
          }}
        >
          <h4
            id="setup-telemetry-channel-heading"
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            Build channel
          </h4>
          <p
            data-testid="setup-telemetry-channel-label"
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--fg)",
              fontFamily: "var(--mono)",
            }}
          >
            {channelLabel}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--fg-dim)",
              lineHeight: 1.6,
            }}
          >
            {channelDisclosure}
          </p>
        </section>

        <div
          className="wb-field"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "var(--space-3)",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--b-1)",
          }}
        >
          <input
            id="setup-telemetry-ack"
            data-testid="setup-telemetry-ack"
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={submitting}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <label
            className="wb-label"
            htmlFor="setup-telemetry-ack"
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--fg)",
            }}
          >
            I have read the telemetry disclosure above and the{" "}
            <Link
              href="/legal/privacy"
              style={{
                color: "var(--torii-hi)",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Privacy policy
            </Link>
            , and I understand I can object to telemetry at any time, at no
            cost.
          </label>
        </div>

        <div className="setup-step-actions">
          {onBack && (
            <button
              type="button"
              className="setup-step-back"
              onClick={onBack}
              disabled={submitting}
            >
              Back
            </button>
          )}
          <span className="setup-step-actions-spacer" aria-hidden="true" />
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="setup-telemetry-submit"
            disabled={submitting || !acknowledged}
          >
            {submitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                  style={{ marginRight: "var(--space-2)" }}
                />
                Recording acknowledgement…
              </>
            ) : (
              "Acknowledge and continue"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
