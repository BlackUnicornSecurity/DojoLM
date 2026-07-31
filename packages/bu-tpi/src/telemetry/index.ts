// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/telemetry (Gap 8).
 */
export type {
  BaseEvent,
  BuildChannel,
  EventFilter,
  EventSource,
  EventType,
  RedactedPayload,
  TelemetrySink,
} from './types.js';

export type {
  LLMCallMetadata,
  LLMTier,
  LLMVendor,
} from './llm-call-metadata.js';
export { llmCallMetadataSchema } from './llm-call-metadata.js';

export type {
  DojoEvent,
  FlagToggledEvent,
  KillswitchTriggeredEvent,
  KumiteMatchTurnEvent,
  RbacDeniedEvent,
  SenseiBudgetDecisionEvent,
  SenseiHydraTurnEvent,
  SenseiHydraBreakthroughEvent,
  SenseiHydraBudgetAbortEvent,
  SenseiHydraConvergedEvent,
  SenseiTierCallEvent,
  AtemiKillswitchHonoredEvent,
  KotobaDialectRankedEvent,
  L1b3rt4sRoutedEvent,
  Cl4r1t4sIngestedEvent,
} from './events.js';
export { dojoEventSchema } from './events.js';

export {
  TelemetryRedactionError,
  redactString,
  rejectIfRaw,
  deepRedact,
} from './redaction.js';

export {
  TelemetryEmitter,
  TelemetryValidationError,
  defaultEmitter,
} from './emitter.js';

export { NoopSink, ConsoleSink } from './sinks/index.js';
export type { ConsoleSinkOptions } from './sinks/index.js';
