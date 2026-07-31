// SPDX-License-Identifier: Apache-2.0
/**
 * File: /app/setup/page.tsx
 * Purpose: First-startup setup wizard entry point
 * Story: Setup Wizard
 *
 * E6.S3 / F-8-006 — the wizard now also handles the post-admin telemetry-
 * consent ack. The /admin/* layout gate redirects unack admins back here
 * with `?reason=telemetry-consent-required`, and we surface that as an
 * inline banner + jump-start the wizard at the telemetry step.
 *
 * `useSearchParams` requires a Suspense boundary in Next.js 13+; the
 * inner component is split out so the boundary is explicit.
 */

"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { LegalFooter } from "@/design";
import { fetchSetupStatus } from "@/lib/setup-status-cache";

function SetupPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [resumeForTelemetry, setResumeForTelemetry] = useState(false);

  const reason = searchParams.get("reason");

  // E8.S5 (F-9-007 P1) — once-per-mount guard + shared cache. The
  // previous deps array `[router]` re-fired the effect on every parent
  // re-render (router identity changes); strict-mode double-mount
  // doubled it. The combined module-level cache + ref-gate drops the
  // x8 burst to a single network call.
  const checkedRef = useRef(false);
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;
    (async () => {
      const data = await fetchSetupStatus();
      if (cancelled) return;
      if (data === null) {
        router.replace("/login");
        return;
      }
      if (data.needsSetup) {
        setNeedsSetup(true);
      } else if (data.telemetryAcknowledged === false) {
        // Wizard previously ran (admin exists) but the telemetry-
        // consent ack is still pending — admin landed back here from
        // the /admin/* gate. Render the wizard, jump straight to
        // step 5 (TelemetryConsentStep).
        setNeedsSetup(true);
        setResumeForTelemetry(true);
      } else {
        router.replace("/login");
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !needsSetup) {
    // YR.0.6 (2026-04-26) — Tailwind min-h-screen + lucide <Loader2>
    // retired in favor of `.sys-fullpage` + `.sys-loading` chrome (matches
    // /login, /forbidden, error.tsx, not-found.tsx). prefers-reduced-motion
    // is handled by .sys-loading-spinner in design/styles/system.css.
    return (
      <>
        <main
          id="main-content"
          tabIndex={-1}
          className="sys-fullpage"
          aria-label="Setup status"
          data-testid="setup-page"
        >
          <h1 className="dojo-sr-only">DojoLM setup</h1>
          <div
            className="sys-loading"
            role="status"
            aria-live="polite"
            data-testid="setup-loading"
          >
            <span className="sys-loading-spinner" aria-hidden="true" />
            <span>Checking setup status…</span>
          </div>
        </main>
        {/* E6.S1 — consumer-bar §16: every public surface (including
            the pre-setup loading state) carries the LegalFooter so an
            operator who lands here mid-redirect still has the legal
            link rail in reach. */}
        <LegalFooter className="setup-legal-foot" />
      </>
    );
  }

  // E6.S1 — when the wizard renders, the LegalFooter sits in a sibling
  // <footer> outside SetupWizard's own scroll/paper chrome. SetupWizard
  // itself is unchanged so the wizard's <Scroll standalone> internals
  // stay isolated from the footer landmark.
  return (
    <>
      <main id="main-content" tabIndex={-1}>
        <SetupWizard
          resumeAtTelemetryStep={resumeForTelemetry}
          showTelemetryConsentRequiredBanner={
            resumeForTelemetry && reason === "telemetry-consent-required"
          }
        />
      </main>
      <LegalFooter className="setup-legal-foot" />
    </>
  );
}

function SetupFallback() {
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="sys-fullpage"
        aria-label="Setup status"
        data-testid="setup-page"
      >
        <h1 className="dojo-sr-only">DojoLM setup</h1>
        <div
          className="sys-loading"
          role="status"
          aria-live="polite"
          data-testid="setup-loading"
        >
          <span className="sys-loading-spinner" aria-hidden="true" />
          <span>Checking setup status…</span>
        </div>
      </main>
      <LegalFooter className="setup-legal-foot" />
    </>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupPageBody />
    </Suspense>
  );
}
