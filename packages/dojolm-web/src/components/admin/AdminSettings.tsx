/**
 * File: AdminSettings.tsx
 * Purpose: Admin settings tab — session config, security, data retention (with edit mode)
 * Story: S109 (Admin Settings Page), H1.7 (Editable Settings)
 * Index:
 * - AdminSettings component (line 14)
 * - Edit mode state + handlers (line 18)
 * - SessionSettings section (line 60)
 * - SecuritySettings section (line 105)
 * - RetentionSettings section (line 135)
 * - SettingRow sub-component (line 215)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Clock, Database, ShieldCheck, Pencil, Save, X } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface EditableSettings {
  sessionTtlMinutes: number
  retentionDays: number
}

const DEFAULT_SETTINGS: EditableSettings = {
  sessionTtlMinutes: 1440,
  retentionDays: 90,
}

export function AdminSettings() {
  const [isEditing, setIsEditing] = useState(false)
  const [settings, setSettings] = useState<EditableSettings>(DEFAULT_SETTINGS)
  const [draft, setDraft] = useState<EditableSettings>(DEFAULT_SETTINGS)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        const loaded: EditableSettings = {
          sessionTtlMinutes: typeof data.sessionTtlMinutes === 'number' ? data.sessionTtlMinutes : DEFAULT_SETTINGS.sessionTtlMinutes,
          retentionDays: typeof data.retentionDays === 'number' ? data.retentionDays : DEFAULT_SETTINGS.retentionDays,
        }
        setSettings(loaded)
        setDraft(loaded)
      }
    } catch {
      // Use defaults on error
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleEdit = () => {
    setDraft({ ...settings })
    setSaveError(null)
    setSaveSuccess(false)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDraft({ ...settings })
    setSaveError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)

    // Client-side validation
    if (draft.sessionTtlMinutes < 5 || draft.sessionTtlMinutes > 1440) {
      setSaveError('Session TTL must be between 5 and 1440 minutes.')
      return
    }
    if (draft.retentionDays < 1 || draft.retentionDays > 365) {
      setSaveError('Retention days must be between 1 and 365.')
      return
    }
    if (!Number.isInteger(draft.sessionTtlMinutes) || !Number.isInteger(draft.retentionDays)) {
      setSaveError('Values must be whole numbers.')
      return
    }

    try {
      const res = await fetchWithAuth('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTtlMinutes: draft.sessionTtlMinutes,
          retentionDays: draft.retentionDays,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Save failed' }))
        setSaveError(body.error || 'Save failed')
        return
      }
      const saved = await res.json()
      const updated: EditableSettings = {
        sessionTtlMinutes: saved.sessionTtlMinutes ?? draft.sessionTtlMinutes,
        retentionDays: saved.retentionDays ?? draft.retentionDays,
      }
      setSettings(updated)
      setDraft(updated)
      setSaveSuccess(true)
      setIsEditing(false)
    } catch {
      setSaveError('Network error — unable to save settings.')
    }
  }

  const sessionTtlDisplay = `${settings.sessionTtlMinutes} minutes`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Admin Settings
        </h3>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground motion-safe:transition-colors"
              aria-label="Edit settings"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white motion-safe:transition-colors"
                aria-label="Save settings"
              >
                <Save className="h-3 w-3" aria-hidden="true" />
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground motion-safe:transition-colors"
                aria-label="Cancel editing"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div role="alert" className="p-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div role="status" className="p-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md">
          Settings saved successfully.
        </div>
      )}

      {/* Session Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Session Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="sessionTtlMinutes">
                Session TTL (minutes)
              </label>
              <input
                id="sessionTtlMinutes"
                type="number"
                min={5}
                max={1440}
                step={1}
                value={draft.sessionTtlMinutes}
                onChange={(e) => setDraft(prev => ({ ...prev, sessionTtlMinutes: Number(e.target.value) }))}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Range: 5 - 1440 minutes</p>
            </div>
          ) : (
            <SettingRow
              label="Session TTL"
              value={sessionTtlDisplay}
              description="Session time-to-live (editable)"
            />
          )}
          <SettingRow
            label="Session Storage"
            value="SQLite (better-sqlite3)"
            description="Sessions stored as SHA-256 hashes in the sessions table"
          />
          <SettingRow
            label="Cookie Security"
            value="HttpOnly + Secure + SameSite=Strict"
            description="Session cookie is not accessible to JavaScript"
          />
        </CardContent>
      </Card>

      {/* Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Security Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            label="Password Hashing"
            value="bcrypt (12 rounds)"
            description="High-security password hashing with intentional slowdown"
          />
          <SettingRow
            label="CSRF Protection"
            value="Double-submit cookie pattern"
            description="CSRF token in cookie + X-CSRF-Token header for mutations"
          />
          <SettingRow
            label="Rate Limiting"
            value="100 req/min (API) / 300 req/min (UI)"
            description="Sliding window rate limiter with auth failure tracking (10/min)"
          />
          <SettingRow
            label="API Authentication"
            value="Via NODA_API_KEY env var"
            description="Programmatic access with timing-safe comparison (set server-side)"
          />
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Data Retention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="retentionDays">
                Data Retention (days)
              </label>
              <input
                id="retentionDays"
                type="number"
                min={1}
                max={365}
                step={1}
                value={draft.retentionDays}
                onChange={(e) => setDraft(prev => ({ ...prev, retentionDays: Number(e.target.value) }))}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Range: 1 - 365 days</p>
            </div>
          ) : (
            <SettingRow
              label="Default Retention"
              value={`${settings.retentionDays} days`}
              description="Test results and execution data retention period (editable)"
            />
          )}
          <SettingRow
            label="Maximum Retention"
            value="365 days"
            description="Maximum configurable retention period"
          />
          <SettingRow
            label="Max Results per Model"
            value="10,000"
            description="Results archived after this threshold"
          />
        </CardContent>
      </Card>

      {/* RBAC Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Role-Based Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Models</th>
                  <th className="pb-2 pr-4 font-medium">Tests</th>
                  <th className="pb-2 pr-4 font-medium">Users</th>
                  <th className="pb-2 font-medium">Settings</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-b border-muted">
                  <td className="py-2 pr-4 font-medium">Admin</td>
                  <td className="py-2 pr-4">Full CRUD</td>
                  <td className="py-2 pr-4">Full CRUD + Execute</td>
                  <td className="py-2 pr-4">Full CRUD</td>
                  <td className="py-2">Read + Update</td>
                </tr>
                <tr className="border-b border-muted">
                  <td className="py-2 pr-4 font-medium">Analyst</td>
                  <td className="py-2 pr-4">Read + Create + Update</td>
                  <td className="py-2 pr-4">Read + Create + Execute</td>
                  <td className="py-2 pr-4">None</td>
                  <td className="py-2">None</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Viewer</td>
                  <td className="py-2 pr-4">Read only</td>
                  <td className="py-2 pr-4">Read only</td>
                  <td className="py-2 pr-4">None</td>
                  <td className="py-2">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">{value}</span>
    </div>
  )
}
