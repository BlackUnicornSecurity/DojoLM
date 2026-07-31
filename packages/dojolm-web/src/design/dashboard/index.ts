// SPDX-License-Identifier: Apache-2.0
/**
 * design/dashboard — TICKET-D201 / Phase B / CA-7.
 *
 * Barrel for dashboard-only design primitives. Currently scoped to the
 * Shugyō Five Rites onboarding card; future Phase B tickets (D-202+)
 * may add additional dashboard primitives here.
 */

export {
  TrainingScroll,
  RITE_IDS,
  RITE_LABEL,
  RITE_SUB,
  RITE_ROUTE,
  buildPendingStates,
  isRiteId,
  isRiteState,
} from './TrainingScroll';
export type { RiteId, RiteState, TrainingScrollProps } from './TrainingScroll';

export {
  readTrainingScrollState,
  writeTrainingScrollState,
  useTrainingScrollState,
} from './training-scroll-state';
export type {
  TrainingScrollPersisted,
  TrainingScrollHook,
} from './training-scroll-state';

export {
  HaikuLicenseModules,
  HAIKU_LICENSE_MODULES_MAX,
} from './HaikuLicenseModules';
export type { HaikuLicenseModulesProps } from './HaikuLicenseModules';

export { EngineFilterChips, ENGINE_FILTER_CHIPS_MAX } from './EngineFilterChips';
export type { EngineFilterChipsProps } from './EngineFilterChips';
