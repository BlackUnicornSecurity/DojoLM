// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * File: FeatureBadge.tsx
 * Purpose: Global badge component surfacing the active runtime feature mode
 *          (demo / preview / partial). Wave 0 Track C.5 (2026-04-18).
 *
 * Placement: rendered from the app layout so it appears on every page when
 * a non-production mode is active. Self-hiding when mode is null.
 *
 * Copy is intentionally short and the badge is non-interactive. For
 * feature-level badges inside a module UI, use a local inline variant.
 */

import type { FeatureMode } from "@/lib/demo";

interface FeatureBadgeProps {
  /**
   * Active feature mode. When null, the component renders nothing.
   * Pass the value resolved from `getFeatureMode()` at the boundary.
   */
  readonly mode: FeatureMode | null;
}

const LABEL: Record<FeatureMode, string> = {
  demo: "Demo mode",
  preview: "Preview",
  partial: "Partial",
};

const TOOLTIP: Record<FeatureMode, string> = {
  demo: "All API routes return mock data. Do not rely on behaviour.",
  preview: "Feature is reachable but backend is limited. Not production-ready.",
  partial: "Some flows are real, others are mocked. Verify per feature.",
};

const STYLE: Record<FeatureMode, string> = {
  // v2 conformity (migration Phase 2.1): demo is a neutral note, not an
  // alarm — the torii ramp is reserved for the one chrome-red moment per
  // view (SKIN-SPEC §1.2). Demo-data disclosure also lives in the
  // .app-foot line per the design's §2.2 treatment.
  demo: "bg-[var(--bg-2)] text-[var(--fg-dim)] border-[var(--b-1)]",
  preview: "bg-[var(--bg-2)] text-[var(--steel-lg)] border-[var(--steel-lg)]",
  partial: "bg-[var(--bg-2)] text-[var(--gold)] border-[var(--gold)]",
};

export function FeatureBadge({ mode }: FeatureBadgeProps) {
  if (mode === null) return null;
  return (
    <span
      role="status"
      aria-label={`Application runtime mode: ${LABEL[mode]}`}
      title={TOOLTIP[mode]}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider rounded-full border ${STYLE[mode]}`}
      data-testid="feature-badge"
      data-mode={mode}
    >
      {LABEL[mode]}
    </span>
  );
}
