/**
 * File: PatternReference.tsx
 * Purpose: Display pattern reference documentation
 * Index:
 * - PatternReference component (line 18)
 * - PatternGroup component (line 75)
 * - PatternCard component (line 130)
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, escHtml } from '@/lib/utils'
import { ShieldAlert, AlertTriangle, Info, Search, BookOpen } from 'lucide-react'
import { useState } from 'react'

const SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

interface Pattern {
  name: string
  cat: string
  sev: string
  desc: string
  re?: RegExp
  source?: string
  weight?: number
  lang?: string
}

interface PatternGroup {
  name: string
  patterns: Pattern[]
  type: 'current' | 'planned'
}

interface PatternReferenceProps {
  patternGroups: PatternGroup[]
  className?: string
}

export function PatternReference({ patternGroups, className }: PatternReferenceProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGroups = patternGroups.map(group => ({
    ...group,
    patterns: group.patterns.filter(pattern =>
      pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.cat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.patterns.length > 0)

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Pattern Reference
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Complete reference of all detection patterns in the scanner
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-6 pr-4">
          {filteredGroups.map((group, index) => (
            <PatternGroup
              key={index}
              group={group}
            />
          ))}

          {filteredGroups.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center space-y-2">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No patterns found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface PatternGroupProps {
  group: PatternGroup
}

function PatternGroup({ group }: PatternGroupProps) {
  const typeBadge = group.type === 'current'
    ? 'text-green-500 bg-green-500/10 border-green-500/20'
    : 'text-orange-500 bg-orange-500/10 border-orange-500/20'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <Badge variant="outline" className={cn('text-xs', typeBadge)}>
            {group.type === 'current' ? 'Current' : 'TPI Planned'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.patterns.map((pattern, index) => (
          <PatternCard key={index} pattern={pattern} />
        ))}
      </CardContent>
    </Card>
  )
}

interface PatternCardProps {
  pattern: Pattern
}

function PatternCard({ pattern }: PatternCardProps) {
  const severityClass = {
    [SEVERITY.CRITICAL]: 'critical',
    [SEVERITY.WARNING]: 'warning',
    [SEVERITY.INFO]: 'info',
  }[pattern.sev]

  const severityColor = {
    [SEVERITY.CRITICAL]: 'text-red-500 bg-red-500/10 border-red-500/20',
    [SEVERITY.WARNING]: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    [SEVERITY.INFO]: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  }[pattern.sev] || 'text-gray-500 bg-gray-500/10 border-gray-500/20'

  const SeverityIcon = {
    [SEVERITY.CRITICAL]: ShieldAlert,
    [SEVERITY.WARNING]: AlertTriangle,
    [SEVERITY.INFO]: Info,
  }[pattern.sev] || Info

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-l-4 bg-muted/50',
        severityClass === 'critical' && 'border-l-red-500',
        severityClass === 'warning' && 'border-l-orange-500',
        severityClass === 'info' && 'border-l-blue-500'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <SeverityIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {pattern.cat}
          </span>
        </div>
        <Badge className={cn('text-xs', severityColor)} variant="secondary">
          {pattern.sev}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {pattern.desc}
      </p>

      {pattern.re && (
        <code className="block text-xs font-mono p-2 bg-background rounded border mb-2">
          <span className="text-orange-500">{pattern.re.source}</span>
        </code>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="font-mono">{pattern.name}</span>
        {pattern.weight && <span>• Weight: {pattern.weight}</span>}
        {pattern.lang && <span>• Lang: {pattern.lang}</span>}
        {pattern.source && <span className="text-purple-500">• {pattern.source}</span>}
      </div>
    </div>
  )
}
