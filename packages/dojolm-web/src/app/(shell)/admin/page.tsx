// SPDX-License-Identifier: Apache-2.0
/**
 * /admin — TICKET-A403 Admin landing index (V1→V2 Restoration Phase D).
 *
 * Server-rendered landing page that folds the V1 admin "General
 * Overview" Platform Information card into the V2 split-admin layout
 * per the V1→V2 audit §10.13 + §3.4 A-403 + the V1 admin-landing
 * surface.
 *
 * Composes three pieces:
 *   - `<CommandHero>` (steel tint per the design-system admin band).
 *   - `<PlatformInfoCard>` — the restored V1 card.
 *   - `<AdminLandingNav>` — auto-derived deep-link grid for every
 *     shipped admin module (`/admin/users`, `/admin/api-keys`,
 *     `/admin/atemi`, …). E5.S7 retired the prior 11-card pin so the
 *     full ~26 modules are now discoverable from the landing index.
 *
 * Data source: `/api/build-info` GET handler. The handler is internal
 * + public (no auth) and reads `BUILD_SHA` / `BUILD_DATE` env vars +
 * `process.env.NODE_ENV` + the package.json version. We invoke the
 * exported `GET` function directly rather than round-tripping through
 * HTTP — this is the canonical Next.js RSC pattern and avoids the
 * `headers()`-derived host shim required by `fetch('/api/...')` from
 * a Server Component. (The `audit-orphans.mjs` 5-pattern ladder
 * recognises pattern #3 — direct route-handler import — so this page
 * still flips `/api/build-info` orphan→wired.)
 *
 * Failure modes:
 *   - GET handler throws → page renders with `status: 'unavailable'`
 *     and `'—'` placeholders. No partial chrome.
 *   - GET handler returns malformed JSON → same fallback.
 *   - Build-info handler returns null sha/date → card renders `'—'`
 *     for those cells (V1 parity behaviour).
 *
 * R-T1 / Mock-data audit (§8.2.D):
 *   - No SAMPLE_RECORDS / EXAMPLE_* / MOCK_* / DEMO_* arrays from the
 *     V1 admin-landing canvas are ported.
 *   - No fake "ROOM Platform" / "v8.2" / "2025-XX-XX" values; real
 *     data flows from the build-info handler. Region + license render
 *     `'—'` (V2-net-new placeholders deferred to TICKET-A403-FOLLOWUP).
 *   - No fake module list ported; AdminLandingNav consumes the
 *     `ADMIN_ROUTE_CATALOG` map which mirrors the existing admin
 *     route directories (audit-v1v2-parity script verifies parity;
 *     E5.S7 added drift assertion against `NAV_ID_TO_URL`).
 *   - No window.* global registration pattern from the canvas.
 *
 * RBAC: `middleware/rbac.ts` already gates `/admin/*` to role
 * `admin`. This page does not re-authenticate at the route level; the
 * middleware redirect runs at the Edge before the RSC bundle ever
 * boots.
 */

import type { ReactElement } from "react";
import { AdminLandingNav, type Environment, type SystemStatus } from "@/design";
// Stage 2 brutal-review hallmark audit 2026-05-27 UI-105/009 (Option C):
// CommandHero + PlatformInfoCard retired from the /admin chrome — they
// duplicated the same 4 datapoints (Application/Version/Build/Status)
// that KpiStrip already surfaces. The 3-band redundancy (CommandHero +
// KpiStrip + PlatformInfoCard) consumed ~480px above the Modules grid
// for one 4-field tuple. Now: PageHead title + KpiStrip + Modules
// section. Full build metadata breakdown drilled-into via the lede's
// /admin/system-health pointer. Primitives kept in @/design for
// canvas-only consumption (same retirement pattern as TrainingScroll +
// HaikuLicenseModules in PR #901 + the ModelLeaderboard primitive in
// PR #900).
import {
  KpiStrip,
  type KpiStripItem,
  type KpiStripTone,
} from "@/design/primitives/KpiStrip";
import { PageHead } from "@/design/shell/PageHead";
import { GET as getBuildInfo } from "@/app/api/build-info/route";

export const dynamic = "force-dynamic";

interface BuildInfoResponse {
  readonly sha: string | null;
  readonly date: string | null;
  readonly version: string;
  readonly environment: string;
}

const KNOWN_ENVIRONMENTS: readonly Environment[] = Object.freeze([
  "production",
  "development",
  "test",
  "unknown",
]);

