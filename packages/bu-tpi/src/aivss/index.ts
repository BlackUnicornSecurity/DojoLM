// SPDX-License-Identifier: Apache-2.0
/**
 * AIVSS public surface.
 *
 * Phase G.1 / TICKET-G1 — V1→V2 Restoration program.
 *
 * @see ADR-0097 §5 — Library shape
 */

export {
  AC_WEIGHTS,
  AIVSS_ATTACK_COMPLEXITIES,
  AIVSS_ATTACK_VECTORS,
  AIVSS_BANDS,
  AIVSS_DS_LEVELS,
  AIVSS_EXPLOITABILITIES,
  AIVSS_IMPACT_LEVELS,
  AIVSS_MC_TIERS,
  AIVSS_PIS_RATES,
  AIVSS_REMEDIATION_LEVELS,
  AIVSS_SCOPES,
  AV_WEIGHTS,
  BAND_CSS_KEY,
  BAND_THRESHOLDS,
  DS_WEIGHTS,
  E_WEIGHTS,
  IMPACT_WEIGHTS,
  MC_WEIGHTS,
  PIS_WEIGHTS,
  RL_WEIGHTS,
  S_WEIGHTS,
  type AivssAttackComplexity,
  type AivssAttackVector,
  type AivssBand,
  type AivssDs,
  type AivssExploitability,
  type AivssImpact,
  type AivssMc,
  type AivssMetrics,
  type AivssPis,
  type AivssRl,
  type AivssScope,
  type AivssScore,
} from './aivss-spec';

export { calculate } from './aivss-calculator';

export { VECTOR_PREFIX, parseVector, serializeVector } from './aivss-vector';

export {
  DEFAULT_HATTORI_THRESHOLDS,
  HATTORI_TARGET_MODES,
  evaluateHattoriThresholds,
  isValidThresholdRule,
  type HattoriTargetMode,
  type HattoriThresholdRule,
} from './hattori-thresholds';

export {
  APPROVAL_ELEVATION_REASONS,
  DEFAULT_APPROVAL_ELEVATION_POLICY,
  decideApprovalElevation,
  isValidApprovalElevationPolicy,
  type ApprovalElevationDecision,
  type ApprovalElevationPolicy,
  type ApprovalElevationReason,
} from './approval-elevation';

export {
  RESCORE_OUTCOMES,
  buildRescorePlan,
  type RescoreInputRecord,
  type RescoreOutcome,
  type RescorePlan,
  type RescorePlanEntry,
} from './bulk-rescore';

export {
  SENSEI_TOOL_AIVSS_AWARE,
  SUGGESTION_BAND_FILTERS,
  extractScoredFromToolResult,
  filterSuggestionsByMinBand,
  isSenseiAivssAwareTool,
  type BandTaggedSuggestion,
  type SenseiAivssAwareTool,
  type SenseiScoredRecord,
  type SuggestionBandFilter,
  type SuggestionMinBand,
} from './sensei-tools';
