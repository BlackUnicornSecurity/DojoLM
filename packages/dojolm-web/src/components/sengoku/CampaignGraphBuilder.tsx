/**
 * File: CampaignGraphBuilder.tsx
 * Purpose: Visual skill graph builder for Sengoku campaigns
 * Story: DAITENGUYAMA D4.5
 * Index:
 * - Ordered skill list with reorder (line ~60)
 * - Per-skill branching config (line ~140)
 * - Visual flow indicator with arrows (line ~110)
 * - Preset graph templates (line ~180)
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ArrowDown, ArrowDownRight, ChevronUp, ChevronDown, X, Plus, Zap,
  Shield, Network,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ALL_SKILLS,
  GRAPH_TEMPLATES,
  type GraphSkillNode,
  type SkillEntry,
  type GraphTemplate,
} from '@/lib/sengoku-types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CampaignGraphBuilderProps {
  /** Initial nodes (e.g. from a saved campaign) */
  readonly initialNodes?: readonly GraphSkillNode[]
  /** Called when the graph changes */
  readonly onChange?: (nodes: readonly GraphSkillNode[]) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEMPLATE_ICONS: Record<string, typeof Zap> = {
  'quick-recon': Zap,
  'full-assessment': Shield,
  'supply-chain-audit': Network,
}

