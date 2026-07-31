// SPDX-License-Identifier: Apache-2.0
/**
 * Typed feature-flag registry per plan Section 0.2.
 *
 * Phase 0 backing is env-only: a flag is on iff the env var is "1" or "true",
 * else off. DB backing + admin UI overrides land in PR 9. Each flag declares
 * a default and whether it gates a harm-path action — harm-path flags MUST
 * route changes through the two-person approval state machine (R-F1).
 *
 * Flags ship flag-off when harm-path; the documented enable procedure is
 * the two-person flow + WORM-logged toggle (per Appendix C P0).
 */

export interface FlagDefinition {
  readonly default: boolean;
  /**
   * `true` when toggling this flag affects a harm-path action (probes,
   * unaligned-attacker engagements, ingestion of leaked content). Required
   * by two-person-approval gating (R-F1).
   */
  readonly harmPath: boolean;
  /**
   * `true` when this flag is resolved at build time (e.g.,
   * CL4R1T4S_ARCHIVE_BUNDLED). Build-time flags ignore runtime overrides.
   */
  readonly buildTime?: boolean;
  readonly description: string;
}

/**
 * The full Section 0.2 registry. Defaults follow the safer
 * "prod-initial" column; staging deployments can override via env var.
 */
export const FLAGS = {
  SENSEI_GODMODE_ENABLED: {
    default: true,
    harmPath: false,
    description: 'Gap 1 godmode tier',
  },
  AMATERASU_FEED_ENABLED: {
    default: false,
    harmPath: false,
    description: 'Gap 2 community-corpus feed sync; prod-default off',
  },
  ATEMI_ENABLED: {
    default: false,
    harmPath: true,
    description: 'Gap 3 product-UI probe master switch',
  },
  ATEMI_TARGET_CLAUDE: {
    default: false,
    harmPath: true,
    description: 'Gap 3 per-target gate',
  },
  ATEMI_TARGET_CHATGPT: {
    default: false,
    harmPath: true,
    description: 'Gap 3 per-target gate',
  },
  ATEMI_TARGET_GEMINI: {
    default: false,
    harmPath: true,
    description: 'Gap 3 per-target gate',
  },
  HYDRA_LOOP_ENABLED: {
    default: true,
    harmPath: false,
    description: 'Gap 4 closed-loop refusal-aware rewriter',
  },
  KUMITE_LONG_MATCH_ENABLED: {
    default: true,
    harmPath: false,
    description: 'Gap 5 multi-turn long-form match',
  },
  ONIGAESHI_ENABLED: {
    default: false,
    harmPath: true,
    description: 'Gap 6 unaligned-attacker adapter — flag-off until Phase E',
  },
  AZURE_CONTENT_SAFETY_ENABLED: {
    default: false,
    harmPath: true,
    description:
      'Gap 6 v1-deferred Azure Content Safety driver — requires ONIGAESHI_ENABLED + env-supplied key',
  },
  HUGGINGFACE_DRIVER_ENABLED: {
    default: false,
    harmPath: true,
    description:
      'Gap 6 v1-deferred HuggingFace open-weights driver — requires ONIGAESHI_ENABLED',
  },
  OLLAMA_DRIVER_ENABLED: {
    default: false,
    harmPath: true,
    description:
      'Gap 6 v1-deferred Ollama local-weights driver — requires ONIGAESHI_ENABLED',
  },
  KOTOBA_DIALECTS_ENABLED: {
    default: true,
    harmPath: false,
    description: 'Gap 7 dialect library',
  },
  KOKUGIKAN_ENABLED: {
    default: false,
    harmPath: false,
    description: 'Gap 9 leaderboard + moderation',
  },
  BUSHIDO_ENABLED: {
    default: false,
    harmPath: false,
    description: 'Gap 10 chain orchestrator',
  },
  PLINY_INGEST_ENABLED: {
    default: false,
    harmPath: true,
    description: 'Gap 11 master ingest switch',
  },
  CL4R1T4S_ARCHIVE_ENABLED: {
    default: false,
    harmPath: true,
    description: 'Gap 11.2 leak archive read path; gated on E3 legal',
  },
  CL4R1T4S_ARCHIVE_BUNDLED: {
    default: false,
    harmPath: true,
    buildTime: true,
    description:
      'Build-time toggle: when true, the build bundles ingested leak archive content (internal deployment only)',
  },
  ARENA_SEASONS_ENABLED: {
    default: false,
    harmPath: false,
    description: 'Gap 11.5 seasonal leaderboards',
  },
  // ---------------------------------------------------------------------
  // Gap 13 — Multi-model comparative evaluation (v1 scope cut).
  // Phase F, off critical path. All default-off; v1 primitives only.
  // ---------------------------------------------------------------------
  OPENROUTER_ENABLED: {
    default: false,
    harmPath: true,
    description:
      'Gap 13.1 OpenRouter provider adapter — org-level opt-in; prompts transit third party',
  },
  KUMITE_RACE_ENABLED: {
    default: false,
    harmPath: false,
    // NOTE (post-#187 L-2): `KUMITE_RACE_ENABLED` alone only gates the
    // race orchestrator. External data transmission to any third-party
    // provider (OpenRouter) ALSO requires `OPENROUTER_ENABLED` (harmPath).
    // Both must be true before any prompt leaves the dojo boundary.
    description:
      'Gap 13.2 KUMITE parallel race — multi-model fan-out (reserve-then-commit budget). External transmission additionally requires OPENROUTER_ENABLED.',
  },
  ADAPTIVE_SAMPLER_ENABLED: {
    default: false,
    harmPath: true,
    description:
      'Gap 13.3 adaptive-sampler MUTATOR — observer is always on; mutator flag-off',
  },
  CONSISTENCY_REWRITER_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'Gap 13.4 output-consistency rewriter — caller-parameterized: ' +
      '`rewriteForConsistency()` accepts `flagEnabled` as input; the ' +
      'caller resolves this flag and passes the boolean. No callsite ' +
      'in dojolm-web yet (library shipped ahead of consumer).',
  },
  TECHNIQUE_CATALOG_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'Gap 13.5 named-technique research catalog (Operator+, read-only). ' +
      'Surfaced through `bu-tpi/catalog#buildBypassMatrix` consumed by ' +
      '/api/admin/eval/leaderboard + /api/admin/eval/export — both routes ' +
      'echo the flag state via `catalogEnabled` so the UI can suppress ' +
      'catalog-joined columns when off.',
  },
  BYPASS_LEADERBOARD_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'Gap 13.7 per-technique×per-model bypass-rate matrix view (Member-only)',
  },
  // ---------------------------------------------------------------------
  // Epic 4B — Member-facing /members/* surface. Master gate on the entire
  // member surface (E4B.1 shell, E4B.2 leaderboard, E4B.3 bypass matrix,
  // E4B.4 seasons, E4B.5 bounty, E4B.6 admin invite UI). All E4B routes
  // and pages must 503 (or render the placeholder body) when this flag
  // is off. Defaults to false so the surface ships dark until the
  // private-beta cutover (decision #11 of the E4B design decisions).
  // ---------------------------------------------------------------------
  MEMBERS_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'Epic 4B master gate — when off, the /members/* surface renders a coming-soon placeholder and /api/admin/members/** + /api/auth/members/** 503.',
  },
  // ---------------------------------------------------------------------
  // Epic 4B.7 — public-beta cutover gate. ADDITIVE to MEMBERS_UI_ENABLED:
  // MEMBERS_PUBLIC_BETA_ENABLED requires MEMBERS_UI_ENABLED=true as a
  // precondition. Off returns the surface to the closed-cohort state
  // (admin-minted invites only; no `/members/request-invite` surface).
  // On lights up the unauthenticated request-invite POST + the
  // `/members/request-invite` page + the `Request one` CTA on the
  // sign-in form. Admin-side drain paths remain available irrespective
  // of this flag so the admin can process any queued requests after
  // the beta is paused.
  // ---------------------------------------------------------------------
  MEMBERS_PUBLIC_BETA_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'Epic 4B.7 additive gate — enables /members/request-invite + the sign-in CTA. Requires MEMBERS_UI_ENABLED=true; off returns the surface to closed-cohort invite-only.',
  },
  // ---------------------------------------------------------------------
  // YR.4 subset 1 (Red-tint cluster) — admin-only v2.1 module pages.
  // Each gates one /admin/<module> route. All default-off so the surface
  // ships dark in production until each module page passes its visual
  // baseline + RBAC fuzz. Read-only viewers, no harm-path actions —
  // state-mutating endpoints (POST /api/scan, /api/arena, /api/sengoku/*)
  // already carry their own rate-limit + role gates. The pages compose
  // YR.6 primitives + live /api/<module>/* backends; flag-off renders a
  // sumi-e EmptyState (states.md COPY) without a 5xx.
  // ---------------------------------------------------------------------
  SCANNER_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.1 — admin /admin/scanner v2.1 module page (Red-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  BUKI_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.2 — admin /admin/buki v2.1 module page (Red-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  JUTSU_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.3 — admin /admin/jutsu v2.1 module page (Red-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  ARENA_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.4 — admin /admin/arena v2.1 module page (Red-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  SENGOKU_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.5 — admin /admin/sengoku v2.1 module page (Red-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  // YR.4 subset 2 (Steel-tint) — Hattori + Kotoba module pages. Same
  // EmptyState contract as subset 1: OFF renders the sumi-e loading
  // motif, never a 5xx; no impact on the live `/api/guard/*` and
  // `/api/kotoba/*` backends (those keep their own auth + rate-limit
  // gates regardless of these flags).
  HATTORI_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.6 — admin /admin/hattori v2.1 module page (Steel-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  KOTOBA_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.7 — admin /admin/kotoba v2.1 module page (Steel-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  // YR.4 subset 3 (Gold-tint) — Mitsuke + Amaterasu + Kagami + Ronin
  // module pages. Same EmptyState contract as subsets 1 + 2: OFF renders
  // the sumi-e loading motif, never a 5xx; no impact on the live
  // `/api/mitsuke/*`, `/api/attackdna/*`, `/api/kagami/*`, and
  // `/api/ronin/*` backends (those keep their own auth + rate-limit
  // gates regardless of these flags).
  MITSUKE_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.8 — admin /admin/mitsuke v2.1 module page (Gold-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  AMATERASU_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.9 — admin /admin/amaterasu v2.1 module page (Gold-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  KAGAMI_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.10 — admin /admin/kagami v2.1 module page (Gold-tint). Off renders sumi-e EmptyState; no API impact. Page renders backend-pending EmptyState when /api/kagami shape is incomplete (YA.1 follow-up).',
  },
  RONIN_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.4.11 — admin /admin/ronin v2.1 module page (Gold-tint). Off renders sumi-e EmptyState; no API impact.',
  },
  SHINGAN_UI_ENABLED: {
    default: false,
    harmPath: false,
    description:
      'YR.20 — admin /admin/shingan trust-scan workbench (Steel-tint). Off renders sumi-e EmptyState; no API impact (the /api/shingan/* withAuth-clean endpoints stay reachable for direct integrations).',
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagName = keyof typeof FLAGS;

export const FLAG_NAMES: readonly FlagName[] = Object.keys(FLAGS) as FlagName[];

export function isHarmPathFlag(name: FlagName): boolean {
  return FLAGS[name].harmPath;
}

export function isBuildTimeFlag(name: FlagName): boolean {
  const def = FLAGS[name] as FlagDefinition;
  return def.buildTime === true;
}

export interface FlagSource {
  /**
   * Returns the resolved value for the flag, or undefined to fall through
   * to the next source (or the default).
   */
  read(name: FlagName): boolean | undefined;
}

const TRUTHY = new Set(['1', 'true', 'on', 'yes', 'enabled']);
const FALSY = new Set(['0', 'false', 'off', 'no', 'disabled']);

export class EnvFlagSource implements FlagSource {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  read(name: FlagName): boolean | undefined {
    const raw = this.env[name];
    if (raw === undefined || raw === '') return undefined;
    const norm = raw.trim().toLowerCase();
    if (TRUTHY.has(norm)) return true;
    if (FALSY.has(norm)) return false;
    return undefined;
  }
}

export class StaticFlagSource implements FlagSource {
  constructor(private readonly overrides: Partial<Record<FlagName, boolean>>) {}

  read(name: FlagName): boolean | undefined {
    return this.overrides[name];
  }
}

/**
 * Resolves a flag in priority order: each source consulted left-to-right;
 * the first source returning a defined value wins. Falls back to the
 * registered default.
 */
export class FlagReader {
  constructor(private readonly sources: readonly FlagSource[]) {}

  isEnabled(name: FlagName): boolean {
    for (const source of this.sources) {
      const value = source.read(name);
      if (value !== undefined) return value;
    }
    return FLAGS[name].default;
  }

  snapshot(): Readonly<Record<FlagName, boolean>> {
    const out: Partial<Record<FlagName, boolean>> = {};
    for (const name of FLAG_NAMES) {
      out[name] = this.isEnabled(name);
    }
    return out as Readonly<Record<FlagName, boolean>>;
  }
}

export function defaultFlagReader(
  env: NodeJS.ProcessEnv = process.env,
): FlagReader {
  return new FlagReader([new EnvFlagSource(env)]);
}
