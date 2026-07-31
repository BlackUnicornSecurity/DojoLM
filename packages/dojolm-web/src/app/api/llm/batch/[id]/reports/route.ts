// SPDX-License-Identifier: Apache-2.0
/**
 * File: api/llm/batch/[id]/reports/route.ts
 * Purpose: Generate per-model Bushido Book reports for a batch
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { withAuth } from '@/lib/auth/route-guard';
import { generateBatchModelReports } from '@/lib/llm-server-utils';

// ===========================================================================
// GET /api/llm/batch/:id/reports - Per-model batch reports for Bushido Book
// ===========================================================================

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
  try {
    const id = params?.id ?? '';

    if (!id || !/^[\w.\-]+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid batch ID' },
        { status: 400 }
      );
    }

    const report = await generateBatchModelReports(id);

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return apiError('Failed to generate batch reports', 500, error);
  }
  },
  { role: 'admin' },
);
