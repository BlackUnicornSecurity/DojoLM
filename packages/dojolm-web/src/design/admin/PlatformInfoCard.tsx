// SPDX-License-Identifier: Apache-2.0
/**
 * <PlatformInfoCard> — TICKET-A403 Platform Information card.
 *
 * Folds the V1 admin "General Overview" Platform Information card
 * into the V2 `/admin` landing index per §10.13 of the V1→V2 audit.
 * Pure presentational primitive — accepts a
 * frozen `PlatformInfo` shape from the page Server Component, never
 * fetches its own data, never registers `window.*` globals.
 *
 * R-T1 discipline (every aria-label / className routed through closed
 * map):
 *   - SystemStatus → STATUS_TONE → STATUS_CHIP_CLASS (closed maps).
 *   - Environment → ENVIRONMENT_LABEL (closed map; outside-enum input
 *     renders the literal "unknown").
 *   - Theme → THEME_LABEL (closed map).
 *   - Status pill aria-label is built from the closed STATUS_LABEL map,
 *     never the raw `status` value.
 *
 * Mock-data audit (§8.2.D):
 *   - No SAMPLE_RECORDS / EXAMPLE_*  / MOCK_* / DEMO_* arrays imported.
 *   - No fake "ROOM Platform" / "v8.2" / "2025-XX-XX" values from
 *     the V1 admin-landing surface. The only constant is
 *     `application = 'DojoLM Platform'` which the page Server Component
 *     supplies and is the actual product name.
 *   - V2-net-new region/license cells (canvas lines 78-80) are
 *     deliberately rendered as `'—'` placeholders. Follow-up:
 *     TICKET-A403-FOLLOWUP.
 *
 * Zero-deps:
 *   - No new dependency added.
 *   - No `lucide-react` / shadcn `Card/Button/Badge` / `recharts` /
 *     `framer-motion` import.
 *   - Pure JSX + closed-map look-ups, all colors via `var(--*)` tokens.
 */

import type { ReactElement } from "react";

// ---------------------------------------------------------------------------
// Closed-enum shape (R-T1 source of truth)
// ---------------------------------------------------------------------------

export type Environment = "production" | "development" | "test" | "unknown";
export type Theme = "Dark" | "Light";
export type SystemStatus = "operational" | "degraded" | "unavailable";

export interface PlatformInfo {
  readonly application: string; // canonical 'DojoLM Platform'
  readonly version: string;
  readonly buildDate: string | null;
  readonly environment: Environment;
  readonly theme: Theme;
  readonly commit: string | null;
  readonly status: SystemStatus;
  readonly uptimeLabel: string;
}

export interface PlatformInfoCardProps {
  readonly info: PlatformInfo;
}

// ---------------------------------------------------------------------------
// Closed maps (R-T1) — every visible string + className flows through here.
// A payload value outside the closed enum renders the literal "unknown",
// never the raw value.
// ---------------------------------------------------------------------------

const STATUS_TONE: Readonly<Record<SystemStatus, "jade" | "gold" | "torii">> =
  Object.freeze({
    operational: "jade",
    degraded: "gold",
    unavailable: "torii",
  });

/**
 * Map design-token names (jade / gold / torii) to the project's actual
 * `.chip` CSS classes which use legacy aliases (`jade` / `warn` / `red`).
 * Two-stage map keeps the public token surface aligned with §3 spec
 * while still routing the className through a closed map.
 */
const STATUS_CHIP_CLASS: Readonly<Record<"jade" | "gold" | "torii", string>> =
  Object.freeze({
    jade: "jade",
    gold: "warn",
    torii: "red",
  });

const STATUS_LABEL: Readonly<Record<SystemStatus, string>> = Object.freeze({
  operational: "OPERATIONAL",
  degraded: "DEGRADED",
  unavailable: "UNAVAILABLE",
});

const STATUS_LEDE: Readonly<Record<SystemStatus, string>> = Object.freeze({
  operational: "All systems operational",
  degraded: "One or more services degraded",
  unavailable: "Build metadata unavailable",
});

const ENVIRONMENT_LABEL: Readonly<Record<Environment, string>> = Object.freeze({
  production: "Production",
  development: "Development",
  test: "Test",
  unknown: "unknown",
});

const THEME_LABEL: Readonly<Record<Theme, string>> = Object.freeze({
  Dark: "Dark (default)",
  Light: "Light",
});

const KNOWN_ENVIRONMENTS: readonly Environment[] = Object.freeze([
  "production",
  "development",
  "test",
  "unknown",
]);

const KNOWN_THEMES: readonly Theme[] = Object.freeze(["Dark", "Light"]);

const KNOWN_STATUSES: readonly SystemStatus[] = Object.freeze([
  "operational",
  "degraded",
  "unavailable",
]);

// V2-net-new placeholders — DEFERRED to TICKET-A403-FOLLOWUP. Rendered
// as '—' so the canvas's 8-cell grid matches one-for-one without
// porting fake region/license data from the design file.
const PLACEHOLDER = "—";