function skillById(id: string): SkillEntry | undefined {
  return ALL_SKILLS.find((s) => s.id === id)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignGraphBuilder({ initialNodes = [], onChange }: CampaignGraphBuilderProps) {
  const [nodes, setNodes] = useState<readonly GraphSkillNode[]>(
    initialNodes.length > 0 ? initialNodes : [],
  )
  const [showSkillPicker, setShowSkillPicker] = useState(false)

  // Skills already in the graph
  const usedSkillIds = useMemo(() => new Set(nodes.map((n) => n.skillId)), [nodes])

  // Available skills not yet added
  const availableSkills = useMemo(
    () => ALL_SKILLS.filter((s) => !usedSkillIds.has(s.id)),
    [usedSkillIds],
  )

  // -----------------------------------------------------------------------
  // Emit changes
  // -----------------------------------------------------------------------

  const emitChange = useCallback(
    (next: readonly GraphSkillNode[]) => {
      setNodes(next)
      onChange?.(next)
    },
    [onChange],
  )

  // -----------------------------------------------------------------------
  // Reorder
  // -----------------------------------------------------------------------

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const arr = [...nodes]
      const temp = arr[index - 1]
      arr[index - 1] = { ...arr[index], order: index - 1 }
      arr[index] = { ...temp, order: index }
      emitChange(arr)
    },
    [nodes, emitChange],
  )

  const moveDown = useCallback(
    (index: number) => {
      if (index === nodes.length - 1) return
      const arr = [...nodes]
      const temp = arr[index + 1]
      arr[index + 1] = { ...arr[index], order: index + 1 }
      arr[index] = { ...temp, order: index }
      emitChange(arr)
    },
    [nodes, emitChange],
  )

  // -----------------------------------------------------------------------
  // Add / Remove
  // -----------------------------------------------------------------------

  const addSkill = useCallback(
    (skillId: string) => {
      const next: GraphSkillNode = { skillId, order: nodes.length, onFailGoTo: null }
      emitChange([...nodes, next])
      setShowSkillPicker(false)
    },
    [nodes, emitChange],
  )

  const removeSkill = useCallback(
    (index: number) => {
      const removedId = nodes[index].skillId
      const next = nodes
        .filter((_, i) => i !== index)
        .map((n, i) => ({
          ...n,
          order: i,
          // Clear any branch references to the removed skill
          onFailGoTo: n.onFailGoTo === removedId ? null : n.onFailGoTo,
        }))
      emitChange(next)
    },
    [nodes, emitChange],
  )

  // -----------------------------------------------------------------------
  // Branch config
  // -----------------------------------------------------------------------

  const setBranch = useCallback(
    (index: number, targetSkillId: string | null) => {
      const arr = [...nodes]
      arr[index] = { ...arr[index], onFailGoTo: targetSkillId }
      emitChange(arr)
    },
    [nodes, emitChange],
  )

  // -----------------------------------------------------------------------
  // Templates
  // -----------------------------------------------------------------------

  const applyTemplate = useCallback(
    (template: GraphTemplate) => {
      emitChange([...template.nodes])
    },
    [emitChange],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Campaign Graph Builder</span>
          <Badge variant="default">{nodes.length} skill{nodes.length !== 1 ? 's' : ''}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Templates */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Preset Templates</p>
          <div className="flex flex-wrap gap-2">
            {GRAPH_TEMPLATES.map((tmpl) => {
              const Icon = TEMPLATE_ICONS[tmpl.id] ?? Zap
              return (
                <Button
                  key={tmpl.id}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => applyTemplate(tmpl)}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {tmpl.name}
                  <span className="text-muted-foreground">({tmpl.nodes.length})</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Skill Flow List */}
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No skills added. Pick a template or add skills manually.
          </div>
        ) : (
          <div className="space-y-0">
            {nodes.map((node, index) => {
              const skill = skillById(node.skillId)
              const branchTarget = node.onFailGoTo ? skillById(node.onFailGoTo) : null
              const isLast = index === nodes.length - 1

              // Available branch targets: other nodes in the graph
              const branchOptions = nodes
                .filter((n) => n.skillId !== node.skillId)
                .map((n) => skillById(n.skillId))
                .filter(Boolean) as SkillEntry[]

              return (
                <div key={node.skillId}>
                  {/* Skill Node */}
                  <div className="flex items-stretch gap-2">
                    {/* Reorder buttons */}
                    <div className="flex flex-col justify-center gap-0.5">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className={cn(
                          'p-0.5 rounded hover:bg-muted transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                          index === 0 && 'opacity-30 cursor-not-allowed',
                        )}
                        aria-label={`Move ${skill?.name ?? node.skillId} up`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={isLast}
                        className={cn(
                          'p-0.5 rounded hover:bg-muted transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                          isLast && 'opacity-30 cursor-not-allowed',
                        )}
                        aria-label={`Move ${skill?.name ?? node.skillId} down`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Node card */}
                    <div className="flex-1 rounded-lg border p-3 bg-[var(--bg-tertiary)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{index + 1}.</span>
                            <span className="text-sm font-medium truncate">{skill?.name ?? node.skillId}</span>
                            <Badge variant="default" className="text-[10px] shrink-0">{skill?.category ?? 'unknown'}</Badge>
                          </div>
                          {skill?.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-7">{skill.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeSkill(index)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
                          aria-label={`Remove ${skill?.name ?? node.skillId}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Branch config */}
                      <div className="mt-2 ml-7 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">On fail:</span>
                        <Select
                          value={node.onFailGoTo ?? '__none__'}
                          onValueChange={(v) => setBranch(index, v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-48">
                            <SelectValue placeholder="Continue to next" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Continue to next</SelectItem>
                            {branchOptions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {!isLast && (
                    <div className="flex items-center ml-4 my-1">
                      <div className="flex flex-col items-center">
                        <ArrowDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      {/* Branch indicator */}
                      {node.onFailGoTo && (
                        <div className="flex items-center gap-1 ml-2">
                          <ArrowDownRight className="w-3.5 h-3.5 text-[var(--severity-medium)]" aria-hidden="true" />
                          <span className="text-[10px] text-[var(--severity-medium)] font-medium">
                            fail: {branchTarget?.name ?? node.onFailGoTo}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add Skill */}
        {showSkillPicker ? (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Add a skill</p>
              <button
                onClick={() => setShowSkillPicker(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
                aria-label="Close skill picker"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {availableSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => addSkill(skill.id)}
                  className="text-left px-2.5 py-1.5 rounded-md text-xs border border-[var(--border)] hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
                >
                  <span className="font-medium">{skill.name}</span>
                  <Badge variant="default" className="ml-1.5 text-[10px]">{skill.category}</Badge>
                </button>
              ))}
              {availableSkills.length === 0 && (
                <p className="text-xs text-muted-foreground col-span-2 text-center py-2">All skills have been added.</p>
              )}
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setShowSkillPicker(true)}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add Skill
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
