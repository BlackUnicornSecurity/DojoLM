// SPDX-License-Identifier: Apache-2.0
/**
 * McpConnectorStatus — design primitive (TICKET-L-702).
 *
 * Pure-presentational MCP connector status card for the Adversarial /
 * Atemi-Lab surface. Surfaces the live MCP-server connection posture
 * (connected / disconnected / pending / error) plus latency, mode, and
 * uptime so operators can verify the dojolm-mcp child process is up
 * before firing adversarial probes.
 *
 * Read-only consumption of `/api/mcp/status` data the caller fetches
 * upstream — the primitive itself performs no network IO. Callers wire
 * the `onRefresh` prop to the page-level refetch handler.
 *
 * Adapter contract — consumers map from the `/api/mcp/status` response
 * shape `{ connected, enabled, latency, server: { mode, uptime, running } }`
 * to props:
 *   - `connected: boolean` → `state: 'connected' | 'disconnected'`
 *     (consumers handle 'pending' + 'error' from their own fetch state)
 *   - `latency: number` → `latencyMs: number`
 *   - `server.mode: AttackModeName` → `mode: string`
 *   - `server.uptime: number` → `uptimeS: number`
 * The primitive intentionally accepts the flattened shape (rather than
 * the nested API response) so it stays decoupled from API churn.
 *
 * Discriminant-redaction (R-T1 §10.16):
 *   - STATE_LABEL / STATE_CLASS / STATE_ARIA are closed
 *     `Record<McpConnectorState, ...>` maps. The connection state token
 *     NEVER reaches an aria-label or className except through these
 *     maps. The narrowing happens once at `isMcpConnectorState`.
 *   - `mode` is validated against `MCP_MODES`; unknown modes render as
 *     "unknown" rather than echoing the raw string into the DOM.
 *   - `latencyMs` is clamped to [0, 99999] before display.
 *   - `uptimeS` is capped at 999 999 s (~11 days) before display; the
 *     primitive shows raw seconds — the caller can format upstream.
 *
 * Defensive caps:
 *   - `lastError` capped at 200 chars.
 *
 * Emits `null` when `state` fails closed-enum narrowing — the page
 * wrapper renders the empty-state copy in that case.
 */

"use client";

export const MCP_CONNECTOR_STATES = [
  "connected",
  "disconnected",
  "pending",
  "error",
] as const;

export type McpConnectorState = (typeof MCP_CONNECTOR_STATES)[number];

// Aligned with `AttackModeName` from `packages/dojolm-mcp/src/types.ts`
// (the canonical 4-mode set the MCP server enforces). Pass-2 fold-in:
// the prior 8-mode tuple included 4 values (`prompt-injection`,
// `tool-poisoning`, `exfiltration`, `confused-deputy`) that the server
// did not understand and would render as "unknown" silently. The MCP
// server's `AttackModeName` is the source of truth; if we ever expand
// the mode set, that expansion lands in `dojolm-mcp/src/types.ts`
// first and this tuple imports from there.
export const MCP_MODES = [
  "passive",
  "basic",
  "advanced",
  "aggressive",
] as const;

export type McpMode = (typeof MCP_MODES)[number];

export interface McpConnectorStatusProps {
  /** Closed-enum connection state. Drives label/class/aria via maps. */
  readonly state: McpConnectorState;
  /** Latency to /health endpoint in ms. Clamped to [0, 99999]. */
  readonly latencyMs?: number;
  /** Active attack mode. Validated against `MCP_MODES`. */
  readonly mode?: string;
  /** Uptime in seconds. Clamped to [0, 999999]. */
  readonly uptimeS?: number;
  /** Last server error string, if any. Capped at 200 chars. */
  readonly lastError?: string;
  /** Optional refresh callback. When set, renders a Refresh button. */
  readonly onRefresh?: () => void;
  /** Test id stem. */
  readonly testId?: string;
  /** Wrapper className for layout overrides. */
  readonly className?: string;
}

export const MCP_CONNECTOR_LATENCY_MAX = 99_999;
export const MCP_CONNECTOR_UPTIME_MAX = 999_999;
export const MCP_CONNECTOR_ERROR_MAX = 200;

