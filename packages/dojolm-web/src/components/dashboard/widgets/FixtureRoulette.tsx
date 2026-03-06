'use client'

/**
 * File: FixtureRoulette.tsx
 * Purpose: Random fixture picker with inline scan verdict and media preview
 * Story: TPI-NODA-1.5.4
 */

import { useState, useCallback } from 'react'
import { WidgetCard } from '../WidgetCard'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { cn } from '@/lib/utils'
import { Shuffle, ScanLine, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface FixtureData {
  category: string
  file: string
  content: string | null
  isBinary: boolean
  mimeType: string | null
}

interface ScanVerdict {
  verdict: 'BLOCK' | 'ALLOW'
  findings: number
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | null
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'])
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac'])
const VIDEO_EXTS = new Set(['.mp4', '.webm'])

function getFileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export function FixtureRoulette() {
  const [fixture, setFixture] = useState<FixtureData | null>(null)
  const [verdict, setVerdict] = useState<ScanVerdict | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  const spinRoulette = useCallback(async () => {
    setLoading(true)
    setVerdict(null)
    try {
      const manifestRes = await fetchWithAuth('/api/fixtures')
      if (!manifestRes.ok) throw new Error('Failed to load fixtures')
      const manifest = await manifestRes.json()

      const categories = Object.keys(manifest.categories ?? {})
      if (categories.length === 0) return

      // Random category and file
      const catName = categories[Math.floor(Math.random() * categories.length)]
      const cat = manifest.categories[catName]
      const files: string[] = cat.files ?? []
      if (files.length === 0) return

      const fileName = files[Math.floor(Math.random() * files.length)]
      const ext = getFileExt(fileName)
      const isBinary = IMAGE_EXTS.has(ext) || AUDIO_EXTS.has(ext) || VIDEO_EXTS.has(ext) || ext === '.pdf'

      // Read content for text files
      let content: string | null = null
      let mimeType: string | null = null
      if (!isBinary) {
        try {
          const readRes = await fetchWithAuth(`/api/read-fixture?path=${encodeURIComponent(`${catName}/${fileName}`)}`)
          if (readRes.ok) {
            const data = await readRes.json()
            content = data.content ?? null
          }
        } catch {
          // Silent failure
        }
      } else {
        if (IMAGE_EXTS.has(ext)) mimeType = `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`
        else if (AUDIO_EXTS.has(ext)) mimeType = `audio/${ext.slice(1)}`
        else if (VIDEO_EXTS.has(ext)) mimeType = `video/${ext.slice(1)}`
      }

      setFixture({ category: catName, file: fileName, content, isBinary, mimeType })
    } catch {
      // Silent failure
    } finally {
      setLoading(false)
    }
  }, [])

  const handleScan = useCallback(async () => {
    if (!fixture) return
    setScanning(true)
    try {
      const res = await fetchWithAuth(`/api/scan-fixture?path=${encodeURIComponent(`${fixture.category}/${fixture.file}`)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.skipped) {
          setVerdict({ verdict: 'ALLOW', findings: 0, severity: null })
        } else {
          setVerdict({
            verdict: data.verdict,
            findings: data.findings?.length ?? 0,
            severity: data.counts?.critical > 0 ? 'CRITICAL' : data.counts?.warning > 0 ? 'WARNING' : data.findings?.length > 0 ? 'INFO' : null,
          })
        }
      }
    } catch {
      // Silent failure
    } finally {
      setScanning(false)
    }
  }, [fixture])

  return (
    <WidgetCard title="Fixture Roulette">
      <div className="space-y-3">
        {fixture ? (
          <>
            {/* Category badge + file name */}
            <div>
              <span className="text-xs px-1.5 py-0.5 bg-[var(--dojo-subtle)] text-[var(--dojo-primary)] rounded font-medium">
                {fixture.category}
              </span>
              <div className="text-sm font-medium mt-1 truncate">{fixture.file}</div>
            </div>

            {/* Content preview or media */}
            {fixture.isBinary && fixture.mimeType ? (
              <div className="rounded border border-[var(--border)] overflow-hidden">
                {fixture.mimeType.startsWith('image/') && (
                  // SVG via <img> only — XSS safety
                  <img
                    src={`/api/read-fixture?path=${encodeURIComponent(`${fixture.category}/${fixture.file}`)}&raw=true`}
                    alt={fixture.file}
                    className="max-h-32 w-full object-contain bg-muted"
                  />
                )}
                {fixture.mimeType.startsWith('audio/') && (
                  <audio controls className="w-full">
                    <source src={`/api/read-fixture?path=${encodeURIComponent(`${fixture.category}/${fixture.file}`)}&raw=true`} type={fixture.mimeType} />
                  </audio>
                )}
                {fixture.mimeType.startsWith('video/') && (
                  <video controls className="max-h-48 w-full">
                    <source src={`/api/read-fixture?path=${encodeURIComponent(`${fixture.category}/${fixture.file}`)}&raw=true`} type={fixture.mimeType} />
                  </video>
                )}
              </div>
            ) : fixture.content ? (
              <pre className="text-xs font-mono p-2 bg-muted/50 rounded border border-[var(--border)] overflow-hidden whitespace-pre-wrap break-all max-h-24 text-foreground/80">
                {fixture.content.slice(0, 300)}
                {fixture.content.length > 300 ? '...' : ''}
              </pre>
            ) : (
              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                Binary file — {fixture.file}
              </div>
            )}

            {/* Verdict display */}
            {verdict && (
              <div className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded text-xs font-medium',
                verdict.verdict === 'BLOCK'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              )}>
                <span>{verdict.verdict}</span>
                {verdict.severity && <SeverityBadge severity={verdict.severity} showIcon={false} />}
                <span>{verdict.findings} finding{verdict.findings !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleScan}
                disabled={scanning}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
                  'bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-primary-hover)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
                  'disabled:opacity-50'
                )}
              >
                {scanning ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" /> : <ScanLine className="w-3 h-3" aria-hidden="true" />}
                Scan It
              </button>
              <button
                onClick={spinRoulette}
                disabled={loading}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
                  'border border-[var(--border)] text-muted-foreground hover:text-foreground hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
                  'disabled:opacity-50'
                )}
              >
                <Shuffle className="w-3 h-3" aria-hidden="true" />
                Again
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={spinRoulette}
            disabled={loading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-6 text-sm font-medium rounded-lg',
              'border-2 border-dashed border-[var(--border)] text-muted-foreground',
              'hover:text-foreground hover:border-[var(--dojo-primary)] hover:bg-[var(--dojo-subtle)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              'disabled:opacity-50'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Shuffle className="w-4 h-4" aria-hidden="true" />
            )}
            Discover an Attack
          </button>
        )}
      </div>
    </WidgetCard>
  )
}