function isEnvironment(value: unknown): value is Environment {
  return (
    typeof value === "string" &&
    (KNOWN_ENVIRONMENTS as readonly string[]).includes(value)
  );
}

function narrowEnvironment(value: unknown): Environment {
  return isEnvironment(value) ? value : "unknown";
}

/**
 * Discriminator for the page's load state. We always render full
 * chrome — never a skeleton — but the platform card flips to
 * `'unavailable'` when the build-info read fails so the operator
 * sees the failure rather than stale defaults.
 */
type LoadOutcome =
  | { readonly kind: "ok"; readonly body: BuildInfoResponse }
  | { readonly kind: "error" };

async function loadBuildInfo(): Promise<LoadOutcome> {
  try {
    const res = await getBuildInfo();
    if (!res.ok) return { kind: "error" };
    const raw = (await res.json()) as unknown;
    if (!raw || typeof raw !== "object") return { kind: "error" };
    const r = raw as Record<string, unknown>;
    if (typeof r.version !== "string" || r.version.length === 0) {
      return { kind: "error" };
    }
    if (typeof r.environment !== "string") return { kind: "error" };
    if (r.sha !== null && typeof r.sha !== "string") return { kind: "error" };
    if (r.date !== null && typeof r.date !== "string") return { kind: "error" };
    return {
      kind: "ok",
      body: Object.freeze({
        sha: r.sha,
        date: r.date,
        version: r.version,
        environment: r.environment,
      }),
    };
  } catch {
    return { kind: "error" };
  }
}

const APPLICATION_NAME = "DojoLM Platform" as const;
// DEFAULT_THEME + DEFAULT_UPTIME_LABEL retired alongside PlatformInfoCard
// per hallmark audit Option C — the Theme + uptimeLabel fields were
// only read by PlatformInfoCard's "Mode" + uptime rows. KpiStrip doesn't
// surface them. Type `Theme` no longer needed in this file.

// ---------------------------------------------------------------------------
// E-A26 Phase B — KpiStrip status tone closed-record (R-T1 discipline)
// ---------------------------------------------------------------------------
//
// Plan v4 §8.7 — V1 restoration bullet "<KpiStrip> with platform info".
// Founder Q2 gate 2026-05-19: ADD above PlatformInfoCard, KEEP PlatformInfoCard
// byte-identical. 4 tiles surface the at-a-glance platform shape (Application
// / Version / Build / Status). PlatformInfoCard retains the full 5-field
// detail view + System Status pill below.

const KPI_STRIP_STATUS_TONE: Readonly<Record<SystemStatus, KpiStripTone>> =
  Object.freeze({
    operational: "jade",
    degraded: "gold",
    unavailable: "red",
  });

const KPI_STRIP_STATUS_LABEL: Readonly<Record<SystemStatus, string>> =
  Object.freeze({
    operational: "All systems operational",
    degraded: "Degraded — some systems impaired",
    unavailable: "Unavailable — telemetry offline",
  });

const KPI_STRIP_ENVIRONMENT_LABEL: Readonly<Record<Environment, string>> =
  Object.freeze({
    production: "Production",
    development: "Development",
    test: "Test",
    unknown: "Unknown",
  });

// Narrow info shape — only the fields KpiStrip reads. PlatformInfoCard's
// extra fields (theme, uptimeLabel) retired with the card per Option C.
interface AdminKpiInfo {
  readonly application: string;
  readonly version: string;
  readonly buildDate: string | null;
  readonly commit: string | null;
  readonly environment: Environment;
  readonly status: SystemStatus;
}

