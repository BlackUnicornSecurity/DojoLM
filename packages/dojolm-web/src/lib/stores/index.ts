/**
 * stores/index.ts — H-03: Central typed store registry
 *
 * All client-side persisted-state stores in one place.
 * Built on createStore / createRawStringStore from @/lib/client-storage.
 *
 * Taxonomy:
 *   session  – cleared on tab close (security-sensitive or ephemeral)
 *   local    – persists across sessions (user preferences, long-lived cache)
 *
 * Naming: <featureArea><Purpose>Store — e.g. senseiMessagesStore, roninConfigStore.
 * Dynamic keys: use createDismissedStore(key) or createComplianceChecklistStore(id).
 */

import { z } from 'zod'
import { createStore, createRawStringStore, type ClientStore } from '@/lib/client-storage'

// ---------------------------------------------------------------------------
// Re-export primitives so consumers only need one import
// ---------------------------------------------------------------------------

export { createRawStringStore } from '@/lib/client-storage'

// ---------------------------------------------------------------------------
// Shared schema fragments
// ---------------------------------------------------------------------------

const nullableRecord = z.record(z.unknown()).nullable()
const unknownArray = z.array(z.unknown())
const stringRecord = z.record(z.unknown())
const boolRecord = z.record(z.boolean())

// ---------------------------------------------------------------------------
// SESSION stores — cleared on tab / browser close
// ---------------------------------------------------------------------------

/**
 * API key — session-scoped (auth). Raw string (legacy compat).
 * fetch-with-auth.ts also maintains a localStorage fallback (apiKeyLocalStore).
 */
export const apiKeySessionStore = createRawStringStore('noda-api-key', 'session')

/**
 * API key — localStorage fallback for private-browsing / session-storage-blocked envs.
 * Only used by fetch-with-auth.ts migration logic; prefer apiKeySessionStore.
 */
export const apiKeyLocalStore = createRawStringStore('noda-api-key', 'local')

/**
 * Atemi Lab: target model selected for the current session. Raw string (legacy compat).
 */
export const atemiTargetModelStore = createRawStringStore('atemi-target-model', 'session')

/**
 * LLM Execution: active batch ID for reconnection. Raw string (legacy compat).
 * Consumers MUST validate format (/^[a-zA-Z0-9_-]{1,64}$/) before use.
 */
export const activeBatchStore = createRawStringStore('llm-active-batch', 'session')

const activityEventStoredSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
})
export type ActivityEventStored = z.infer<typeof activityEventStoredSchema>

/** Activity feed events — session-scoped (cleared on tab close). */
export const activityEventsStore = createStore<ActivityEventStored[]>('dojolm-activity-events', {
  scope: 'session',
  schema: z.array(activityEventStoredSchema),
  defaultValue: [],
})

// ---------------------------------------------------------------------------
// LOCAL stores — persisted across sessions
// ---------------------------------------------------------------------------

/**
 * Atemi Lab: session list.
 * Loose schema — atemi-session-storage.ts applies domain validation on top.
 */
export const atemiSessionsRawStore = createStore<unknown[]>('atemi-sessions', {
  scope: 'local',
  schema: unknownArray,
  defaultValue: [],
})

/**
 * Atemi Lab: config snapshot.
 * Null when no config persisted. Consumers apply domain-level validation.
 */
export const atemiConfigRawStore = createStore<Record<string, unknown> | null>('atemi-config', {
  scope: 'local',
  schema: nullableRecord,
  defaultValue: null,
})

const senseiMessageStoredSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.number(),
})
export type SenseiMessageStored = z.infer<typeof senseiMessageStoredSchema>

/** Sensei: persisted conversation messages (toolCalls/toolResults stripped). */
export const senseiMessagesStore = createStore<SenseiMessageStored[]>('sensei-messages', {
  scope: 'local',
  schema: z.array(senseiMessageStoredSchema),
  defaultValue: [],
})

/** Sensei / ProvisionSenseiStep: selected model ID. Raw string (legacy compat). */
export const senseiModelStore = createRawStringStore('sensei-model', 'local')

/**
 * Dashboard: layout config.
 * Null when not persisted. DashboardConfigContext applies migration + validation.
 */
export const dashboardConfigRawStore = createStore<Record<string, unknown> | null>('noda-dashboard-config', {
  scope: 'local',
  schema: nullableRecord,
  defaultValue: null,
})

/**
 * Dashboard: pre-migration backup (written once during v1→v2 migration).
 */
export const dashboardBackupRawStore = createStore<Record<string, unknown> | null>('noda-dashboard-config-backup', {
  scope: 'local',
  schema: nullableRecord,
  defaultValue: null,
})

