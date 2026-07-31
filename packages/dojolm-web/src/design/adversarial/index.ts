// SPDX-License-Identifier: Apache-2.0
/**
 * Adversarial design barrel — TICKET-L-702.
 *
 * Re-exports the four adversarial sub-components restored under the
 * V1→V2 program. These primitives are pure-presentational; consumer
 * pages (currently `(shell)/admin/atemi/page.tsx`) wire data + handlers.
 */

export {
  DefenseDegradationIndicator,
  DEFENSE_DEGRADATION_LEVELS,
  DEFENSE_DEGRADATION_SCORE_MAX,
  DEFENSE_DEGRADATION_BREACH_MAX,
  DEFENSE_DEGRADATION_INCIDENT_MAX,
  isDefenseDegradationLevel,
  type DefenseDegradationIndicatorProps,
  type DefenseDegradationLevel,
} from './DefenseDegradationIndicator';

export {
  McpConnectorStatus,
  MCP_CONNECTOR_STATES,
  MCP_MODES,
  MCP_CONNECTOR_LATENCY_MAX,
  MCP_CONNECTOR_UPTIME_MAX,
  MCP_CONNECTOR_ERROR_MAX,
  isMcpConnectorState,
  isMcpMode,
  type McpConnectorStatusProps,
  type McpConnectorState,
  type McpMode,
} from './McpConnectorStatus';

export {
  SessionRecorder,
  SESSION_RECORDER_STATES,
  SESSION_RECORDER_DURATION_MAX,
  SESSION_RECORDER_EVENT_MAX,
  SESSION_RECORDER_BYTES_MAX,
  SESSION_RECORDER_SESSION_ID_MAX,
  isSessionRecorderState,
  type SessionRecorderProps,
  type SessionRecorderState,
} from './SessionRecorder';

export {
  AttackLog,
  ATTACK_LOG_SEVERITIES,
  ATTACK_LOG_OUTCOMES,
  ATTACK_LOG_ATTACK_CLASSES,
  ATTACK_LOG_MAX_ROWS,
  isAttackLogSeverity,
  isAttackLogOutcome,
  isAttackLogAttackClass,
  type AttackLogProps,
  type AttackLogEntry,
  type AttackLogSeverity,
  type AttackLogOutcome,
  type AttackLogAttackClass,
} from './AttackLog';
