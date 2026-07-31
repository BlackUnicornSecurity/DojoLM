// SPDX-License-Identifier: Apache-2.0
/**
 * TEAM_MODE deployment configuration per plan Section 0.1.0 + DEC-8.
 *
 * Product deploys in one of two modes chosen per-install:
 * - `solo`: roles collapse; harm-path actions gated by disclaimer + WORM log.
 * - `multi`: full RBAC + two-person enforcement per Section 0.1.
 *
 * DEV_MODE_BYPASS_TWO_PERSON is a developer-only test convenience that
 * short-circuits approval waits. It is hard-rejected in production at boot.
 */

export const TEAM_MODES = ['solo', 'multi'] as const;
export type TeamMode = (typeof TEAM_MODES)[number];

export interface TeamModeConfig {
  readonly mode: TeamMode;
  readonly bypassTwoPerson: boolean;
  readonly nodeEnv: string;
}

export class InvalidTeamModeError extends Error {
  readonly code = 'CONFIG.TEAM_MODE.INVALID' as const;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTeamModeError';
  }
}

export class DevBypassInProdError extends Error {
  readonly code = 'CONFIG.DEV_BYPASS_IN_PROD' as const;
  constructor() {
    super(
      'DEV_MODE_BYPASS_TWO_PERSON=true is not allowed when NODE_ENV=production. Unset the env var or change NODE_ENV before starting the server.',
    );
    this.name = 'DevBypassInProdError';
  }
}

function parseTeamMode(value: string | undefined): TeamMode {
  if (value === undefined || value === '') {
    throw new InvalidTeamModeError(
      'TEAM_MODE is required. Set to "solo" or "multi" during first-run setup (see the deployment guide).',
    );
  }
  if (!(TEAM_MODES as readonly string[]).includes(value)) {
    throw new InvalidTeamModeError(
      `TEAM_MODE="${value}" is invalid. Expected one of: ${TEAM_MODES.join(', ')}.`,
    );
  }
  return value as TeamMode;
}

function parseBypass(
  value: string | undefined,
  nodeEnv: string | undefined,
): boolean {
  const wantsBypass = value === 'true' || value === '1';
  if (!wantsBypass) return false;
  if (nodeEnv === 'production') {
    throw new DevBypassInProdError();
  }
  return true;
}

export function loadTeamModeConfig(
  env: NodeJS.ProcessEnv = process.env,
): TeamModeConfig {
  const mode = parseTeamMode(env.TEAM_MODE);
  const nodeEnv = env.NODE_ENV ?? 'development';
  const bypassTwoPerson = parseBypass(env.DEV_MODE_BYPASS_TWO_PERSON, nodeEnv);
  return { mode, bypassTwoPerson, nodeEnv };
}

/**
 * Call once at app startup. Fails fast with a readable error before any
 * role or flag logic runs.
 */
export function assertTeamModeAtBoot(
  env: NodeJS.ProcessEnv = process.env,
): TeamModeConfig {
  return loadTeamModeConfig(env);
}

/**
 * Solo mode collapses RBAC: any action is allowed to the single user under
 * disclaimer gating. Callers use this to skip assertDisjointRoles and
 * two-person approval checks when the deployment is solo.
 */
export function isSoloMode(config: TeamModeConfig): boolean {
  return config.mode === 'solo';
}

export function isMultiMode(config: TeamModeConfig): boolean {
  return config.mode === 'multi';
}
