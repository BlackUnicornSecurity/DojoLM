// SPDX-License-Identifier: Apache-2.0

import type { FormEventHandler, ReactElement } from "react";
import { cap, QuickChips, type QuickChipItem } from "@/design";
import { QUICK_PAYLOADS } from "@/lib/payload-catalog";
import {
  SCAN_ERROR_COPY,
  type ScanErrorCode,
  type ScanResponse,
} from "./scan-codec";

export type AttackMode = "passive" | "basic" | "advanced" | "aggressive";

const ATTACK_MODES: readonly {
  value: AttackMode;
  label: string;
  lede: string;
}[] = [
  {
    value: "passive",
    label: "Passive",
    lede: "Reconnaissance only — info and low-severity tools.",
  },
  {
    value: "basic",
    label: "Basic",
    lede: "Standard probes — through medium severity.",
  },
  {
    value: "advanced",
    label: "Advanced",
    lede: "Adversarial probes — through high severity.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    lede: "Full catalogue — including critical-severity tools.",
  },
];

const QUICK_CHIPS: readonly QuickChipItem[] = QUICK_PAYLOADS.map((payload) => ({
  label: payload.label,
  text: payload.text,
}));

interface ScannerScanTabProps {
  readonly latest: ScanResponse | null;
  readonly verdictTone: "red" | "jade" | undefined;
  readonly verdictText: string;
  readonly onOpenHistory: () => void;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly attackMode: AttackMode;
  readonly onAttackModeChange: (mode: AttackMode) => void;
  readonly attackToolCount: number | null;
  readonly attackToolError: string | null;
  readonly input: string;
  readonly onInputChange: (input: string) => void;
  readonly maxInputLength: number;
  readonly loading: boolean;
  readonly elapsedS: number;
  readonly onStopWatching: () => void;
  readonly stoppedWatching: boolean;
  readonly error: ScanErrorCode | null;
  readonly onRetry: () => void;
}

function LatestRunControls({
  latest,
  verdictTone,
  verdictText,
  onOpenHistory,
}: Pick<
  ScannerScanTabProps,
  "latest" | "verdictTone" | "verdictText" | "onOpenHistory"
>): ReactElement {
  return (
    <div className="scanner-latest-run-controls">
      {latest?.runId !== undefined ? (
        <button
          type="button"
          className="btn sm btn-ghost"
          onClick={onOpenHistory}
          data-testid="scanner-open-in-history"
        >
          Open in history →
        </button>
      ) : null}
      {verdictTone ? (
        <span
          className={`chip ${verdictTone}`}
          aria-label={`latest verdict ${verdictText}`}
        >
          <span className="dot" aria-hidden="true" />
          {verdictText}
        </span>
      ) : null}
    </div>
  );
}

