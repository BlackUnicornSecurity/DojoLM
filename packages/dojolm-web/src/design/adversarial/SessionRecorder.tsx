// SPDX-License-Identifier: Apache-2.0
/**
 * SessionRecorder — design primitive (TICKET-L-702).
 *
 * Pure-presentational session-recorder control + status card for the
 * Adversarial / Atemi-Lab surface. Exposes Start/Stop/Discard buttons
 * plus a live duration / event-count / size readout so operators can
 * see, at a glance, whether the active probe session is being captured
 * to atemi-session storage.
 *
 * Read-only consumer of recording state. The primitive is dispatch-
 * agnostic — it never reads or writes `atemi-session-storage` itself;
 * the consuming page wires `onStart` / `onStop` / `onDiscard` to the
 * lib functions. SessionRecorder is the "play deck" that simply renders
 * what state was passed.
 *
 * Substantial recording-engine work — actual capture, playback,
 * storage hydration — lives in `lib/atemi-session-storage.ts` (already
 * shipped). Wiring the recorder into a runnable Atemi Lab session
 * UI is a follow-up consumer PR; this primitive ships the chrome.
 *
 * Discriminant-redaction (R-T1 §10.16):
 *   - STATE_LABEL / STATE_CLASS / STATE_ARIA are closed
 *     `Record<SessionRecorderState, ...>` maps. The state token NEVER
 *     reaches an aria-label or className except through these maps.
 *   - All button aria-labels are static literal strings; e2e selectors
 *     match `Start recording Live practice session` / `Stop recording session`
 *     / `Discard recording` exactly (companion test in
 *     `e2e/component-controls.spec.ts`).
 *
 * Defensive caps:
 *   - `durationMs` clamped to [0, 24h] — display caps at "23:59:59".
 *   - `eventCount` clamped to [0, 99999] — UI shows "99999+" past cap.
 *   - `sizeBytes` clamped to [0, 1 GiB] — bytes formatted via local
 *     helper into B/KiB/MiB.
 *
 * Emits `null` when `state` fails closed-enum narrowing — the page
 * wrapper renders the empty-state copy in that case.
 */

'use client';

export const SESSION_RECORDER_STATES = [
  'idle',
  'recording',
  'paused',
  'stopped',
] as const;

export type SessionRecorderState = (typeof SESSION_RECORDER_STATES)[number];

export interface SessionRecorderProps {
  /** Closed-enum recorder state. Drives label/class/aria via maps. */
  readonly state: SessionRecorderState;
  /** Active session duration in ms. Clamped to [0, 24h]. */
  readonly durationMs?: number;
  /** Recorded event count. Clamped to [0, 99999]. */
  readonly eventCount?: number;
  /** Recorded byte size. Clamped to [0, 1 GiB]. */
  readonly sizeBytes?: number;
  /** Optional session id (e.g. ulid) for the active recording. */
  readonly sessionId?: string;
  /** Start callback. Required to render the Start button. */
  readonly onStart?: () => void;
  /** Stop callback. Required to render the Stop button. */
  readonly onStop?: () => void;
  /** Discard callback. Required to render the Discard button. */
  readonly onDiscard?: () => void;
  /** Test id stem. */
  readonly testId?: string;
  /** Wrapper className for layout overrides. */
  readonly className?: string;
}

export const SESSION_RECORDER_DURATION_MAX = 24 * 60 * 60 * 1000; // 24h ms
export const SESSION_RECORDER_EVENT_MAX = 99_999;
export const SESSION_RECORDER_BYTES_MAX = 1024 * 1024 * 1024; // 1 GiB
export const SESSION_RECORDER_SESSION_ID_MAX = 64;

const VALID_STATES: ReadonlySet<SessionRecorderState> = new Set(
  SESSION_RECORDER_STATES,
);

export function isSessionRecorderState(v: unknown): v is SessionRecorderState {
  return typeof v === 'string' && VALID_STATES.has(v as SessionRecorderState);
}

const STATE_LABEL: Readonly<Record<SessionRecorderState, string>> = Object.freeze({
  idle: 'Idle',
  recording: 'Recording',
  paused: 'Paused',
  stopped: 'Stopped',
});

const STATE_CLASS: Readonly<Record<SessionRecorderState, string>> = Object.freeze({
  idle: 'session-rec-state-idle',
  recording: 'session-rec-state-recording',
  paused: 'session-rec-state-paused',
  stopped: 'session-rec-state-stopped',
});

const STATE_ARIA: Readonly<Record<SessionRecorderState, string>> = Object.freeze({
  idle: 'recorder idle',
  recording: 'recorder active',
  paused: 'recorder paused',
  stopped: 'recorder stopped',
});

