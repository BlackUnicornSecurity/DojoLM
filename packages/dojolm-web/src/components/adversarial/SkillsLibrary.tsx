/**
 * File: SkillsLibrary.tsx
 * Purpose: Adversarial skills browser with filter by category, difficulty, OWASP + search
 * Story: 12.2b — SkillCard UI + Filter/Search
 * Index:
 * - Filter state type (line 16)
 * - SkillsLibraryProps interface (line 24)
 * - SkillsLibrary component (line 30)
 */

'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkillCard } from './SkillCard'
import { ALL_SKILLS } from '@/lib/adversarial-skills-extended'
import {
  DIFFICULTY_CONFIG,
  CATEGORY_CONFIG,
  type SkillCategory,
  type SkillDifficulty,
  type OwaspLlmMapping,
} from '@/lib/adversarial-skills-types'
import {
  Search,
  Filter,
  BookOpen,
  X,
} from 'lucide-react'

interface SkillFilters {
  search: string
  category: SkillCategory | 'all'
  difficulty: SkillDifficulty | 'all'
  owasp: OwaspLlmMapping | 'all'
}

const INITIAL_FILTERS: SkillFilters = {
  search: '',
  category: 'all',
  difficulty: 'all',
  owasp: 'all',
}

const OWASP_IDS: OwaspLlmMapping[] = [
  'LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05',
  'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10',
]

export interface SkillsLibraryProps {
  onExecuteSkill?: (skillId: string) => void
  className?: string
}

export const SkillsLibrary = memo(function SkillsLibrary({
  onExecuteSkill,
  className,
}: SkillsLibraryProps) {
  const [filters, setFilters] = useState<SkillFilters>(INITIAL_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const filteredSkills = useMemo(() => {
    const searchLower = filters.search.toLowerCase().trim()
    return ALL_SKILLS.filter(skill => {
      // Search filter
      if (searchLower) {
        const matchSearch =
          skill.name.toLowerCase().includes(searchLower) ||
          skill.description.toLowerCase().includes(searchLower) ||
          skill.tags.some(t => t.toLowerCase().includes(searchLower))
        if (!matchSearch) return false
      }
      // Category filter
      if (filters.category !== 'all' && skill.category !== filters.category) return false
      // Difficulty filter
      if (filters.difficulty !== 'all' && skill.difficulty !== filters.difficulty) return false
      // OWASP filter
      if (filters.owasp !== 'all' && !skill.owaspMapping.includes(filters.owasp)) return false
      return true
    })
  }, [filters])

  const hasActiveFilters = filters.category !== 'all' || filters.difficulty !== 'all' || filters.owasp !== 'all' || filters.search.trim() !== ''

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const setCategory = useCallback((category: SkillCategory | 'all') => {
    setFilters(prev => ({ ...prev, category }))
  }, [])

  const setDifficulty = useCallback((difficulty: SkillDifficulty | 'all') => {
    setFilters(prev => ({ ...prev, difficulty }))
  }, [])

  const setOwasp = useCallback((owasp: OwaspLlmMapping | 'all') => {
    setFilters(prev => ({ ...prev, owasp }))
  }, [])

  // Count skills per category for badge display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const skill of ALL_SKILLS) {
      counts[skill.category] = (counts[skill.category] || 0) + 1
    }
    return counts
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              Adversarial Skills Library
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredSkills.length} / {ALL_SKILLS.length} skills
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(prev => !prev)}
                className="h-7 gap-1 text-xs"
                aria-expanded={showFilters}
                aria-label={showFilters ? 'Hide filters' : 'Show filters'}
              >
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search skills by name, description, or tag..."
              className="pl-8 h-8 text-sm"
              aria-label="Search adversarial skills"
            />
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              {/* Category filter */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Category</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter by category">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filters.category === 'all'}
                    onClick={() => setCategory('all')}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md border',
                      'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                      filters.category === 'all'
                        ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                        : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-secondary)]',
                    )}
                  >
                    All
                  </button>
                  {(Object.keys(CATEGORY_CONFIG) as SkillCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={filters.category === cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md border',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                        filters.category === cat
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                          : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-secondary)]',
                      )}
                    >
                      {CATEGORY_CONFIG[cat].label} ({categoryCounts[cat] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty filter */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Difficulty</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter by difficulty">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filters.difficulty === 'all'}
                    onClick={() => setDifficulty('all')}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md border',
                      'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                      filters.difficulty === 'all'
                        ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                        : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-secondary)]',
                    )}
                  >
                    All
                  </button>
                  {(Object.keys(DIFFICULTY_CONFIG) as SkillDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      role="radio"
                      aria-checked={filters.difficulty === diff}
                      onClick={() => setDifficulty(diff)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md border',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                        DIFFICULTY_CONFIG[diff].color,
                        filters.difficulty === diff
                          ? 'border-current bg-current/10'
                          : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]',
                      )}
                    >
                      {DIFFICULTY_CONFIG[diff].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OWASP filter */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">OWASP LLM</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter by OWASP mapping">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filters.owasp === 'all'}
                    onClick={() => setOwasp('all')}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md border',
                      'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                      filters.owasp === 'all'
                        ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                        : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-secondary)]',
                    )}
                  >
                    All
                  </button>
                  {OWASP_IDS.map(id => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={filters.owasp === id}
                      onClick={() => setOwasp(id)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md border font-mono',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                        filters.owasp === id
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                          : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-secondary)]',
                      )}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 gap-1 text-xs"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Grid */}
      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onExecute={onExecuteSkill}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No skills match the current filters.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="mt-2 gap-1 text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
})
