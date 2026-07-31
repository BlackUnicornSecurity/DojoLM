// SPDX-License-Identifier: Apache-2.0
/**
 * Core types for the bu-tpi telemetry module (Gap 8).
 *
 * Events flow: emit() → validate → redact (R-T1) → fan-out to sinks.
 * Telemetry is observational ONLY; budget decisions live in the
 * budget-ledger module (DEC-3).
 */

/** Identifies which module or subsystem produced the event. */
export type EventSource =
  | 'sensei'
  | 'atemi'
  | 'amaterasu'
  | 'kumite'
  | 'onigaeshi'
  | 'kotoba'
  | 'kokugikan'
  | 'bushido'
  | 'admin'
  | 'rbac'
  | 'scanner'
  | 'industry_tools'
  | 'arena';

/** Discriminated union tag — every event carries its literal type name. */
export type EventType = string;

/** Build channel — determines uploader posture + tenancy semantics. */
export type BuildChannel = 'community' | 'team' | 'enterprise' | 'sovereign';

/**
 * Base shape every event must conform to.
 *
 * Commercial primitives (Gap 8+ Amendment §3.1):
 * `schemaV`, `installId`, `installToken`, `buildChannel`, `sdkVersion`
 * are required. `tenantId` is optional on community builds; required on
 * team/enterprise/sovereign (enforced via schema refinement at the
 * `dojoEventSchema` union level).
 */
export interface BaseEvent {
  /** Unique event ID (UUID v4). */
  readonly id: string;
  /** Discriminant tag. Concrete shapes narrow this to a string literal. */
  readonly type: EventType;
  /** ISO-8601 UTC timestamp. */
  readonly ts: string;
  /** Module that emitted the event. */
  readonly source: EventSource;

  /** Wire-format version. Bump on breaking change; v1 is 24mo minimum. */
  readonly schemaV: 1;
  /** Anonymous install hash; stable per install; user-resettable. */
  readonly installId: string;
  /** Server-issued handshake token; required at ingest (HIGH-1). */
  readonly installToken: string;
  /** Tenant identifier; absent on community free-tier uploads. */
  readonly tenantId?: string;
  /** Build channel; governs uploader + tenancy rules. */
  readonly buildChannel: BuildChannel;
  /** SDK version string, e.g. `bu-tpi@0.2.0`. */
  readonly sdkVersion: string;
}

/**
 * A redacted payload field — raw string replaced with hash + length.
 * See R-T1: prevents leak-content in telemetry streams.
 */
export interface RedactedPayload {
  readonly hash: string;
  readonly len: number;
}

/** Filter for querying persisted events from a sink. */
export interface EventFilter {
  readonly type?: string;
  readonly source?: EventSource;
  readonly since?: string;
  readonly until?: string;
  readonly limit?: number;
}

/** A telemetry sink that receives validated+redacted events. */
export interface TelemetrySink {
  readonly id: string;
  write(event: BaseEvent): Promise<void>;
  /** Optional: read events back (for local dev / audit replay). */
  query?(filter: EventFilter): AsyncIterable<BaseEvent>;
  /** Called on shutdown so the sink can flush its internal buffer. */
  flush?(): Promise<void>;
}
