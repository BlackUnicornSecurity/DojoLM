/**
 * File: StrategicHub.tsx
 * Purpose: Landing page for The Kumite with SAGE, Battle Arena, Mitsuke, DNA, Kagami, and Shingan subsystems
 * Story: S75, TPI-NODA-6.3, NODA-3 Stories 7.1-7.3, K5.5, D7.12
 * Index:
 * - SubsystemKey type (line 24)
 * - SUBSYSTEM_CARDS config (line 26)
 * - GUIDE_CONTENT data (line 102)
 * - ONBOARDING_STEPS data (line 155)
 * - StrategicHub component (line 210)
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { ModuleOnboarding, resetOnboarding, type OnboardingStep } from '@/components/ui/ModuleOnboarding'
import { SAGEConfig, ArenaConfig, MitsukeConfig } from './KumiteConfig'
import { AmaterasuConfig } from '../attackdna/AmaterasuConfig'
import {
  Dna,
  Swords,
  Radio,
  Fingerprint,
  ArrowRight,
  Layers,
  FlaskConical,
  Trophy,
  AlertTriangle,
  HelpCircle,
  Settings,
  Target,
  Shield,
  Zap,
  BarChart3,
  BookOpen,
  Rss,
  GitBranch,
  Network,
  Eye,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SAGEDashboard = dynamic(
  () => import('./SAGEDashboard').then(mod => ({ default: mod.SAGEDashboard })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const ArenaBrowser = dynamic(
  () => import('./ArenaBrowser').then(mod => ({ default: mod.ArenaBrowser })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const ThreatFeedStream = dynamic(
  () => import('./ThreatFeedStream').then(mod => ({ default: mod.ThreatFeedStream })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const AmaterasuSubsystem = dynamic(
  () => import('./AmaterasuSubsystem').then(mod => ({ default: mod.AmaterasuSubsystem })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const KagamiPanel = dynamic(
  () => import('../kagami/KagamiPanel').then(mod => ({ default: mod.KagamiPanel })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const ShinganPanel = dynamic(
  () => import('../shingan/ShinganPanel').then(mod => ({ default: mod.ShinganPanel })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

type SubsystemKey = 'sage' | 'arena' | 'threatfeed' | 'dna' | 'kagami' | 'shingan'

interface SubsystemCardConfig {
  key: SubsystemKey
  title: string
  description: string
  icon: LucideIcon
  metrics: { label: string; value: string }[]
  accent: string
  badge: string
}

const SUBSYSTEM_CARDS: SubsystemCardConfig[] = [
  {
    key: 'sage',
    title: 'SAGE',
    description: 'Synthetic Attack Generator Engine. Genetic evolution of adversarial prompts with mutation operators, fitness scoring, and content safety quarantine.',
    icon: Dna,
    metrics: [
      { label: 'Generations', value: '142' },
      { label: 'Best Fitness', value: '0.94' },
      { label: 'Seed Library', value: '1,247' },
    ],
    accent: 'var(--dojo-primary)',
    badge: 'Evolution',
  },
  {
    key: 'arena',
    title: 'Battle Arena',
    description: 'Multi-agent adversarial sandbox. Run attacker vs defender matches in CTF, King of the Hill, and Red vs Blue game modes.',
    icon: Swords,
    metrics: [
      { label: 'Active Matches', value: '3' },
      { label: 'Total Rounds', value: '8,421' },
      { label: 'Top Agent', value: 'Sentinel-v4' },
    ],
    accent: 'var(--warning)',
    badge: 'Live',
  },
  {
    key: 'threatfeed',
    title: 'Mitsuke',
    description: 'Threat intelligence pipeline. Ingest from RSS, API, and webhook sources with classification, indicator extraction, and alerting.',
    icon: Radio,
    metrics: [
      { label: 'Active Sources', value: '12' },
      { label: 'Entries Today', value: '384' },
      { label: 'Open Alerts', value: '7' },
    ],
    accent: 'var(--severity-high)',
    badge: 'Intel',
  },
  {
    key: 'dna',
    title: 'Amaterasu DNA',
    description: 'Attack lineage and mutation analysis. Visualize family trees, embedding clusters, mutation timelines, and cross-attack relationships.',
    icon: Fingerprint,
    metrics: [
      { label: 'Families', value: '38' },
      { label: 'Nodes', value: '1,842' },
      { label: 'Clusters', value: '12' },
    ],
    accent: 'var(--dojo-primary)',
    badge: 'Analysis',
  },
  {
    key: 'kagami',
    title: 'Kagami',
    description: 'Mirror-testing engine for behavioral consistency analysis. Compare model outputs across versions, configurations, and prompt variations.',
    icon: Fingerprint,
    metrics: [
      { label: 'Mirrors', value: '24' },
      { label: 'Diffs Found', value: '187' },
      { label: 'Consistency', value: '91%' },
    ],
    accent: 'var(--dojo-primary)',
    badge: 'Mirror',
  },
  {
    key: 'shingan',
    title: 'Shingan',
    description: 'Deep-scan engine for prompt injection detection, trust boundary analysis, and supply chain threat assessment across LLM pipelines.',
    icon: Eye,
    metrics: [
      { label: 'Scans', value: '156' },
      { label: 'Detections', value: '42' },
      { label: 'Boundaries', value: '8' },
    ],
    accent: 'var(--severity-high)',
    badge: 'Deep Scan',
  },
]

const TAB_CONFIG: { key: SubsystemKey; label: string; icon: LucideIcon }[] = [
  { key: 'sage', label: 'SAGE', icon: FlaskConical },
  { key: 'arena', label: 'Arena', icon: Trophy },
  { key: 'threatfeed', label: 'Mitsuke', icon: AlertTriangle },
  { key: 'dna', label: 'DNA', icon: Fingerprint },
  { key: 'kagami', label: 'Kagami', icon: Fingerprint },
  { key: 'shingan', label: 'Shingan', icon: Eye },
]

// --- Guide content for each subsystem ---

const GUIDE_CONTENT: Record<SubsystemKey, { title: string; description: string; sections: GuideSection[] }> = {
  sage: {
    title: 'SAGE Guide',
    description: 'The Synthetic Attack Generator Engine uses genetic evolution to discover adversarial prompts that bypass LLM safety filters.',
    sections: [
      { title: 'How It Works', content: 'SAGE evolves adversarial prompts through mutation operators (substitution, insertion, deletion, encoding, structural, semantic). Each generation is scored for fitness against the target model, and the highest-scoring prompts survive to the next round.', icon: Dna },
      { title: 'Mutation Operators', content: 'Six mutation types transform prompts: substitution swaps tokens, insertion adds new tokens, deletion removes tokens, encoding applies base64/hex transforms, structural changes prompt format, and semantic rewrites meaning while preserving intent.', icon: Zap },
      { title: 'Safety Quarantine', content: 'Prompts that exceed the auto-quarantine threshold are isolated for manual review. This prevents dangerously effective prompts from being re-used without oversight.', icon: Shield },
      { title: 'Typical Workflow', content: '1. Configure target model and mutation weights\n2. Load or create seed prompts\n3. Set generation limit and safety threshold\n4. Run evolution and monitor fitness scores\n5. Review quarantined prompts for insights', icon: BookOpen },
    ],
  },
  arena: {
    title: 'Battle Arena Guide',
    description: 'The multi-agent adversarial sandbox lets you pit attacker and defender agents against each other in structured game modes.',
    sections: [
      { title: 'Game Modes', content: 'CTF (Capture the Flag): agents compete to extract/defend secrets. King of the Hill: agents take turns attacking and defending a position. Red vs Blue: team-based attack/defense scenarios.', icon: Trophy },
      { title: 'Agent Configuration', content: 'Agents are pre-built or custom attack/defense profiles. Each has unique strategies, capabilities, and scoring multipliers. Mix agents from the roster to create diverse match scenarios.', icon: Target },
      { title: 'Scoring System', content: 'Matches are scored based on successful attacks, successful defenses, response time, and resource efficiency. Scoring presets (default, aggressive, balanced, defensive) weight these factors differently.', icon: BarChart3 },
      { title: 'Typical Workflow', content: '1. Select agents for the match roster\n2. Choose a game mode and scoring preset\n3. Set match duration\n4. Run the match and observe real-time results\n5. Review match replay and scoring breakdown', icon: BookOpen },
    ],
  },
  threatfeed: {
    title: 'Mitsuke Guide',
    description: 'The threat intelligence pipeline ingests, classifies, and alerts on AI security threats from multiple sources.',
    sections: [
      { title: 'Feed Sources', content: 'Mitsuke supports RSS feeds, REST APIs, and webhook sources. Each source can be individually enabled/disabled. Built-in sources include NIST NVD, MITRE ATT&CK, and OWASP security alerts.', icon: Rss },
      { title: 'Classification & Extraction', content: 'Incoming entries are automatically classified by threat type and severity. Indicator extraction rules pull out IP addresses, domain names, hash values, and CVE IDs for structured tracking.', icon: Target },
      { title: 'Alerting', content: 'Alerts are triggered when entries exceed the configured threshold (low, medium, high, critical). Alert notifications appear in the activity feed and can be integrated with external notification systems.', icon: AlertTriangle },
      { title: 'Typical Workflow', content: '1. Configure feed sources and enable relevant ones\n2. Set alert threshold based on your risk tolerance\n3. Define indicator extraction rules\n4. Monitor the stream for new entries\n5. Investigate and triage alerts as they arrive', icon: BookOpen },
    ],
  },
  dna: {
    title: 'Amaterasu DNA Guide',
    description: 'Analyze attack lineage, mutation families, and embedding clusters to understand how adversarial prompts evolve and relate to each other.',
    sections: [
      { title: 'Family Trees', content: 'Visualize parent-child relationships between attacks. Each node represents an attack prompt, and edges show how mutations created new variants. Click any node to see its full mutation history.', icon: GitBranch },
      { title: 'Embedding Clusters', content: 'Attacks are grouped by semantic similarity using embedding vectors. Clusters reveal common evasion patterns that span different attack families, helping identify structural weaknesses.', icon: Network },
      { title: 'Mutation Timeline', content: 'View how attacks evolved chronologically. The timeline highlights mutation bursts, drift patterns, and convergence events where independent attack families developed similar techniques.', icon: BarChart3 },
      { title: 'Typical Workflow', content: '1. Select data source tiers for analysis\n2. Browse family trees to understand lineage\n3. Examine embedding clusters for pattern discovery\n4. Review mutation timeline for evolution trends\n5. Use X-Ray for deep structural analysis', icon: BookOpen },
    ],
  },
  kagami: {
    title: 'Kagami Guide',
    description: 'The mirror-testing engine compares model behavior across versions, configurations, and prompt variations to detect consistency drifts.',
    sections: [
      { title: 'Mirror Tests', content: 'Kagami runs identical prompts against multiple model versions or configurations and compares outputs for semantic and structural differences. Diffs are highlighted and scored for severity.', icon: Fingerprint },
      { title: 'Version Comparison', content: 'Track how model behavior changes across updates. Kagami detects regressions in safety alignment, response quality, and instruction following between model versions.', icon: BarChart3 },
      { title: 'Consistency Scoring', content: 'Each mirror test produces a consistency score (0-100%). Low scores indicate behavioral drift that may introduce vulnerabilities or unexpected outputs.', icon: Target },
      { title: 'Typical Workflow', content: '1. Select model versions or configurations to compare\n2. Load or create test prompt sets\n3. Run mirror tests across targets\n4. Review diff reports and consistency scores\n5. Flag regressions for further investigation', icon: BookOpen },
    ],
  },
  shingan: {
    title: 'Shingan Guide',
    description: 'The deep-scan engine detects prompt injection patterns, maps trust boundaries, and assesses supply chain threats in LLM pipelines.',
    sections: [
      { title: 'Injection Detection', content: 'Shingan scans prompts, tool outputs, and context windows for known and novel prompt injection patterns. It uses pattern matching, semantic analysis, and heuristic scoring.', icon: Eye },
      { title: 'Trust Boundary Analysis', content: 'Maps trust boundaries between system prompts, user inputs, tool outputs, and external data sources. Identifies where untrusted data crosses into trusted instruction context.', icon: Shield },
      { title: 'Supply Chain Assessment', content: 'Evaluates third-party MCP servers, tool integrations, and data sources for supply chain risks including typosquatting, dependency confusion, and compromised packages.', icon: AlertTriangle },
      { title: 'Typical Workflow', content: '1. Configure scan targets (prompts, tools, data sources)\n2. Select scan depth and detection modules\n3. Run deep scan and review findings\n4. Investigate trust boundary violations\n5. Export findings to Mitsuke or Bushido Book', icon: BookOpen },
    ],
  },
}

// --- Onboarding storage keys ---
const ONBOARDING_KEYS: Record<SubsystemKey, string> = {
  sage: 'sage-onboarded',
  arena: 'arena-onboarded',
  threatfeed: 'mitsuke-onboarded',
  dna: 'kumite-dna-onboarded',
  kagami: 'kagami-onboarded',
  shingan: 'shingan-onboarded',
}

// --- Onboarding steps for each subsystem ---
const ONBOARDING_STEPS: Record<SubsystemKey, OnboardingStep[]> = {
  sage: [
    {
      title: 'Seed Library',
      description: 'Start by loading or creating seed prompts. These serve as the foundation for evolutionary testing. SAGE ships with a built-in library, or paste your own.',
      icon: BookOpen,
    },
    {
      title: 'Configure Evolution',
      description: 'Set mutation operator weights, generation limits, safety thresholds, and target model. Fine-tune how aggressively SAGE mutates prompts.',
      icon: Settings,
    },
    {
      title: 'Launch & Monitor',
      description: 'Run the evolution engine and watch fitness scores climb in real-time. Quarantined prompts are isolated for manual review before re-use.',
      icon: Zap,
    },
  ],
  arena: [
    {
      title: 'Choose Fighters',
      description: 'Select attacker and defender agents from the roster. Each agent has unique strategies and scoring multipliers. Mix agents for diverse scenarios.',
      icon: Target,
    },
    {
      title: 'Set Rules',
      description: 'Pick a game mode (CTF, King of the Hill, or Red vs Blue), choose a scoring preset, and set the match duration.',
      icon: BarChart3,
    },
    {
      title: 'Enter the Arena',
      description: 'Launch the match and observe real-time results. Review round-by-round scoring, replays, and the final match breakdown.',
      icon: Trophy,
    },
  ],
  threatfeed: [
    {
      title: 'Connect Sources',
      description: 'Enable built-in feed sources (NIST NVD, MITRE ATT&CK, OWASP) or add custom RSS, API, and webhook sources for threat intelligence.',
      icon: Rss,
    },
    {
      title: 'Set Alerts',
      description: 'Configure alert thresholds (low, medium, high, critical) and indicator extraction rules. Alerts appear in your activity feed.',
      icon: AlertTriangle,
    },
    {
      title: 'Monitor',
      description: 'Watch the stream for new entries, investigate flagged items, and triage alerts as they arrive. Export findings to other modules.',
      icon: Radio,
    },
  ],
  dna: [
    {
      title: 'Select Data Sources',
      description: 'Choose which data source tiers to analyze — local Dojo results, community datasets, or threat intelligence feeds. Each tier adds depth to lineage analysis.',
      icon: Layers,
    },
    {
      title: 'Explore Lineage',
      description: 'Browse family trees to trace attack evolution, examine embedding clusters for pattern discovery, and review mutation timelines for trend analysis.',
      icon: GitBranch,
    },
    {
      title: 'Analyze & Export',
      description: 'Use Black Box Analysis and X-Ray for deep structural inspection. Export findings to SAGE for evolution or flag for Mitsuke tracking.',
      icon: Fingerprint,
    },
  ],
  kagami: [
    {
      title: 'Select Targets',
      description: 'Choose model versions or configurations to compare. Kagami supports side-by-side comparison of any two model endpoints.',
      icon: Target,
    },
    {
      title: 'Run Mirror Tests',
      description: 'Load test prompt sets and run them against both targets. Kagami captures outputs, timing, and behavioral metadata for each response.',
      icon: Fingerprint,
    },
    {
      title: 'Review Diffs',
      description: 'Examine semantic and structural diffs between outputs. Consistency scores highlight regressions and behavioral drift.',
      icon: BarChart3,
    },
  ],
  shingan: [
    {
      title: 'Configure Scan',
      description: 'Select scan targets — prompts, tool outputs, MCP servers, or data sources. Choose detection modules and scan depth.',
      icon: Settings,
    },
    {
      title: 'Run Deep Scan',
      description: 'Execute the scan engine across selected targets. Shingan analyzes for injection patterns, trust boundary violations, and supply chain risks.',
      icon: Eye,
    },
    {
      title: 'Investigate Findings',
      description: 'Review detected threats, trust boundary maps, and risk scores. Export critical findings to Mitsuke for tracking or Bushido Book for compliance.',
      icon: Shield,
    },
  ],
}

/**
 * The Kumite - Main landing page and container for SAGE, Arena, Mitsuke
 */
