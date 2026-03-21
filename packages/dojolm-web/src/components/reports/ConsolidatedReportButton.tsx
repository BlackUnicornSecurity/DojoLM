'use client'

/**
 * File: ConsolidatedReportButton.tsx
 * Purpose: Dropdown button for downloading consolidated reports in PDF/Markdown/JSON formats
 * Story: D3.4
 * Index:
 * - ReportFormat type (line 16)
 * - FORMAT_OPTIONS constant (line 18)
 * - ConsolidatedReportButton component (line 35)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, ChevronDown, FileText, FileJson, File, Loader2, AlertCircle } from 'lucide-react'

type ReportFormat = 'pdf' | 'markdown' | 'json'

const FORMAT_OPTIONS: ReadonlyArray<{
  readonly format: ReportFormat
  readonly label: string
  readonly icon: typeof FileText
  readonly extension: string
  readonly mime: string
}> = [
  { format: 'pdf', label: 'PDF Report', icon: FileText, extension: '.pdf', mime: 'application/pdf' },
  { format: 'markdown', label: 'Markdown', icon: File, extension: '.md', mime: 'text/markdown' },
  { format: 'json', label: 'JSON Data', icon: FileJson, extension: '.json', mime: 'application/json' },
] as const

interface ConsolidatedReportButtonProps {
  readonly className?: string
  readonly disabled?: boolean
}

export function ConsolidatedReportButton({ className, disabled = false }: ConsolidatedReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeFormat, setActiveFormat] = useState<ReportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    if (!isLoading) {
      setIsOpen(prev => !prev)
      setError(null)
    }
  }, [isLoading])

  const handleDownload = useCallback(async (format: ReportFormat) => {
    setIsOpen(false)
    setIsLoading(true)
    setActiveFormat(format)
    setError(null)

    try {
      const response = await fetch(`/api/reports/consolidated?format=${format}`)

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(
          errorBody
            ? `Report generation failed: ${errorBody}`
            : `Report generation failed (${response.status})`
        )
      }

      const blob = await response.blob()
      const option = FORMAT_OPTIONS.find(o => o.format === format)

      if (!option) {
        throw new Error(`Unknown format: ${format}`)
      }

      const url = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `dojolm-report-${timestamp}${option.extension}`

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()

      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url)
        document.body.removeChild(anchor)
      }, 100)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download report'
      setError(message)
    } finally {
      setIsLoading(false)
      setActiveFormat(null)
    }
  }, [])

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className ?? ''}`}>
      <Button
        variant="default"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Download consolidated report"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isLoading ? 'Generating...' : 'Download Report'}</span>
        {!isLoading && (
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
      </Button>

      {/* Loading indicator with active format */}
      {isLoading && activeFormat && (
        <div className="absolute top-full left-0 mt-1 w-full">
          <Badge variant="active" className="w-full justify-center text-xs">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Preparing {activeFormat.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Error feedback */}
      {error && !isLoading && (
        <div
          className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2 text-xs text-[var(--danger)]"
          role="alert"
        >
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-48 rounded-xl border border-[var(--border-subtle)] bg-card shadow-[var(--shadow-card)] backdrop-blur-sm overflow-hidden"
          role="listbox"
          aria-label="Report format options"
        >
          {FORMAT_OPTIONS.map(({ format, label, icon: Icon }) => (
            <button
              key={format}
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--overlay-subtle)] motion-safe:transition-colors motion-safe:duration-150 cursor-pointer"
              onClick={() => handleDownload(format)}
            >
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{label}</span>
              <Badge variant="info" className="ml-auto text-[10px] px-1.5 py-0">
                .{format === 'markdown' ? 'md' : format}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
