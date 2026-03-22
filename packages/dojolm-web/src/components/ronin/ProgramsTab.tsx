/**
 * File: ProgramsTab.tsx
 * Purpose: Programs tab for Ronin Hub — browse & filter bug bounty programs
 * Story: NODA-3 Story 10.2
 * Index:
 * - STORAGE_KEY (line 18)
 * - ProgramsTab component (line 22)
 */

'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ProgramCard } from './ProgramCard'
import { ProgramDetail } from './ProgramDetail'
import { SEED_PROGRAMS, type BountyProgram, type BountyPlatform, type ProgramStatus } from '@/lib/data/ronin-seed-programs'
import { PLATFORM_META, STATUS_META } from '@/lib/data/ronin-seed-programs'
import { Search, Filter, Star } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const STORAGE_KEY = 'noda-ronin-subscriptions'

function loadSubscriptions(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id: unknown) => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function saveSubscriptions(subs: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...subs]))
  } catch {
    // Quota or private mode
  }
}

export function ProgramsTab() {
  const [programs, setPrograms] = useState<BountyProgram[]>(SEED_PROGRAMS)
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set())
  const hydrated = useRef(false)
  const [selectedProgram, setSelectedProgram] = useState<BountyProgram | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])
  useEffect(() => () => clearTimeout(debounceRef.current), [])
  const [platformFilter, setPlatformFilter] = useState<BountyPlatform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('all')
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(false)

  // Hydrate subscriptions from localStorage
  useEffect(() => {
    setSubscriptions(loadSubscriptions())
    hydrated.current = true
  }, [])

  // Try loading from API, fallback to seed data
  useEffect(() => {
    let cancelled = false
    async function loadPrograms() {
      try {
        const res = await fetchWithAuth('/api/ronin/programs')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.programs)) {
          setPrograms(data.programs)
        }
      } catch {
        // Use seed data (already set)
      }
    }
    loadPrograms()
    return () => { cancelled = true }
  }, [])

  const handleToggleSubscribe = useCallback((programId: string) => {
    setSubscriptions(prev => {
      const next = new Set(prev)
      if (next.has(programId)) {
        next.delete(programId)
      } else {
        next.add(programId)
      }
      return next
    })
  }, [])

  // Persist subscriptions on change (only after hydration to prevent wiping stored data)
  useEffect(() => {
    if (!hydrated.current) return
    saveSubscriptions(subscriptions)
  }, [subscriptions])

  // Top 3 highest-paying active programs get "Featured" ribbon
  const featuredIds = useMemo(() => {
    const active = programs.filter(p => p.status === 'active')
    const sorted = [...active].sort((a, b) => b.rewardMax - a.rewardMax)
    return new Set(sorted.slice(0, 3).map(p => p.id))
  }, [programs])

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      if (showSubscribedOnly && !subscriptions.has(p.id)) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase()
        return (
          p.name.toLowerCase().includes(s) ||
          p.company.toLowerCase().includes(s) ||
          p.scopeSummary.toLowerCase().includes(s) ||
          p.tags.some(t => t.toLowerCase().includes(s)) ||
          p.owaspAiCategories.some(c => c.toLowerCase().includes(s))
        )
      }
      return true
    })
  }, [programs, debouncedSearch, platformFilter, statusFilter, showSubscribedOnly, subscriptions])

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-[var(--border)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search programs, companies, tags..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm min-h-[40px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
            aria-label="Search programs"
          />
        </div>

        {/* Platform Filter */}
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as BountyPlatform | 'all')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm min-h-[40px]',
            'bg-[var(--bg-primary)] border border-[var(--border)]',
            'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
          )}
          aria-label="Filter by platform"
        >
          <option value="all">All Platforms</option>
          {(Object.keys(PLATFORM_META) as BountyPlatform[]).map(p => (
            <option key={p} value={p}>{PLATFORM_META[p].label}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | 'all')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm min-h-[40px]',
            'bg-[var(--bg-primary)] border border-[var(--border)]',
            'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
          )}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_META) as ProgramStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        {/* Subscribed Only Toggle */}
        <button
          onClick={() => setShowSubscribedOnly(!showSubscribedOnly)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[40px]',
            'border motion-safe:transition-colors',
            showSubscribedOnly
              ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]'
              : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-tertiary)]',
          )}
          aria-pressed={showSubscribedOnly}
          aria-label="Show subscribed programs only"
        >
          <Star className={cn('h-3.5 w-3.5', showSubscribedOnly && 'fill-current')} aria-hidden="true" />
          Subscribed
        </button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
          {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''} found
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden="true" />
          <span>{subscriptions.size} subscribed</span>
        </div>
      </div>

      {/* Program Grid */}
      {filteredPrograms.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              isSubscribed={subscriptions.has(program.id)}
              onToggleSubscribe={handleToggleSubscribe}
              onSelect={setSelectedProgram}
              featured={featuredIds.has(program.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">No programs found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Program Detail Modal */}
      {selectedProgram && (
        <ProgramDetail
          program={selectedProgram}
          isSubscribed={subscriptions.has(selectedProgram.id)}
          onToggleSubscribe={handleToggleSubscribe}
          onClose={() => setSelectedProgram(null)}
        />
      )}
    </div>
  )
}
