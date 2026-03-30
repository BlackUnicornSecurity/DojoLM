'use client'

/**
 * File: FixtureRoulette.tsx
 * Purpose: Random fixture picker with inline scan verdict and media preview
 * Story: TPI-NODA-1.5.4
 */

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { WidgetCard } from '../WidgetCard'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Shuffle, ScanLine, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { getCachedFixtureManifest } from '@/lib/client-data-cache'

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
      const manifest = await getCachedFixtureManifest()

      const categories = Object.keys(manifest.categories ?? {})
      if (categories.length === 0) return

      // Random category and file
      const catName = categories[Math.floor(Math.random() * categories.length)]
      const cat = manifest.categories[catName]
      const files = Array.isArray(cat?.files) ? cat.files : []
      if (files.length === 0) return

      const fileEntry = files[Math.floor(Math.random() * files.length)]
      const fileName = typeof fileEntry === 'string' ? fileEntry : fileEntry?.file
      if (!fileName) return
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
            <div className="rounded-xl border border-[var(--border-subtle)] surface-base p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs px-1.5 py-0.5 bg-[var(--dojo-subtle)] text-[var(--dojo-primary)] rounded font-medium">
                    {fixture.category}
                  </span>
                  <div className="text-sm font-semibold mt-2 truncate text-[var(--foreground)]">{fixture.file}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Randomly pulled from the Armory for a fast drill run.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={spinRoulette}
                  disabled={loading}
                  className="text-xs"
                >
                  <Shuffle className="w-3 h-3" aria-hidden="true" />
                  Another
                </Button>
              </div>
            </div>

            {/* Content preview or media */}
            {fixture.isBinary && fixture.mimeType ? (
              <div className="rounded-xl border border-[var(--border-subtle)] surface-base overflow-hidden">
                {fixture.mimeType.startsWith('image/') && (
                  // SVG via Image with unoptimized — XSS safety (local API route)
                  <Image
                    src={`/api/read-fixture?path=${encodeURIComponent(`${fixture.category}/${fixture.file}`)}&raw=true`}
                    alt={fixture.file}
                    width={320}
                    height={160}
                    unoptimized
                    className="max-h-40 w-full object-contain bg-muted"
                  />
                )}
                {fixture.mimeType.startsWith('audio/') && (
                  <audio controls className="w-full p-3">
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
              <pre className="text-xs font-mono p-3 rounded-xl border border-[var(--border-subtle)] surface-base overflow-hidden whitespace-pre-wrap break-all max-h-28 text-foreground/80">
                {fixture.content.slice(0, 300)}
                {fixture.content.length > 300 ? '...' : ''}
              </pre>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] surface-base p-3 text-xs text-muted-foreground">
                Binary file preview ready for scan.
              </div>
            )}

            {/* Verdict display */}
            {verdict && (
              <div className={cn(
                'flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium',
                verdict.verdict === 'BLOCK'
                  ? 'bg-[var(--status-block-bg)] text-[var(--status-block)] border border-[var(--status-block)]/20'
                  : 'bg-[var(--status-allow-bg)] text-[var(--status-allow)] border border-[var(--status-allow)]/20'
              )}>
                <span>{verdict.verdict}</span>
                {verdict.severity && <SeverityBadge severity={verdict.severity} showIcon={false} />}
                <span>{verdict.findings} finding{verdict.findings !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="gradient"
                onClick={handleScan}
                disabled={scanning}
                className="flex-1"
              >
                {scanning ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" /> : <ScanLine className="w-3 h-3" aria-hidden="true" />}
                Scan It
              </Button>
              <Button
                variant="outline"
                onClick={spinRoulette}
                disabled={loading}
              >
                <Shuffle className="w-3 h-3" aria-hidden="true" />
                Again
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] surface-base p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dojo-subtle)] text-[var(--dojo-primary)]">
                {loading ? (
                  <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Shuffle className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Need a fresh attack sample?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Pull a random fixture from the Armory, preview it inline, and run a quick verdict without leaving the dashboard.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] text-muted-foreground">Random category</span>
                  <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] text-muted-foreground">Inline preview</span>
                  <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] text-muted-foreground">One-click scan</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="gradient"
                onClick={spinRoulette}
                disabled={loading}
                className="w-full"
              >
                Discover an Attack
              </Button>
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
