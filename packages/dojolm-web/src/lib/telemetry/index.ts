// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/telemetry/index.ts
 * Purpose: Minimal event emitter scaffold for Wave 1 feature work.
 *
 * Vocabulary defined in docs/telemetry/events.md. Sink selection is
 * deferred (Track E pending stakeholder sign-off) — this module writes
 * to console in dev and is a no-op in production until a real sink
 * lands. All call sites should use `emit()` today; swapping the
 * transport is a single-file change here.
 *
 * Wave 0 Track E.1 / Wave 1 scaffold (2026-04-18).
 */

export type FeatureErrorClass =
  | 'network'
  | 'validation'
  | 'auth'
  | 'internal'
  | 'permission'
  | 'precondition'

export type FeatureUsedOutcome = 'success' | 'empty' | 'partial'

export type TelemetryEvent =
  | {
      name: 'feature_used'
      module_id: string
      action: string
      outcome?: FeatureUsedOutcome
      latency_ms?: number
    }
  | {
      name: 'feature_error'
      module_id: string
      error_class: FeatureErrorClass
      error_code: string
      route?: string
    }
  | {
      name: 'preview_clicked'
      module_id: string
      mode: 'preview' | 'partial'
      source?: string
    }
  | {
      name: 'mock_served'
      route: string
      handler_name: string
    }
  | {
      name: 'api_auth_denied'
      route: string
      reason:
        | 'no_session'
        | 'insufficient_role'
        | 'csrf_fail'
        | 'rate_limited'
    }
  | {
      name: 'doc_drift_detected'
      metric: 'patterns' | 'groups' | 'categories' | 'fixtures'
      documented: number
      actual: number
    }

export interface TelemetryTransport {
  send(event: TelemetryEvent): void
}

const consoleTransport: TelemetryTransport = {
  send(event) {
    if (typeof console === 'undefined') return
    if (process.env.NODE_ENV === 'production') return
    console.debug('[telemetry]', event.name, event)
  },
}

let activeTransport: TelemetryTransport = consoleTransport

/**
 * Swap the transport — only intended for tests and future sink
 * adapters. Do NOT call from feature code.
 */
export function setTelemetryTransport(transport: TelemetryTransport): void {
  activeTransport = transport
}

/** Restore the default console transport. Test-only. */
export function resetTelemetryTransport(): void {
  activeTransport = consoleTransport
}

/**
 * Emit a telemetry event. Wired into feature code today; transport is
 * a console shim until Track E picks a sink.
 *
 * Swallows errors by design — telemetry must never break the caller.
 */
export function emit(event: TelemetryEvent): void {
  try {
    activeTransport.send(event)
  } catch {
    // Telemetry never throws to the caller.
  }
}