function buildKpiStripItems(info: AdminKpiInfo): readonly KpiStripItem[] {
  const buildValue = info.buildDate ?? "—";
  const buildSub =
    info.commit !== null && info.commit.length >= 7
      ? `${info.commit.slice(0, 7)} · ${KPI_STRIP_ENVIRONMENT_LABEL[info.environment]}`
      : KPI_STRIP_ENVIRONMENT_LABEL[info.environment];
  return [
    {
      label: "Application",
      value: info.application,
      tone: "steel",
      testId: "admin-kpi-application",
      ariaLabel: `Application — ${info.application}`,
    },
    {
      label: "Version",
      value: info.version,
      tone: "steel",
      testId: "admin-kpi-version",
      ariaLabel: `Version — ${info.version}`,
    },
    {
      label: "Build",
      value: buildValue,
      tone: "steel",
      testId: "admin-kpi-build",
      ariaLabel: `Build — ${buildValue}${info.commit ? " commit " + info.commit.slice(0, 7) : ""}`,
      // Sub-line via aria-label; visible secondary copy via the delta
      // slot would over-decorate this tile. The PlatformInfoCard below
      // carries the full Build Date / Commit / Environment breakdown.
    },
    {
      label: "Status",
      // wave-a Admin Landing `.plat` STATUS cell — a status dot + normal
      // Inter ink text (not the 26px tone-colored KPI figure). The dot
      // colour tracks the status tone; value styling scoped in admin.css.
      value: (
        <span className="admin-status">
          <span
            className={`admin-status-dot admin-status-dot--${KPI_STRIP_STATUS_TONE[info.status]}`}
            aria-hidden="true"
          />
          {KPI_STRIP_STATUS_LABEL[info.status]}
        </span>
      ),
      tone: KPI_STRIP_STATUS_TONE[info.status],
      testId: "admin-kpi-status",
      ariaLabel: `System status — ${KPI_STRIP_STATUS_LABEL[info.status]}`,
    },
  ];
}

function buildPlatformInfo(outcome: LoadOutcome): {
  readonly info: AdminKpiInfo;
  readonly status: SystemStatus;
} {
  if (outcome.kind === "error") {
    return {
      status: "unavailable",
      info: Object.freeze({
        application: APPLICATION_NAME,
        version: "—",
        buildDate: null,
        environment: "unknown" satisfies Environment,
        commit: null,
        status: "unavailable" satisfies SystemStatus,
      }),
    };
  }
  // Success path. We treat any 2xx with a parseable body as
  // 'operational' — health checks live at /admin/system-health and are
  // out of scope for the landing card.
  const status: SystemStatus = "operational";
  const env = narrowEnvironment(outcome.body.environment);
  return {
    status,
    info: Object.freeze({
      application: APPLICATION_NAME,
      version: outcome.body.version,
      buildDate: outcome.body.date,
      environment: env,
      commit: outcome.body.sha,
      status,
    }),
  };
}

export default async function AdminLandingPage(): Promise<ReactElement> {
  const outcome = await loadBuildInfo();
  const { info } = buildPlatformInfo(outcome);
  const kpiItems = buildKpiStripItems(info);

  return (
    <div data-testid="admin-landing-page">
      {/*
        Stage 2 brutal-review hallmark audit 2026-05-27 UI-105/009
        (Option C, Phase-3-consistency path):
        - CommandHero hero band RETIRED. Was a Specimen-fall-through on
          a utility surface (hallmark anti-pattern); plus the wrapper +
          watermark + eyebrow + italic-serif title duplicated the title
          identity that PageHead already carries. Aligns /admin chrome
          with Dashboard + /console post-PR #901 (all three landings
          now share bare PageHead).
        - PlatformInfoCard RETIRED. Was the 3rd containment layer
          restating the SAME 4 datapoints (Application/Version/Build/
          Status) already in the KpiStrip below. Card-in-card-in-card.
          Full build-metadata breakdown drilled-into via
          /admin/system-health per the lede.
        - "Admin · overview" eyebrow + "管" watermark + "管理 · ADMIN"
          vertical strip RETIRED with CommandHero — eyebrows default
          OFF per anti-patterns gate 66; watermark was UX UI-007 noise.
      */}
      <PageHead
        namingId="admin"
        title="Admin"
      />

      {/*
        KpiStrip is the at-a-glance row for the 4 platform datapoints
        (Application / Version / Build / Status). Aligns with the
        Phase 3 KpiStrip pattern on Bushido / Atemi / Buki / Jutsu /
        Ronin / Dashboard / /console.
      */}
      <div style={{ marginTop: 16 }} data-testid="admin-kpi-strip-row">
        <KpiStrip
          module="admin"
          items={[...kpiItems]}
          testId="admin-kpi-strip"
        />
      </div>

      {/*
        Modules directory. P5 prod-parity (wave-a Admin Landing v2): the
        design goes straight from the platform-info strip to the first
        group kicker ("TEST · 9 modules") — no "Modules" H2, sub-copy, or
        "ADMIN MODULES · N surfaces" counter. AdminLandingNav is already a
        labelled `<nav aria-label="Admin modules">` landmark, so no extra
        region wrapper is needed for a11y.
      */}
      <section data-testid="admin-modules-section" style={{ marginTop: 16 }}>
        <AdminLandingNav />
      </section>
    </div>
  );
}