function clampNonNegative(n: number | undefined, max: number): number | null {
  if (n === undefined) return null;
  if (!Number.isFinite(n) || n < 0) return null;
  return n > max ? max : Math.floor(n);
}

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MiB`;
}

/**
 * SessionRecorder — closed-state recorder control card.
 *
 * Returns `null` when `state` fails the closed-enum guard.
 */
export function SessionRecorder({
  state,
  durationMs,
  eventCount,
  sizeBytes,
  sessionId,
  onStart,
  onStop,
  onDiscard,
  testId,
  className,
}: SessionRecorderProps) {
  if (!isSessionRecorderState(state)) return null;

  const safeDuration = clampNonNegative(durationMs, SESSION_RECORDER_DURATION_MAX);
  const safeEventClamp = clampNonNegative(eventCount, SESSION_RECORDER_EVENT_MAX);
  const eventOverflow =
    eventCount !== undefined &&
    Number.isFinite(eventCount) &&
    eventCount > SESSION_RECORDER_EVENT_MAX;
  const safeBytes = clampNonNegative(sizeBytes, SESSION_RECORDER_BYTES_MAX);
  const cappedSessionId =
    typeof sessionId === 'string' && sessionId.length > 0
      ? cap(sessionId, SESSION_RECORDER_SESSION_ID_MAX)
      : null;

  const rootTestId = testId ?? 'session-recorder';
  const rootClass = `session-rec ${STATE_CLASS[state]}${className ? ` ${className}` : ''}`;

  // Button enablement is fully derived from the closed state token.
  //   - idle      → only Start enabled (no Stop / Discard target)
  //   - recording → Stop + Discard enabled (Start would double-fire)
  //   - paused    → all three (resume / end / throw away)
  //   - stopped   → Start + Discard enabled (Stop is no-op; operator
  //                 can either start a new session or discard the
  //                 stopped one before saving)
  // Pass-2 fold-in: prior comment claimed Idle/Stopped both showed
  // "only Start" but `discardDisabled` only fires on idle (stopped
  // sessions still have a recording to throw away). Aligned comment to
  // code; tests in L702-005..006 + new L702-009 cover the matrix.
  const startDisabled = state === 'recording';
  const stopDisabled = state === 'idle' || state === 'stopped';
  const discardDisabled = state === 'idle';

  const eventLabel = eventOverflow
    ? `${SESSION_RECORDER_EVENT_MAX}+`
    : safeEventClamp === null
      ? '—'
      : String(safeEventClamp);

  return (
    <section
      className={rootClass}
      data-testid={rootTestId}
      data-state={state}
      role="group"
      aria-label={`Session recorder, ${STATE_ARIA[state]}`}
    >
      <header className="session-rec-head">
        <span className="session-rec-kicker">Session recorder</span>
        <span
          className={`session-rec-chip ${STATE_CLASS[state]}`}
          data-testid={`${rootTestId}-chip`}
          aria-label={STATE_ARIA[state]}
        >
          <span
            className={`session-rec-dot session-rec-dot-${state}`}
            aria-hidden="true"
          />
          {STATE_LABEL[state]}
        </span>
      </header>
      <div className="session-rec-meta">
        <div className="session-rec-meta-row">
          <span className="session-rec-meta-key">Duration</span>
          <span
            className="session-rec-meta-val"
            data-testid={`${rootTestId}-duration`}
          >
            {formatDuration(safeDuration)}
          </span>
        </div>
        <div className="session-rec-meta-row">
          <span className="session-rec-meta-key">Events</span>
          <span
            className="session-rec-meta-val"
            data-testid={`${rootTestId}-events`}
          >
            {eventLabel}
          </span>
        </div>
        <div className="session-rec-meta-row">
          <span className="session-rec-meta-key">Size</span>
          <span
            className="session-rec-meta-val"
            data-testid={`${rootTestId}-size`}
          >
            {formatBytes(safeBytes)}
          </span>
        </div>
      </div>
      {cappedSessionId !== null ? (
        <p
          className="session-rec-id"
          data-testid={`${rootTestId}-session-id`}
        >
          <span className="session-rec-id-kicker">Session:</span>{' '}
          <code>{cappedSessionId}</code>
        </p>
      ) : null}
      <div className="session-rec-actions" role="toolbar">
        <button
          type="button"
          className="session-rec-btn session-rec-btn-start"
          data-testid={`${rootTestId}-start`}
          aria-label="Start recording Live practice session"
          disabled={startDisabled || onStart === undefined}
          onClick={onStart}
        >
          Start
        </button>
        <button
          type="button"
          className="session-rec-btn session-rec-btn-stop"
          data-testid={`${rootTestId}-stop`}
          aria-label="Stop recording session"
          disabled={stopDisabled || onStop === undefined}
          onClick={onStop}
        >
          Stop
        </button>
        <button
          type="button"
          className="session-rec-btn session-rec-btn-discard"
          data-testid={`${rootTestId}-discard`}
          aria-label="Discard recording"
          disabled={discardDisabled || onDiscard === undefined}
          onClick={onDiscard}
        >
          Discard
        </button>
      </div>
    </section>
  );
}
