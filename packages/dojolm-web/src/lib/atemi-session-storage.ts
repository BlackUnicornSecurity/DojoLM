/**
 * File: atemi-session-storage.ts
 * Purpose: Shared localStorage helpers for Atemi Lab session persistence
 * Story: P3.2 - Atemi Lab Session Recording
 * Index:
 * - SESSIONS_KEY constant (line 11)
 * - MAX_SESSIONS constant (line 12)
 * - CONFIG_KEY constant (line 13)
 * - VALID_ATTACK_MODES constant (line 14)
 * - loadSessions helper (line 16)
 * - saveSessions helper (line 35)
 * - loadConfigSnapshot helper (line 45)
 */

import type { AtemiSession, AtemiSessionConfig } from './atemi-session-types'

export const SESSIONS_KEY = 'atemi-sessions'
export const MAX_SESSIONS = 20
export const CONFIG_KEY = 'atemi-config'
const VALID_ATTACK_MODES = ['passive', 'basic', 'advanced', 'aggressive'] as const

export function loadSessions(): AtemiSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is AtemiSession =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as Record<string, unknown>).id === 'string' &&
        typeof (s as Record<string, unknown>).name === 'string',
    )
  } catch {
    return []
  }
}

export function saveSessions(sessions: AtemiSession[]): void {
  if (typeof window === 'undefined') return
  const trimmed = sessions.slice(0, MAX_SESSIONS)
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed))
  } catch {
    // QuotaExceededError — storage full. Intentionally silent: session data
    // is non-critical and the user can clear old sessions from the UI.
  }
}

export function loadConfigSnapshot(): AtemiSessionConfig {
  const defaults: AtemiSessionConfig = {
    targetModel: '',
    attackMode: 'passive',
    concurrency: 1,
    timeoutMs: 30000,
    autoLog: true,
  }
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults
    const obj = parsed as Record<string, unknown>
    const rawMode = typeof obj.attackMode === 'string' ? obj.attackMode : defaults.attackMode
    return {
      targetModel: typeof obj.targetModel === 'string' ? obj.targetModel.slice(0, 256) : defaults.targetModel,
      attackMode: (VALID_ATTACK_MODES as readonly string[]).includes(rawMode) ? rawMode : defaults.attackMode,
      concurrency: typeof obj.concurrency === 'number' ? Math.min(10, Math.max(1, Math.round(obj.concurrency))) : defaults.concurrency,
      timeoutMs: typeof obj.timeoutMs === 'number' ? Math.min(120000, Math.max(5000, obj.timeoutMs)) : defaults.timeoutMs,
      autoLog: typeof obj.autoLog === 'boolean' ? obj.autoLog : defaults.autoLog,
    }
  } catch {
    return defaults
  }
}