export function StrategicHub() {
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey | null>(null)
  const [activeConfig, setActiveConfig] = useState<SubsystemKey | null>(null)
  const [activeGuide, setActiveGuide] = useState<SubsystemKey | null>(null)
  const [onboardingResetKey, setOnboardingResetKey] = useState(0)

  const closeConfig = useCallback(() => setActiveConfig(null), [])
  const closeGuide = useCallback(() => setActiveGuide(null), [])

  const handleResetOnboarding = useCallback((key: SubsystemKey) => {
    resetOnboarding(ONBOARDING_KEYS[key])
    setOnboardingResetKey((prev) => prev + 1)
  }, [])

  // Render config/guide panels (always mounted so they can animate in/out)
  const renderPanels = (
    <>
      <SAGEConfig isOpen={activeConfig === 'sage'} onClose={closeConfig} />
      <ArenaConfig isOpen={activeConfig === 'arena'} onClose={closeConfig} />
      <MitsukeConfig isOpen={activeConfig === 'threatfeed'} onClose={closeConfig} />
      <AmaterasuConfig isOpen={activeConfig === 'dna'} onClose={closeConfig} />
      {(Object.keys(GUIDE_CONTENT) as SubsystemKey[]).map((key) => (
        <ModuleGuide
          key={key}
          isOpen={activeGuide === key}
          onClose={closeGuide}
          title={GUIDE_CONTENT[key].title}
          description={GUIDE_CONTENT[key].description}
          sections={GUIDE_CONTENT[key].sections}
        />
      ))}
    </>
  )

  if (activeSubsystem) {
    return (
      <div className="space-y-6">
        {/* Header with back navigation */}
        <ModuleHeader
          title="The Kumite"
          subtitle="SAGE, Battle Arena, Mitsuke, Amaterasu DNA, Kagami, and Shingan"
          icon={Layers}
          actions={
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  handleResetOnboarding(activeSubsystem)
                  setActiveGuide(activeSubsystem)
                }}
                aria-label={`Open ${GUIDE_CONTENT[activeSubsystem].title}`}
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveConfig(activeSubsystem)}
                aria-label={`Open ${activeSubsystem} configuration`}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSubsystem(null)}
                aria-label="Return to The Kumite overview"
              >
                Overview
              </Button>
            </>
          }
        />

        {/* Sub-tab navigation */}
        <Tabs value={activeSubsystem} onValueChange={(v) => setActiveSubsystem(v as SubsystemKey)}>
          <TabsList aria-label="The Kumite subsystems" className="bg-muted/50">
            {TAB_CONFIG.map(({ key, label, icon: TabIcon }) => (
              <TabsTrigger key={key} value={key} className="min-h-[44px] gap-2">
                <TabIcon className="w-4 h-4" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="sage">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`sage-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.sage}
                steps={ONBOARDING_STEPS.sage}
                accentColor="var(--dojo-primary)"
              />
              <SAGEDashboard />
            </div>
          </TabsContent>
          <TabsContent value="arena">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`arena-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.arena}
                steps={ONBOARDING_STEPS.arena}
                accentColor="var(--warning)"
              />
              <ArenaBrowser />
            </div>
          </TabsContent>
          <TabsContent value="threatfeed">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`mitsuke-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.threatfeed}
                steps={ONBOARDING_STEPS.threatfeed}
                accentColor="var(--severity-high)"
              />
              <ThreatFeedStream />
            </div>
          </TabsContent>
          <TabsContent value="dna">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`dna-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.dna}
                steps={ONBOARDING_STEPS.dna}
                accentColor="var(--dojo-primary)"
              />
              <AmaterasuSubsystem />
            </div>
          </TabsContent>
          <TabsContent value="kagami">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`kagami-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.kagami}
                steps={ONBOARDING_STEPS.kagami}
                accentColor="var(--dojo-primary)"
              />
              <KagamiPanel />
            </div>
          </TabsContent>
          <TabsContent value="shingan">
            <div className="space-y-4">
              <ModuleOnboarding
                key={`shingan-onboarding-${onboardingResetKey}`}
                storageKey={ONBOARDING_KEYS.shingan}
                steps={ONBOARDING_STEPS.shingan}
                accentColor="var(--severity-high)"
              />
              <ShinganPanel />
            </div>
          </TabsContent>
        </Tabs>

        {renderPanels}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModuleHeader
        title="The Kumite"
        subtitle="Access SAGE evolution engine, Battle Arena multi-agent sandbox, Mitsuke threat intelligence, Amaterasu DNA analysis, Kagami mirror testing, and Shingan deep scan."
        icon={Layers}
      />

      {/* Subsystem cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SUBSYSTEM_CARDS.map((card) => {
          const CardIcon = card.icon
          return (
            <Card
              key={card.key}
              variant="glass"
              className={cn(
                "border-l-4 bg-[var(--card-elevated)] motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
                card.key === 'arena' && card.metrics[0].value === '0' && 'opacity-80',
              )}
              style={{ borderLeftColor: card.accent }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-quaternary)] flex items-center justify-center">
                    <CardIcon className="w-5 h-5 text-[var(--foreground)]" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setActiveGuide(card.key) }}
                      aria-label={`Help for ${card.title}`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setActiveConfig(card.key) }}
                      aria-label={`Configure ${card.title}`}
                    >
                      <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Badge variant="outline" title={card.key === 'sage' ? 'Genetic evolution of attack prompts' : card.key === 'arena' ? 'Real-time multi-agent matches' : card.key === 'dna' ? 'Attack lineage and mutation analysis' : card.key === 'kagami' ? 'Mirror-testing for behavioral consistency' : card.key === 'shingan' ? 'Deep-scan prompt injection detection' : 'Live threat intelligence feed'}>{card.badge}</Badge>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3">{card.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="text-center">
                      <p className="text-sm font-bold text-[var(--foreground)]">{metric.value}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Open button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setActiveSubsystem(card.key)}
                  aria-label={`Open ${card.title} dashboard`}
                >
                  Open {card.title}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {renderPanels}
    </div>
  )
}

/**
 * Loading skeleton shown while subsystem components load via next/dynamic
 */
function SubsystemLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading subsystem">
      <div className="h-8 w-48 bg-[var(--bg-quaternary)] rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-quaternary)] rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-[var(--bg-quaternary)] rounded-lg" />
    </div>
  )
}