function AttackModeControl({
  attackMode,
  onAttackModeChange,
  attackToolCount,
  attackToolError,
}: Pick<
  ScannerScanTabProps,
  "attackMode" | "onAttackModeChange" | "attackToolCount" | "attackToolError"
>): ReactElement {
  return (
    <label className="wb-field" htmlFor="scanner-attack-mode">
      <span>Attack mode</span>
      <select
        id="scanner-attack-mode"
        data-testid="scanner-attack-mode"
        className="wb-input"
        value={attackMode}
        onChange={(event) =>
          onAttackModeChange(event.target.value as AttackMode)
        }
        aria-describedby="scanner-attack-mode-hint"
      >
        {ATTACK_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
      <AttackModeHint
        attackMode={attackMode}
        attackToolCount={attackToolCount}
        attackToolError={attackToolError}
      />
    </label>
  );
}

function AttackModeHint({
  attackMode,
  attackToolCount,
  attackToolError,
}: Pick<
  ScannerScanTabProps,
  "attackMode" | "attackToolCount" | "attackToolError"
>): ReactElement {
  const selectedMode = ATTACK_MODES.find((mode) => mode.value === attackMode);
  return (
    <span
      id="scanner-attack-mode-hint"
      className="wb-hint"
      data-testid="scanner-attack-mode-hint"
    >
      {selectedMode?.lede ?? ""} Controls which technique tier is counted for
      reference. It does not change scan execution.
      {attackToolCount !== null && attackToolError === null ? (
        <span data-testid="scanner-attack-mode-count">
          {" "}
          {attackToolCount} tool{attackToolCount === 1 ? "" : "s"} available.
        </span>
      ) : null}
      {attackToolError !== null ? (
        <span
          data-testid="scanner-attack-mode-error"
          style={{ color: "var(--torii-hi)" }}
        >
          {" "}
          {cap(attackToolError, 80)}
        </span>
      ) : null}
    </span>
  );
}

function ScanTargetControl({
  input,
  onInputChange,
  maxInputLength,
}: Pick<
  ScannerScanTabProps,
  "input" | "onInputChange" | "maxInputLength"
>): ReactElement {
  return (
    <>
      <QuickChips
        chips={QUICK_CHIPS}
        onSelect={onInputChange}
        testId="scanner-quick-chips"
      />
      <label className="wb-field" htmlFor="scanner-input">
        <span>Scan target text</span>
        <textarea
          id="scanner-input"
          data-testid="scanner-input"
          className="wb-input"
          rows={4}
          maxLength={maxInputLength}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Paste up to 10,000 characters of candidate prompt text…"
          aria-describedby="scanner-input-hint"
        />
        <span id="scanner-input-hint" className="wb-hint">
          Submitted text is scanned by the full Haiku engine fleet; findings
          render below.
        </span>
      </label>
    </>
  );
}

function ScanActionControl({
  loading,
  elapsedS,
  onStopWatching,
}: Pick<
  ScannerScanTabProps,
  "loading" | "elapsedS" | "onStopWatching"
>): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="submit"
        className="btn btn-primary"
        data-testid="scanner-run"
        disabled={loading}
        aria-label={
          loading ? "Scan in flight" : "Run scan against current input"
        }
      >
        {loading ? "Scanning…" : "Run scan"}
      </button>
      {loading ? (
        <>
          <span
            className="wb-hint"
            aria-live="polite"
            data-testid="scanner-inflight-meta"
          >
            {elapsedS}s elapsed
          </span>
          <button
            type="button"
            className="btn sm btn-ghost"
            onClick={onStopWatching}
            data-testid="scanner-stop-watching"
          >
            Stop watching
          </button>
        </>
      ) : null}
    </div>
  );
}

function ScanStatusMessages({
  stoppedWatching,
  error,
  onRetry,
}: Pick<
  ScannerScanTabProps,
  "stoppedWatching" | "error" | "onRetry"
>): ReactElement {
  const retryable = error === "scan-unavailable" || error === "network";
  return (
    <>
      {stoppedWatching ? (
        <div
          role="status"
          data-testid="scanner-stopped-watching"
          className="yr4-banner"
        >
          Stopped watching — the server scan continues and the run will appear
          in History.
        </div>
      ) : null}
      {error !== null ? (
        <div
          role="alert"
          data-testid="scanner-error"
          className="yr4-banner tone-red"
        >
          {SCAN_ERROR_COPY[error]}
          {retryable ? (
            <button
              type="button"
              className="btn sm"
              style={{ marginLeft: 10 }}
              onClick={onRetry}
              data-testid="scanner-error-retry"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ScannerScanTab(props: ScannerScanTabProps): ReactElement {
  return (
    <div data-testid="scanner-scan-tab">
      <LatestRunControls {...props} />
      <form
        onSubmit={props.onSubmit}
        className="yr4-kv-stack"
        aria-label="Scanner input form"
      >
        <AttackModeControl {...props} />
        <ScanTargetControl {...props} />
        <ScanActionControl {...props} />
        <ScanStatusMessages {...props} />
      </form>
    </div>
  );
}
