/**
 * File: SengokuCampaignBuilder.tsx
 * Purpose: Campaign creation wizard for Sengoku
 * Story: HAKONE H17.8
 */

'use client'

import { useState, useCallback } from 'react'
import { Swords, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = ['Target', 'Attacks', 'Schedule', 'Alerts'] as const
type Step = (typeof STEPS)[number]

const ATTACK_CATEGORIES = [
  'prompt-injection', 'jailbreak', 'encoding', 'social-engineering',
  'tool-manipulation', 'output-manipulation', 'mcp', 'webmcp',
]

const SCHEDULE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

export function SengokuCampaignBuilder({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0)
  const [targetUrl, setTargetUrl] = useState('')
  const [authType, setAuthType] = useState<'api_key' | 'bearer'>('api_key')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['prompt-injection', 'jailbreak']))
  const [schedule, setSchedule] = useState('daily')
  const [webhookUrl, setWebhookUrl] = useState('')

  const currentStep = STEPS[step]
  const canNext = step === 0 ? targetUrl.trim().length > 0 : true
  const isLast = step === STEPS.length - 1

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

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
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Target Configuration</h3>
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

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Attack Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ATTACK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'px-3 py-2 rounded-md text-xs font-medium border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                    selectedCategories.has(cat)
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                      : 'border-[var(--border)] hover:bg-muted',
                  )}
                  aria-pressed={selectedCategories.has(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

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
          onClick={() => isLast ? onClose?.() : setStep(step + 1)}
          disabled={!canNext}
          className="gap-1"
        >
          {isLast ? 'Create Campaign' : 'Next'}
          {!isLast && <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
        </Button>
      </div>
    </GlowCard>
  )
}
