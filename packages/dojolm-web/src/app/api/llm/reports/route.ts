/**
 * File: api/llm/reports/route.ts
 * Purpose: Generate and export reports
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import type { ReportFormat, ReportRequest } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { generateModelReport } from '@/lib/llm-server-utils';
import { generateReport, generateReportFilename } from '@/lib/llm-reports';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/reports - Generate a report
// ===========================================================================

export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);

    // Get required parameters
    const modelId = searchParams.get('modelId');
    const format = (searchParams.get('format') || 'json') as ReportFormat;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats: ReportFormat[] = ['json', 'markdown', 'csv'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Get model
    const model = await fileStorage.getModelConfig(modelId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Build report request
    const reportRequest: ReportRequest = {
      modelConfigId: modelId,
      format,
      includeExecutions: searchParams.get('includeExecutions') === 'true',
      includeResponses: searchParams.get('includeResponses') === 'true',
    };

    // Generate report
    const report = await generateModelReport(modelId);
    const reportContent = generateReport(report, reportRequest);

    // Determine content type
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      csv: 'text/csv',
    };

    // Generate filename
    const filename = generateReportFilename(model.name, format);

    // Return report
    return new NextResponse(reportContent, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiError('Failed to generate report', 500, error);
  }
}
