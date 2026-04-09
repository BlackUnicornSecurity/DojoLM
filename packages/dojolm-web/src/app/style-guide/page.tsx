'use client'

import { useState, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BrainCircuit, BookOpen, LayoutDashboard, Radar, ShieldHalf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, emptyStatePresets } from '@/components/ui/EmptyState'
import { MetricCard } from '@/components/ui/MetricCard'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { FilterPills, type FilterPill } from '@/components/ui/FilterPills'

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ColorSwatch({ name, token, usage }: { name: string; token: string; usage: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
      <div
        className="h-16 rounded-lg border border-[var(--border-subtle)]"
        style={{ background: `var(${token})` }}
      />
      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{name}</p>
        <p className="text-xs font-mono text-muted-foreground">{token}</p>
        <p className="text-xs text-muted-foreground">{usage}</p>
      </div>
    </div>
  )
}

const INITIAL_FILTERS: FilterPill[] = [
  { id: 'prompt', label: 'Prompt', icon: Radar, enabled: true },
  { id: 'jailbreak', label: 'Jailbreak', icon: ShieldHalf, enabled: true },
  { id: 'llm', label: 'LLM', icon: BrainCircuit, enabled: true },
  { id: 'audit', label: 'Audit', icon: BookOpen, enabled: false },
]

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const [filters, setFilters] = useState(INITIAL_FILTERS)

  return (
    <main
      id="main-content"
      aria-label="Main content"
      className="mx-auto min-h-screen max-w-6xl space-y-10 p-6 md:p-8"
    >
      <header className="glass-card rounded-lg border border-[var(--border-subtle)] p-6 shadow-[var(--shadow-card)]">
        <p className="text-label text-[var(--bu-electric)]">Live Design Reference</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">DojoLM Style Guide</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This page now reflects the live Dojo SaaS system: real tokens, real component variants, and the current Plus Jakarta Sans plus JetBrains Mono hierarchy.
        </p>
      </header>

      <Section
        title="Foundation Tokens"
        description="These are the live color and surface tokens currently driving the Dojo theme."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ColorSwatch name="Background" token="--background" usage="App shell and page canvas." />
          <ColorSwatch name="Surface Secondary" token="--bg-secondary" usage="Cards and elevated panels." />
          <ColorSwatch name="Surface Tertiary" token="--bg-tertiary" usage="Subtle elevation, hover states." />
          <ColorSwatch name="Border Subtle" token="--border-subtle" usage="Default card and panel borders." />
          <ColorSwatch name="Dojo Primary" token="--dojo-primary" usage="Decisive actions and red-led threat emphasis." />
          <ColorSwatch name="BU Electric" token="--bu-electric" usage="System intelligence, active state, and blue accents." />
          <ColorSwatch name="Success" token="--success" usage="Healthy outcomes, clean results, and stable posture." />
          <ColorSwatch name="Warning" token="--warning" usage="Cautionary states and elevated attention." />
        </div>
      </Section>

      <Section
        title="Typography"
        description="Hierarchy is standardized around page, section, card, and metric scales."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="interactive">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Page Title</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">`text-2xl font-bold tracking-tight`</p>
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight text-[var(--foreground)]">Section Title</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">`text-base font-semibold tracking-tight`</p>
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Card or Widget Title</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">`text-xl font-semibold tracking-tight`</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="interactive">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-sm text-[var(--foreground)]">
                  Plus Jakarta Sans carries body copy, labels, and UI framing for the SaaS presentation layer.
                </p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">`var(--font-sans)`</p>
              </div>
              <div>
                <p className="text-metric-lg text-[var(--foreground)]">98.4%</p>
                <p className="mt-1 text-xs text-muted-foreground">JetBrains Mono remains reserved for metrics, code, and audit-heavy values.</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">`text-metric-lg`</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Module Chrome"
        description="Headers, CTAs, and filter bars should feel like a product surface, not a bare utility layout."
      >
        <Card variant="hero">
          <CardContent className="p-5">
            <ModuleHeader
              title="Scanner Command Bar"
              subtitle="Launch scans, refine engine stacks, and keep supporting actions adjacent to the primary task."
              icon={LayoutDashboard}
              actions={
                <>
                  <Button variant="gradient">Primary Action</Button>
                  <Button variant="outline">Secondary</Button>
                </>
              }
            />
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-5">
            <FilterPills
              filters={filters}
              onToggle={(id) => setFilters((current) => current.map((filter) => filter.id === id ? { ...filter, enabled: !filter.enabled } : filter))}
              onReset={() => setFilters(INITIAL_FILTERS)}
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Actions And Status"
        description="Red is reserved for primary or threat-led decisions, blue for intelligence, and neutral surfaces for everything else."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="gradient">Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="active">System Active</Badge>
            <Badge variant="success">Healthy</Badge>
            <Badge variant="warning">Needs Review</Badge>
            <Badge variant="error">Action Required</Badge>
            <Badge variant="critical">Critical</Badge>
            <Badge variant="outline">Neutral Metadata</Badge>
          </div>
        </div>
      </Section>

      <Section
        title="Surface Tiers"
        description="Use calmer surfaces by default and reserve premium or urgent gradients for the few places that need them."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Base Surface</CardTitle>
              <CardDescription>Standard cards and quiet supporting content.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Default surfaces keep density under control and let primary calls to action stand out.</p>
            </CardContent>
          </Card>
          <Card variant="interactive">
            <CardHeader>
              <CardTitle>Interactive Surface</CardTitle>
              <CardDescription>Controls, filters, and operator touchpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Interactive surfaces add just enough lift to feel premium without becoming noisy.</p>
            </CardContent>
          </Card>
          <Card variant="hero">
            <CardHeader>
              <CardTitle>Hero Surface</CardTitle>
              <CardDescription>Primary module intros and curated narrative moments.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Hero surfaces carry the blue intelligence gradient and should remain rare.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Data Presentation"
        description="Metrics, empty states, and summaries should feel product-led and guided instead of inert."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Live Scans" value="128" icon={Radar} accent="primary" />
            <MetricCard label="Guard Blocks" value="12" icon={ShieldHalf} accent="danger" />
            <MetricCard label="Active Models" value="7" icon={BrainCircuit} accent="success" />
            <MetricCard label="Compliance" value="94%" icon={BookOpen} accent="warning" />
          </div>
          <Card variant="interactive">
            <CardContent className="p-0">
              <EmptyState
                {...emptyStatePresets.noScans}
                hint="Pair empty states with guidance so blank canvases still feel intentional."
              />
            </CardContent>
          </Card>
        </div>
      </Section>
    </main>
  )
}
