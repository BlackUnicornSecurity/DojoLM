/**
 * File: ReportGenerator.tsx
 * Purpose: Deliverable download system with format selector
 * Index:
 * - ReportGenerator component (line 20)
 */

'use client';

import { useState, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileJson, FileText, FileSpreadsheet, Shield, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export type ExportFormatType = 'json' | 'csv' | 'sarif' | 'pdf';

interface FormatOption {
  value: ExportFormatType;
  label: string;
  description: string;
  iconName: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'json', label: 'JSON', description: 'Raw results data', iconName: 'json' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet-compatible', iconName: 'csv' },
  { value: 'sarif', label: 'SARIF', description: 'CI/CD integration (2.1.0)', iconName: 'sarif' },
  { value: 'pdf', label: 'PDF', description: 'Branded report', iconName: 'pdf' },
];

const BATCH_ID_PATTERN = /^batch-\d+-[a-z0-9]+$/;

function getFormatIcon(name: string): ReactNode {
  switch (name) {
    case 'json': return <FileJson className="h-4 w-4" />;
    case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
    case 'sarif': return <Shield className="h-4 w-4" />;
    case 'pdf': return <FileText className="h-4 w-4" />;
    default: return <FileJson className="h-4 w-4" />;
  }
}

export interface ReportGeneratorProps {
  /** Batch ID to export (optional - exports all if not provided) */
  batchId?: string;
  /** Compact mode for inline usage */
  compact?: boolean;
}

/**
 * Report Generator Component
 *
 * Download button with format selector for exporting test results
 * in JSON, CSV, SARIF, or PDF formats.
 */
export function ReportGenerator({ batchId, compact = false }: ReportGeneratorProps) {
  const [format, setFormat] = useState<ExportFormatType>('json');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDownloadingRef = useRef(false);

  const handleDownload = async () => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    setError(null);

    try {
      // Validate batchId format if provided
      if (batchId && !BATCH_ID_PATTERN.test(batchId)) {
        throw new Error('Invalid batch ID format');
      }

      // Build URL based on format
      const params = new URLSearchParams();
      if (batchId) {
        params.set('batchId', batchId);
      } else {
        params.set('mode', 'all');
      }

      if (format === 'pdf') {
        params.set('format', 'pdf');
        const response = await fetchWithAuth(`/api/llm/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to generate PDF');

        // PDF is returned as base64 in a JSON envelope
        const json = await response.json();
        const pdfBytes = Uint8Array.from(atob(json.data), c => c.charCodeAt(0));
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        downloadBlob(blob, json.filename ?? `dojolm-report-${Date.now()}.pdf`);
      } else if (format === 'csv') {
        params.set('format', 'csv');
        const response = await fetchWithAuth(`/api/llm/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to generate CSV');

        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        downloadBlob(blob, `dojolm-results-${Date.now()}.csv`);
      } else if (format === 'sarif') {
        params.set('format', 'sarif');
        const response = await fetchWithAuth(`/api/llm/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to generate SARIF');

        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `dojolm-results-${Date.now()}.sarif.json`);
      } else {
        // JSON
        params.set('format', 'json');
        const response = await fetchWithAuth(`/api/llm/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to generate JSON');

        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `dojolm-results-${Date.now()}.json`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      setTimeout(() => setError(null), 10000);
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
    }
  };

  const handleFormatChange = (v: string) => {
    setFormat(v as ExportFormatType);
    setError(null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[132px] border-transparent bg-transparent shadow-none hover:bg-[var(--overlay-subtle)] focus:ring-0 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {getFormatIcon(opt.iconName)}
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="default"
          onClick={handleDownload}
          disabled={isDownloading}
          className="gap-1"
        >
          {isDownloading ? (
            <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Export
        </Button>
        {error && (
          <p role="alert" aria-live="assertive" className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {getFormatIcon(opt.iconName)}
                  <span>{opt.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="gap-2"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Report
            </>
          )}
        </Button>
      </div>

      {error && (
        <p role="alert" aria-live="assertive" className="text-sm text-red-500">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {FORMAT_OPTIONS.find(f => f.value === format)?.description}
      </p>
    </div>
  );
}

/**
 * Trigger browser download for a blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