function isEnvironment(value: unknown): value is Environment {
  return (
    typeof value === "string" &&
    (KNOWN_ENVIRONMENTS as readonly string[]).includes(value)
  );
}

function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" &&
    (KNOWN_THEMES as readonly string[]).includes(value)
  );
}

function isSystemStatus(value: unknown): value is SystemStatus {
  return (
    typeof value === "string" &&
    (KNOWN_STATUSES as readonly string[]).includes(value)
  );
}

function environmentLabel(env: Environment | string): string {
  return isEnvironment(env) ? ENVIRONMENT_LABEL[env] : "unknown";
}

function themeLabel(theme: Theme | string): string {
  return isTheme(theme) ? THEME_LABEL[theme] : "unknown";
}

function statusChipClass(status: SystemStatus | string): string {
  if (!isSystemStatus(status)) return STATUS_CHIP_CLASS.torii;
  return STATUS_CHIP_CLASS[STATUS_TONE[status]];
}

function statusLabel(status: SystemStatus | string): string {
  return isSystemStatus(status) ? STATUS_LABEL[status] : "UNKNOWN";
}

function statusLede(status: SystemStatus | string): string {
  return isSystemStatus(status)
    ? STATUS_LEDE[status]
    : "Build metadata unavailable";
}

// ---------------------------------------------------------------------------
// PlatformInfoCard
// ---------------------------------------------------------------------------

export function PlatformInfoCard({
  info,
}: PlatformInfoCardProps): ReactElement {
  const chipClass = statusChipClass(info.status);
  const pillLabel = statusLabel(info.status);
  const ledeText = statusLede(info.status);
  const envText = environmentLabel(info.environment);
  const themeText = themeLabel(info.theme);
  const buildDateText = info.buildDate ?? PLACEHOLDER;
  const commitText = info.commit ?? PLACEHOLDER;

  return (
    <div
      className="panel"
      data-testid="platform-info-card"
      aria-label={`Platform information — ${pillLabel}`}
    >
      <div className="panel-head">
        <div className="col">
          <h3>{info.application}</h3>
          <div className="sub">Black Unicorn LLM security operator</div>
        </div>
        <div className="meta">
          <span
            className={`chip ${chipClass}`}
            data-testid={`platform-info-status-${info.status}`}
            aria-label={`System status ${pillLabel}`}
          >
            <span className="dot" />
            {pillLabel}
          </span>
        </div>
      </div>

      <dl
        className="kv"
        aria-label="Platform information"
        data-testid="platform-info-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "12px",
          margin: 0,
          padding: "14px 18px",
        }}
      >
        <PlatformCell
          label="APPLICATION"
          value={info.application}
          testId="platform-info-application"
        />
        <PlatformCell
          label="VERSION"
          value={info.version}
          testId="platform-info-version"
          mono
        />
        <PlatformCell
          label="BUILD DATE"
          value={buildDateText}
          testId="platform-info-build-date"
          mono
        />
        <PlatformCell
          label="ENVIRONMENT"
          value={envText}
          testId="platform-info-environment"
        />
        <PlatformCell
          label="THEME"
          value={themeText}
          testId="platform-info-theme"
        />
        <PlatformCell
          label="REGION"
          value={PLACEHOLDER}
          testId="platform-info-region"
        />
        <PlatformCell
          label="COMMIT"
          value={commitText}
          testId="platform-info-commit"
          mono
        />
        <PlatformCell
          label="LICENSE"
          value={PLACEHOLDER}
          testId="platform-info-license"
        />
      </dl>

      <div
        className="panel-head"
        data-testid="platform-info-status-line"
        style={{
          borderTop: "1px solid var(--b-1)",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          className={`chip ${chipClass}`}
          aria-hidden="true"
          style={{ padding: "2px 8px" }}
        >
          <span className="dot" />
        </span>
        <span
          style={{ color: "var(--fg)", fontWeight: 600, fontSize: "12.5px" }}
        >
          {ledeText}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            color: "var(--fg-dim)",
            letterSpacing: "0.12em",
          }}
          data-testid="platform-info-uptime"
        >
          UPTIME {info.uptimeLabel}
        </span>
      </div>
    </div>
  );
}

interface PlatformCellProps {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
  readonly mono?: boolean;
}

function PlatformCell({
  label,
  value,
  testId,
  mono = false,
}: PlatformCellProps): ReactElement {
  return (
    <div className="kv-row" data-testid={testId} style={{ display: "block" }}>
      <dt
        style={{
          fontFamily: "var(--mono)",
          fontSize: "11px",
          letterSpacing: "0.18em",
          color: "var(--fg-dim)",
          marginBottom: "4px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontFamily: mono ? "var(--mono)" : "var(--ui)",
          fontSize: mono ? "11.5px" : "12.5px",
          color: "var(--fg)",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
