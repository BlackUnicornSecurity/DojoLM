// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/config.
 */
export {
  TEAM_MODES,
  InvalidTeamModeError,
  DevBypassInProdError,
  loadTeamModeConfig,
  assertTeamModeAtBoot,
  isSoloMode,
  isMultiMode,
} from './team-mode.js';
export type { TeamMode, TeamModeConfig } from './team-mode.js';
