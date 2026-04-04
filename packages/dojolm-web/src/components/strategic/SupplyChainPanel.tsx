'use client'

/**
 * File: SupplyChainPanel.tsx
 * Purpose: Supply chain security panel for Kumite — model verification and dependency audit
 * Story: H24.3
 * Index:
 * - VerificationResult interface (line 19)
 * - DependencyVuln interface (line 25)
 * - MOCK data (line 31)
 * - SupplyChainPanel component (line 70)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Package, ShieldCheck, ShieldX, Upload, Loader2, FileSearch } from 'lucide-react'

// MOCK DATA — replace with live data when backend is available

interface VerificationResult {
  status: 'pass' | 'fail'
  model: string
  hash: string
  message: string
}

interface DependencyEntry {
  name: string
  version: string
  license: string
  vulnerabilities: DependencyVuln[]
}

interface DependencyVuln {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
}

const MOCK_VERIFICATION: VerificationResult = {
  status: 'pass',
  model: 'llama-3-8b-instruct',
  hash: 'sha256:a1b2c3d4e5f6...',
  message: 'Model checksum verified against upstream registry. No tampering detected.',
}

const MOCK_DEPENDENCIES: DependencyEntry[] = [
  {
    name: 'transformers',
    version: '4.38.1',
    license: 'Apache-2.0',
    vulnerabilities: [],
  },
  {
    name: 'tokenizers',
    version: '0.15.0',
    license: 'Apache-2.0',
    vulnerabilities: [
      {
        id: 'CVE-2024-12345',
        severity: 'high',
        description: 'Buffer overflow in BPE tokenizer when processing malformed input exceeding 2GB.',
      },
    ],
  },
  {
    name: 'safetensors',
    version: '0.4.2',
    license: 'Apache-2.0',
    vulnerabilities: [],
  },
]

const FORMAT_OPTIONS = ['requirements.txt', 'pyproject.toml', 'package.json'] as const

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-[var(--status-block)]/15 text-[var(--status-block)]',
  high: 'bg-[var(--dojo-primary)]/15 text-[var(--dojo-primary)]',
  medium: 'bg-[var(--severity-medium)]/15 text-[var(--severity-medium)]',
  low: 'bg-[var(--status-allow)]/15 text-[var(--status-allow)]',
}

export function SupplyChainPanel() {
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  // Model Verification state
  const [modelPath, setModelPath] = useState('models/llama-3-8b-instruct')
  const [modelHash, setModelHash] = useState('sha256:a1b2c3d4e5f6...')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null)

  // Dependency Audit state
  const [selectedFormat, setSelectedFormat] = useState<string>(FORMAT_OPTIONS[0])
  const [auditing, setAuditing] = useState(false)
  const [auditResults, setAuditResults] = useState<DependencyEntry[] | null>(null)

  const handleVerify = useCallback(() => {
    setVerifying(true)
    setVerifyResult(null)
    const timeoutId = setTimeout(() => {
      setVerifying(false)
      setVerifyResult(MOCK_VERIFICATION)
    }, 1500)
    timeoutRefs.current.push(timeoutId)
  }, [])

  const handleAudit = useCallback(() => {
    setAuditing(true)
    setAuditResults(null)
    const timeoutId = setTimeout(() => {
      setAuditing(false)
      setAuditResults(MOCK_DEPENDENCIES)
    }, 1800)
    timeoutRefs.current.push(timeoutId)
  }, [])

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutRefs.current) {
        clearTimeout(timeoutId)
      }
      timeoutRefs.current = []
    }
  }, [])

  const totalVulns = auditResults?.reduce((sum, d) => sum + d.vulnerabilities.length, 0) ?? 0

  return (
    <GlowCard glow="subtle" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Package className="w-5 h-5 text-[var(--bu-electric)]" aria-hidden="true" />
        <h3 className="text-base font-semibold">Supply Chain Security</h3>
      </div>

      <div className="space-y-6">
        {/* ---- Model Verification ---- */}
        <section>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--status-allow)]" aria-hidden="true" />
            Model Verification
          </h4>

          <div className="grid gap-3 sm:grid-cols-2 mb-3">
            <div>
              <label htmlFor="model-path" className="text-xs text-muted-foreground mb-1 block">Model Path</label>
              <input
                id="model-path"
                type="text"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-2',
                  'text-sm font-mono text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)] focus:border-transparent'
                )}
              />
            </div>
            <div>
              <label htmlFor="model-hash" className="text-xs text-muted-foreground mb-1 block">Expected Hash</label>
              <input
                id="model-hash"
                type="text"
                value={modelHash}
                onChange={(e) => setModelHash(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-2',
                  'text-sm font-mono text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)] focus:border-transparent'
                )}
              />
            </div>
          </div>

          <Button variant="default" size="sm" onClick={handleVerify} disabled={verifying || !modelPath.trim()}>
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>

          {verifyResult && (
            <div className={cn(
              'mt-3 rounded-lg border p-3 flex items-start gap-3',
              verifyResult.status === 'pass'
                ? 'border-[var(--status-allow)]/30 bg-[var(--status-allow)]/5'
                : 'border-[var(--status-block)]/30 bg-[var(--status-block)]/5'
            )}>
              {verifyResult.status === 'pass' ? (
                <ShieldCheck className="w-5 h-5 text-[var(--status-allow)] flex-shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <ShieldX className="w-5 h-5 text-[var(--status-block)] flex-shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <span className={cn(
                  'text-xs font-semibold uppercase px-2 py-0.5 rounded',
                  verifyResult.status === 'pass'
                    ? 'bg-[var(--status-allow)]/15 text-[var(--status-allow)]'
                    : 'bg-[var(--status-block)]/15 text-[var(--status-block)]'
                )}>
                  {verifyResult.status}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5">{verifyResult.message}</p>
              </div>
            </div>
          )}
        </section>

        {/* ---- Dependency Audit ---- */}
        <section>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-[var(--severity-medium)]" aria-hidden="true" />
            Dependency Audit
          </h4>

          {/* File Upload Area */}
          <div className={cn(
            'rounded-lg border-2 border-dashed border-[var(--border-subtle)] p-6 text-center mb-3',
            'opacity-60'
          )}>
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              File upload coming soon — use demo data below
            </p>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-muted-foreground">Format:</span>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                    selectedFormat === fmt
                      ? 'bg-[var(--bu-electric)] text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={selectedFormat === fmt}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <Button variant="default" size="sm" onClick={handleAudit} disabled={auditing}>
            {auditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Auditing...
              </>
            ) : (
              'Run Audit'
            )}
          </Button>

          {/* Audit Results */}
          {auditResults && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                {auditResults.length} dependencies scanned &middot;{' '}
                <span className={totalVulns > 0 ? 'text-[var(--status-block)] font-semibold' : 'text-[var(--status-allow)]'}>
                  {totalVulns} {totalVulns === 1 ? 'vulnerability' : 'vulnerabilities'} found
                </span>
              </p>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Package</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Version</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">License</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Vulnerabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditResults.map((dep) => (
                      <tr key={dep.name} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--overlay-subtle)]">
                        <td className="py-2.5 px-2 font-mono text-xs font-medium">{dep.name}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">{dep.version}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">{dep.license}</td>
                        <td className="py-2.5 px-2">
                          {dep.vulnerabilities.length === 0 ? (
                            <span className="text-xs text-[var(--status-allow)]">None</span>
                          ) : (
                            <div className="space-y-1.5">
                              {dep.vulnerabilities.map((v) => (
                                <div key={v.id}>
                                  <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded uppercase', SEVERITY_BADGE[v.severity])}>
                                    {v.severity}
                                  </span>
                                  <span className="text-xs font-mono ml-1.5">{v.id}</span>
                                  <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </GlowCard>
  )
}
