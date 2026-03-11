/**
 * File: AdminSettings.tsx
 * Purpose: Admin settings tab — session config, security, data retention
 * Story: S109 (Admin Settings Page)
 * Index:
 * - AdminSettings component (line 11)
 * - SessionSettings section (line 25)
 * - SecuritySettings section (line 55)
 * - RetentionSettings section (line 85)
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Clock, Database, ShieldCheck } from 'lucide-react'

export function AdminSettings() {
  const sessionTtl = process.env.NEXT_PUBLIC_SESSION_TTL_HOURS || '24'

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Admin Settings
      </h3>

      {/* Session Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Session Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            label="Session TTL"
            value={`${sessionTtl} hours`}
            description="Configure via TPI_SESSION_TTL_HOURS environment variable"
          />
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
          <SettingRow
            label="Default Retention"
            value="90 days"
            description="Test results and execution data retention period"
          />
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
