'use client'

/**
 * File: EncodingChainVisualizer.tsx
 * Purpose: Visual chain diagram for multi-layer encoded payloads
 * Story: NODA-3 Story 5.4
 * Index:
 * - parseChainFromDescription helper (line 16)
 * - ENCODING_COLORS mapping (line 35)
 * - EncodingChainVisualizer component (line 46)
 */

import { memo, useMemo } from 'react'
import type { Finding } from '@/lib/types'
import { ArrowRight, Lock } from 'lucide-react'

/** Extract encoding chain from finding description string */
function parseChainFromDescription(description: string): { layers: string[]; depth: number; keyword: string } | null {
  // Pattern: "Multi-layer encoded payload (3 layers: Base64 -> URL -> Hex), keyword: "system""
  const match = description.match(/\((\d+) layers?: (.+?)\)/)
  if (!match) return null

  const depth = parseInt(match[1], 10)
  const layers = match[2].split('->').map(s => s.trim())

  // Extract keyword
  const kwMatch = description.match(/keyword: "(.+?)"/)
  const keyword = kwMatch ? kwMatch[1] : ''

  return { layers, depth, keyword }
}

/** Color mapping for encoding types */
const ENCODING_COLORS: Record<string, string> = {
  base64: 'var(--bu-electric)',
  url: 'var(--dojo-primary)',
  hex: 'var(--accent-violet)',
  octal: 'var(--warning)',
  'quoted-printable': 'var(--success)',
  utf7: 'var(--danger)',
  unicode: 'var(--severity-low)',
}

function getEncodingColor(type: string): string {
  const lower = type.toLowerCase()
  for (const [key, color] of Object.entries(ENCODING_COLORS)) {
    if (lower.includes(key)) return color
  }
  return 'var(--muted-foreground)'
}

interface EncodingChainVisualizerProps {
  finding: Finding
}

export const EncodingChainVisualizer = memo(function EncodingChainVisualizer({
  finding,
}: EncodingChainVisualizerProps) {
  const chain = useMemo(() => parseChainFromDescription(finding.description), [finding.description])

  if (!chain || chain.layers.length < 2) return null

  return (
    <div className="mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-3.5 w-3.5 text-[var(--warning)]" aria-hidden="true" />
        <span className="text-xs font-semibold text-[var(--warning)]">
          {chain.depth}-Layer Encoding Chain
        </span>
      </div>

      {/* Horizontal chain flow */}
      <div
        className="flex items-center gap-1 flex-wrap"
        role="img"
        aria-label={`Encoding chain: ${chain.layers.join(' to ')}, decoded keyword: ${chain.keyword}`}
      >
        {chain.layers.map((layer, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {/* Encoding type badge */}
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-lg border"
              style={{
                borderColor: getEncodingColor(layer),
                color: getEncodingColor(layer),
                backgroundColor: `color-mix(in srgb, ${getEncodingColor(layer)} 10%, transparent)`,
              }}
            >
              {layer}
            </span>

            {/* Arrow between layers */}
            {idx < chain.layers.length - 1 && (
              <ArrowRight
                className="h-3 w-3 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        ))}

        {/* Final decoded keyword */}
        {chain.keyword && (
          <>
            <ArrowRight
              className="h-3 w-3 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-[var(--danger)] text-white">
              &quot;{chain.keyword}&quot;
            </span>
          </>
        )}
      </div>
    </div>
  )
})
