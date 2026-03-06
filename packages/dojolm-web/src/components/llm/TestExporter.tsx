/**
 * File: TestExporter.tsx
 * Purpose: Export test results in various formats
 * Index:
 * - TestExporter component (line 25)
 * - Format selection (line 70)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileJson, FileText, File } from 'lucide-react';
import type { LLMBatchExecution } from '@/lib/llm-types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export type ExportFormat = 'json' | 'pdf' | 'md';

export interface TestExporterProps {
  /** The batch execution to export */
  batch: LLMBatchExecution;
  /** All executions from the batch (for full export) */
  executions?: any[];
}

/**
 * Test Exporter Component
 *
 * Provides UI for exporting test results in JSON, PDF, or Markdown format.
 */
export function TestExporter({ batch, executions = [] }: TestExporterProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams({
        batchId: batch.id,
        format,
      });

      const response = await fetchWithAuth(`/api/llm/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the content based on format
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = await response.text();
        filename = `llm-test-results-${batch.id}.json`;
        mimeType = 'application/json';
      } else if (format === 'pdf') {
        content = await response.text(); // PDF is base64 encoded from server
        filename = `llm-test-results-${batch.id}.pdf`;
        mimeType = 'application/pdf';
      } else if (format === 'md') {
        content = await response.text();
        filename = `llm-test-results-${batch.id}.md`;
        mimeType = 'text/markdown';
      } else {
        throw new Error('Unsupported format');
      }

      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      // Could show a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'json':
        return <FileJson className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'md':
        return <File className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'json':
        return 'Full data export including all responses and metadata';
      case 'pdf':
        return 'Formatted report with tables and statistics';
      case 'md':
        return 'Markdown documentation format';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export Results</CardTitle>
        <CardDescription>
          {batch.completedTests} tests • {batch.completedTests - batch.failedTests} passed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format Selection */}
        <div className="space-y-2">
          <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-muted-foreground">
                      Full data export
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="font-medium">PDF</div>
                    <div className="text-xs text-muted-foreground">
                      Formatted report
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="md">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Markdown</div>
                    <div className="text-xs text-muted-foreground">
                      Documentation format
                    </div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Format Description */}
          <p className="text-xs text-muted-foreground">
            {getFormatDescription(format)}
          </p>
        </div>

        {/* Export Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{batch.executionIds.length} executions</Badge>
          <Badge variant="secondary">{batch.avgResilienceScore ? Math.round(batch.avgResilienceScore) + ' avg score' : 'N/A'}</Badge>
          <Badge variant="secondary">{format.toUpperCase()}</Badge>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || batch.status !== 'completed'}
          className="w-full"
        >
          {isExporting ? (
            <>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {format.toUpperCase()} File
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