const VALID_STATES: ReadonlySet<McpConnectorState> = new Set(
  MCP_CONNECTOR_STATES,
);
const VALID_MODES: ReadonlySet<McpMode> = new Set(MCP_MODES);

export function isMcpConnectorState(v: unknown): v is McpConnectorState {
  return typeof v === "string" && VALID_STATES.has(v as McpConnectorState);
}

export function isMcpMode(v: unknown): v is McpMode {
  return typeof v === "string" && VALID_MODES.has(v as McpMode);
}

const STATE_LABEL: Readonly<Record<McpConnectorState, string>> = Object.freeze({
  connected: "Connected",
  disconnected: "Disconnected",
  pending: "Pending",
  error: "Error",
});

const STATE_CLASS: Readonly<Record<McpConnectorState, string>> = Object.freeze({
  connected: "mcp-conn-state-connected",
  disconnected: "mcp-conn-state-disconnected",
  pending: "mcp-conn-state-pending",
  error: "mcp-conn-state-error",
});

const STATE_ARIA: Readonly<Record<McpConnectorState, string>> = Object.freeze({
  connected: "MCP server connected",
  disconnected: "MCP server disconnected",
  pending: "MCP server pending",
  error: "MCP server error",
});

/**
 * Closed-enum visual tokens — keeps every state→color path through a
 * single map so a new state can't silently render with a default color.
 * Inline-style values use the design-token CSS variables; fallbacks
 * cover the case where the global theme isn't loaded (the prior
 * primitive relied entirely on external `mcp-conn-*` CSS that was
 * never authored — founder gestalt-eye-test 2026-05-21 surfaced raw
 * unstyled chrome on the Atemi page).
 */
const STATE_DOT_COLOR: Readonly<Record<McpConnectorState, string>> =
  Object.freeze({
    connected: "var(--jade-lg, #4ade80)",
    disconnected: "var(--fg-mute, #94a3b8)",
    pending: "var(--gold-lg, #fbbf24)",
    error: "var(--torii-lg, #ef4444)",
  });

const STATE_CHIP_BORDER: Readonly<Record<McpConnectorState, string>> =
  Object.freeze({
    connected: "var(--jade-lg, #4ade80)",
    disconnected: "var(--b-1, #334155)",
    pending: "var(--gold-lg, #fbbf24)",
    error: "var(--torii-lg, #ef4444)",
  });

const STATE_CHIP_BG: Readonly<Record<McpConnectorState, string>> =
  Object.freeze({
    connected: "rgba(74, 222, 128, 0.10)",
    disconnected: "rgba(148, 163, 184, 0.08)",
    pending: "rgba(251, 191, 36, 0.10)",
    error: "rgba(239, 68, 68, 0.10)",
  });

function clampNonNegative(n: number | undefined, max: number): number | null {
  if (n === undefined) return null;
  if (!Number.isFinite(n) || n < 0) return null;
  return n > max ? max : Math.round(n);
}

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * McpConnectorStatus — closed-state MCP connector card.
 *
 * Returns `null` when `state` fails the closed-enum guard.
 */
