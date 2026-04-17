/**
 * File: UserManagement.tsx
 * Purpose: User management tab for AdminPanel — list, create, toggle users
 * Story: S107 (User Management Admin Page)
 * Index:
 * - SafeUser type (line 14)
 * - UserManagement component (line 22)
 * - CreateUserDialog (line 100)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { UserPlus, Shield, ShieldCheck, Eye, UserX, UserCheck, Loader2 } from 'lucide-react'

interface SafeUser {
  id: string
  username: string
  email: string | null
  role: string
  display_name: string | null
  created_at: string
  last_login_at: string | null
  enabled: number
}

const ROLE_ICONS = {
  admin: ShieldCheck,
  analyst: Shield,
  viewer: Eye,
} as const

export function UserManagement() {
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      } else {
        setError('Failed to load users')
      }
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 motion-safe:animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          User Management ({users.length} users)
        </h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {error && (
        <ErrorState
          variant="inline"
          title="Failed to load users"
          message="Check your connection and try again."
          onRetry={fetchUsers}
        />
      )}

      {showCreate && (
        <CreateUserForm
          onCreated={() => { setShowCreate(false); fetchUsers() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="grid gap-3">
        {users.map((user) => {
          const RoleIcon = ROLE_ICONS[user.role as keyof typeof ROLE_ICONS] ?? Eye
          return (
            <Card key={user.id} className={!user.enabled ? 'opacity-50' : ''}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <RoleIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {user.display_name || user.username}
                      {!user.enabled && <span className="ml-2 text-xs text-destructive">(disabled)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.username}{user.email ? <> &middot; {user.email}</> : null} &middot; {user.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {user.last_login_at && (
                    <span>Last login: {formatDate(user.last_login_at)}</span>
                  )}
                  <StatusToggle user={user} onToggled={fetchUsers} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function StatusToggle({ user, onToggled }: { user: SafeUser; onToggled: () => void }) {
  const [toggling, setToggling] = useState(false)

  const [toggleError, setToggleError] = useState('')

  async function toggle() {
    setToggling(true)
    setToggleError('')
    try {
      const action = user.enabled ? 'disable' : 'enable'
      const res = await fetchWithAuth(`/api/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Toggle failed' }))
        setToggleError(data.error || 'Toggle failed')
        return
      }
      onToggled()
    } finally {
      setToggling(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={toggling}
      aria-label={user.enabled ? `Disable ${user.display_name || user.username}` : `Enable ${user.display_name || user.username}`}
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
      ) : user.enabled ? (
        <UserX className="h-4 w-4" />
      ) : (
        <UserCheck className="h-4 w-4" />
      )}
    </Button>
  )
}

function CreateUserForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetchWithAuth('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: email || undefined, password, role }),
      })

      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to create user' }))
        setError(data.error)
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {error && <p className="col-span-full text-sm text-destructive">{error}</p>}
          <div className="space-y-1">
            <Label htmlFor="new-username">Username</Label>
            <Input id="new-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Password</Label>
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} aria-describedby="password-hint" />
            <p id="password-hint" className="text-[10px] text-muted-foreground">Min 12 chars with uppercase, lowercase, digit, and special character</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role">Role</Label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-span-full flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : null}
              Create User
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