/** Ronin Hub: generic config (defaultTab, showRewards, pageSize, etc.). */
export const roninConfigStore = createStore<Record<string, unknown>>('noda-ronin-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/** Ronin Hub / Programs: subscribed program IDs. */
export const roninSubscriptionsStore = createStore<string[]>('noda-ronin-subscriptions', {
  scope: 'local',
  schema: z.array(z.string()),
  defaultValue: [],
})

/**
 * Ronin Hub / Submissions: saved submission records.
 * Loose schema — SubmissionsTab validates domain fields.
 */
export const roninSubmissionsRawStore = createStore<unknown[]>('noda-ronin-submissions', {
  scope: 'local',
  schema: unknownArray,
  defaultValue: [],
})

/** Jutsu: model-centric view config. */
export const jutsuConfigStore = createStore<Record<string, unknown>>('noda-jutsu-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/**
 * Compliance: framework ID forwarded to Atemi Lab test runner. Raw string (legacy compat).
 * Written by ComplianceCenter, read by TestExecution + JutsuTab.
 */
export const jutsuComplianceFrameworkStore = createRawStringStore('jutsu-compliance-framework', 'local')

/**
 * Compliance: legacy key (renamed from llm-compliance-framework → jutsu-compliance-framework).
 * Read + remove only by TestExecution during in-flight migration.
 */
export const llmComplianceFrameworkStore = createRawStringStore('llm-compliance-framework', 'local')

/** Module sidebar: per-module visibility toggle map. */
export const moduleVisibilityStore = createStore<Record<string, boolean>>('noda-module-vis', {
  scope: 'local',
  schema: boolRecord,
  defaultValue: {},
})

/**
 * OBL Behavioral Analysis: analysis result cache.
 * Loose schema — BehavioralAnalysisContext validates schemaVersion and shape.
 */
export const oblCacheStore = createStore<Record<string, unknown>>('obl-analysis-v1', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

const oblActiveModelSchema = z.object({ id: z.string(), name: z.string() }).nullable()

/** OBL: currently active model identity for cross-surface sharing. */
export const oblActiveModelStore = createStore<{ id: string; name: string } | null>('obl-active-model', {
  scope: 'local',
  schema: oblActiveModelSchema,
  defaultValue: null,
})

const scoreHistoryEntrySchema = z.object({
  score: z.number(),
  timestamp: z.string(),
}).passthrough()

/** Leaderboard: per-model score history. */
export const scoreHistoryStore = createStore<Record<string, z.infer<typeof scoreHistoryEntrySchema>[]>>('dojolm-score-history', {
  scope: 'local',
  schema: z.record(z.array(scoreHistoryEntrySchema)),
  defaultValue: {},
})

/** Kumite: SAGE mutation config. */
export const kumiteSageStore = createStore<Record<string, unknown>>('kumite-sage-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/** Kumite: Arena match config. */
export const kumiteArenaStore = createStore<Record<string, unknown>>('kumite-arena-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/** Kumite: Mitsuke analysis config. */
export const kumiteMitsukeStore = createStore<Record<string, unknown>>('kumite-mitsuke-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/** Mitsuke: user-defined intelligence sources. */
export const mitsukeUserSourcesStore = createStore<unknown[]>('mitsuke-user-sources', {
  scope: 'local',
  schema: unknownArray,
  defaultValue: [],
})

/** Amaterasu DNA: visualization / sync config. */
export const amaterasuConfigStore = createStore<Record<string, unknown>>('amaterasu-config', {
  scope: 'local',
  schema: stringRecord,
  defaultValue: {},
})

/** Amaterasu DNA: guide panel dismissed flag. */
export const amaterasuGuideDismissedStore = createStore<boolean>('amaterasu-guide-dismissed', {
  scope: 'local',
  schema: z.boolean(),
  defaultValue: false,
})

/** Atemi Lab: getting-started checklist dismissed flag. */
export const atemiGettingStartedDismissedStore = createStore<boolean>('atemi-getting-started-dismissed', {
  scope: 'local',
  schema: z.boolean(),
  defaultValue: false,
})

/** Dashboard: welcome / onboarding panel dismissed flag. */
export const onboardingDismissedStore = createStore<boolean>('dojo-onboarding-dismissed', {
  scope: 'local',
  schema: z.boolean(),
  defaultValue: false,
})

// ---------------------------------------------------------------------------
// Dynamic-key factory functions
// ---------------------------------------------------------------------------

/**
 * Create a dismissed-flag store for any arbitrary key.
 * Used by ModuleOnboarding and TestFlowBanner which receive the key as a prop.
 */
export function createDismissedStore(key: string): ClientStore<boolean> {
  return createStore<boolean>(key, {
    scope: 'local',
    schema: z.boolean(),
    defaultValue: false,
  })
}

/**
 * ComplianceChecklist and ComplianceCenter use dynamic keys with a specific
 * naming scheme (`bushido-checklists[-{id}]`, `bushido-coverage-snapshot-{id}`).
 * Those files use getStorage('local') directly to preserve existing key names.
 * No factory function needed here.
 */