export function McpConnectorStatus({
  state,
  latencyMs,
  mode,
  uptimeS,
  lastError,
  onRefresh,
  testId,
  className,
}: McpConnectorStatusProps) {
  if (!isMcpConnectorState(state)) return null;

  const safeLatency = clampNonNegative(latencyMs, MCP_CONNECTOR_LATENCY_MAX);
  const safeUptime = clampNonNegative(uptimeS, MCP_CONNECTOR_UPTIME_MAX);
  const safeMode: McpMode | "unknown" = isMcpMode(mode) ? mode : "unknown";
  const cappedError =
    typeof lastError === "string" && lastError.length > 0
      ? cap(lastError, MCP_CONNECTOR_ERROR_MAX)
      : null;

  const rootTestId = testId ?? "mcp-connector-status";
  const rootClass = `mcp-conn ${STATE_CLASS[state]}${className ? ` ${className}` : ""}`;

  const dotColor = STATE_DOT_COLOR[state];
  const chipBorder = STATE_CHIP_BORDER[state];
  const chipBg = STATE_CHIP_BG[state];

  return (
    <section
      className={rootClass}
      data-testid={rootTestId}
      data-state={state}
      role="group"
      aria-label={`${STATE_ARIA[state]} status`}
      style={{
        padding: "14px 18px",
        background:
          "linear-gradient(180deg, var(--bg-2, #161922) 0%, var(--bg-1, #0d0d10) 100%)",
        border: "1px solid var(--b-1, #1f2937)",
        borderRadius: 10,
        boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.2))",
        color: "var(--fg, #e2e8f0)",
        fontFamily: "var(--sans, system-ui, -apple-system, sans-serif)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header
        className="mcp-conn-head"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          className="mcp-conn-kicker"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--fg-mute, #94a3b8)",
            fontFamily: "var(--mono, ui-monospace, monospace)",
          }}
        >
          MCP connector
        </span>
        <span
          className={`mcp-conn-chip ${STATE_CLASS[state]}`}
          data-testid={`${rootTestId}-chip`}
          aria-label={STATE_ARIA[state]}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 999,
            border: `1px solid ${chipBorder}`,
            background: chipBg,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          <span
            className={`mcp-conn-dot mcp-conn-dot-${state}`}
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: dotColor,
              boxShadow: state === "pending" ? `0 0 0 0 ${dotColor}` : "none",
            }}
          />
          {STATE_LABEL[state]}
        </span>
        <span style={{ flex: 1 }} />
        {onRefresh !== undefined ? (
          <button
            type="button"
            className="mcp-conn-refresh btn btn-ghost"
            data-testid={`${rootTestId}-refresh`}
            aria-label="Refresh connection status"
            onClick={onRefresh}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid var(--b-1, #334155)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--fg, #e2e8f0)",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        ) : null}
      </header>
      <dl
        className="mcp-conn-meta"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          margin: 0,
          padding: "8px 0 0",
          borderTop: "1px solid var(--b-1, #1f2937)",
        }}
      >
        <div
          className="mcp-conn-meta-row"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <dt
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--fg-mute, #94a3b8)",
            }}
          >
            Latency
          </dt>
          <dd
            data-testid={`${rootTestId}-latency`}
            style={{
              margin: 0,
              fontFamily: "var(--mono, ui-monospace, monospace)",
              fontSize: 13,
              color: "var(--fg, #e2e8f0)",
            }}
          >
            {safeLatency === null ? "—" : `${safeLatency} ms`}
          </dd>
        </div>
        <div
          className="mcp-conn-meta-row"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <dt
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--fg-mute, #94a3b8)",
            }}
          >
            Mode
          </dt>
          <dd
            data-testid={`${rootTestId}-mode`}
            style={{
              margin: 0,
              fontFamily: "var(--mono, ui-monospace, monospace)",
              fontSize: 13,
              color: "var(--fg, #e2e8f0)",
            }}
          >
            {safeMode}
          </dd>
        </div>
        <div
          className="mcp-conn-meta-row"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <dt
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--fg-mute, #94a3b8)",
            }}
          >
            Uptime
          </dt>
          <dd
            data-testid={`${rootTestId}-uptime`}
            style={{
              margin: 0,
              fontFamily: "var(--mono, ui-monospace, monospace)",
              fontSize: 13,
              color: "var(--fg, #e2e8f0)",
            }}
          >
            {safeUptime === null ? "—" : `${safeUptime} s`}
          </dd>
        </div>
      </dl>
      {cappedError !== null ? (
        <p
          className="mcp-conn-error yr4-banner tone-red"
          data-testid={`${rootTestId}-error`}
          role="alert"
          style={{
            margin: 0,
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(239, 68, 68, 0.10)",
            border: "1px solid var(--torii-lg, #ef4444)",
            color: "var(--torii-hi, #fca5a5)",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <span
            className="mcp-conn-error-kicker"
            style={{
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: "0.06em",
              marginRight: 6,
            }}
          >
            Last error:
          </span>
          {cappedError}
        </p>
      ) : null}
    </section>
  );
}
