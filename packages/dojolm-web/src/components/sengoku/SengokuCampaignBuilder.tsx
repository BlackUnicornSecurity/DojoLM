/**
 * File: SengokuCampaignBuilder.tsx
 * Purpose: Campaign creation wizard for Sengoku — wired to POST /api/sengoku/campaigns
 * Story: HAKONE H17.8, DAITENGUYAMA D4.4
 * Index:
 * - Steps: Target, Skills, Schedule, Alerts (line ~30)
 * - Skill selector with category filter (line ~130)
 * - POST handler (line ~60)
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { cn } from '@/lib/utils'
import {
  ALL_SKILLS,
  SKILL_CATEGORIES,
  type SkillEntry,
  type SkillCategory,
} from '@/lib/sengoku-types'

const STEPS = ['Target', 'Skills', 'Schedule', 'Alerts'] as const

const SCHEDULE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

interface SengokuCampaignBuilderProps {
  readonly onClose?: () => void
  readonly onCreated?: () => void
}

export function SengokuCampaignBuilder({ onClose, onCreated }: SengokuCampaignBuilderProps) {
  const [step, setStep] = useState(0)
  const [campaignName, setCampaignName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [authType, setAuthType] = useState<'api_key' | 'bearer'>('api_key')
  const [selectedSkillIds, setSelectedSkillIds] = useState<ReadonlySet<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all')
  const [schedule, setSchedule] = useState('daily')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  const canNext =
    step === 0 ? targetUrl.trim().length > 0 && campaignName.trim().length > 0
    : step === 1 ? selectedSkillIds.size > 0
    : true

  // -----------------------------------------------------------------------
  // Skill helpers
  // -----------------------------------------------------------------------

  const filteredSkills: readonly SkillEntry[] = useMemo(() => {
    if (activeCategory === 'all') return ALL_SKILLS
    return ALL_SKILLS.filter((s) => s.category === activeCategory)
  }, [activeCategory])

  const toggleSkill = useCallback((skillId: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }, [])

  const selectAllInCategory = useCallback(() => {
    const ids = filteredSkills.map((s) => s.id)
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }, [filteredSkills])

  const clearCategory = useCallback(() => {
    const ids = new Set(filteredSkills.map((s) => s.id))
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [filteredSkills])

  // -----------------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (!(await canAccessProtectedApi())) {
        setError('Authentication required to create a campaign')
        return
      }

      const res = await fetchWithAuth('/api/sengoku/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          targetUrl: targetUrl.trim(),
          authConfig: authType === 'bearer' ? { Authorization: 'Bearer <token>' } : { 'X-API-Key': '<key>' },
          selectedSkillIds: [...selectedSkillIds],
          schedule: schedule || null,
          webhookUrl: webhookUrl.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to create campaign')
        return
      }

      onCreated?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }, [campaignName, targetUrl, authType, selectedSkillIds, schedule, webhookUrl, onCreated])

  return (
    <GlowCard glow="accent" className="p-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              i <= step ? 'bg-[var(--dojo-primary)] text-white' : 'bg-muted text-muted-foreground',
            )}>
              {i < step ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
            </div>
            <span className={cn('text-xs hidden sm:inline', i <= step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[200px]">
        {/* Step 0: Target */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Target Configuration</h3>
            <label className="block">
              <span className="text-sm text-muted-foreground">Campaign Name</span>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Production API Scan"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">Target URL</span>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://api.example.com/v1/chat"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">Auth Type</span>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as 'api_key' | 'bearer')}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
              >
                <option value="api_key">API Key</option>
                <option value="bearer">Bearer Token</option>
              </select>
            </label>
          </div>
        )}

        {/* Step 1: Skill Selector */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Skills</h3>
              <span className="text-xs text-muted-foreground">{selectedSkillIds.size} selected</span>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                  activeCategory === 'all'
                    ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                    : 'border-[var(--border)] hover:bg-muted',
                )}
              >
                All
              </button>
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                    activeCategory === cat
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                      : 'border-[var(--border)] hover:bg-muted',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Select all / clear */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllInCategory}>
                Select All {activeCategory !== 'all' ? `(${activeCategory})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={clearCategory}>
                Clear {activeCategory !== 'all' ? `(${activeCategory})` : ''}
              </Button>
            </div>

            {/* Skill list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 rounded-md text-left text-xs border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                    selectedSkillIds.has(skill.id)
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                      : 'border-[var(--border)] hover:bg-muted',
                  )}
                  aria-pressed={selectedSkillIds.has(skill.id)}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                    selectedSkillIds.has(skill.id) ? 'bg-[var(--dojo-primary)] border-[var(--dojo-primary)]' : 'border-[var(--border)]',
                  )}>
                    {selectedSkillIds.has(skill.id) && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-muted-foreground mt-0.5">{skill.description}</p>
                    <Badge variant="default" className="mt-1 text-[10px]">{skill.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule</h3>
            <div className="flex gap-2">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSchedule(opt.value)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                    schedule === opt.value
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                      : 'border-[var(--border)] hover:bg-muted',
                  )}
                  role="radio"
                  aria-checked={schedule === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Alerts */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Alert Configuration</h3>
            <label className="block">
              <span className="text-sm text-muted-foreground">Webhook URL (optional)</span>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/notify"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
              />
            </label>
            <p className="text-xs text-muted-foreground">Receive notifications when regressions are detected.</p>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {campaignName}</p>
              <p><span className="text-muted-foreground">Target:</span> {targetUrl}</p>
              <p><span className="text-muted-foreground">Skills:</span> {selectedSkillIds.size} selected</p>
              <p><span className="text-muted-foreground">Schedule:</span> {schedule}</p>
            </div>

            {error && (
              <p className="text-xs text-[var(--status-block)]">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onClose?.()} className="gap-1">
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {step > 0 ? 'Back' : 'Cancel'}
        </Button>
        <Button
          size="sm"
          onClick={() => isLast ? handleCreate() : setStep(step + 1)}
          disabled={!canNext || submitting}
          className="gap-1"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : isLast ? (
            'Create Campaign'
          ) : (
            <>Next <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" /></>
          )}
        </Button>
      </div>
    </GlowCard>
  )
}
