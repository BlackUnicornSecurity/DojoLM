/**
 * File: api/ecosystem/findings/route.ts
 * Purpose: CRUD API for cross-module Ecosystem Findings
 * Story: TPI-NODA-8.1
 * Methods: GET (query findings + stats), POST (create finding)
 */

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  saveFinding,
  queryFindings,
  getEcosystemStats,
} from '@/lib/storage/ecosystem-storage';
import {
  VALID_SOURCE_MODULES,
  VALID_FINDING_TYPES,
  VALID_SEVERITIES,
  ECOSYSTEM_MAX_QUERY_LIMIT,
} from '@/lib/ecosystem-types';
import type {
  EcosystemFinding,
  EcosystemSourceModule,
  EcosystemFindingType,
  EcosystemSeverity,
  EcosystemFindingQuery,
} from '@/lib/ecosystem-types';

// ===========================================================================
// GET /api/ecosystem/findings - Query findings or get stats
// ===========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // Stats mode: return aggregated ecosystem statistics
    if (mode === 'stats') {
      const stats = await getEcosystemStats();
      return NextResponse.json({ data: stats });
    }

    // Query mode: return filtered findings
    const query: EcosystemFindingQuery = {};

    const sourceModule = searchParams.get('sourceModule');
    if (sourceModule) {
      if (!VALID_SOURCE_MODULES.has(sourceModule as EcosystemSourceModule)) {
        return NextResponse.json(
          { error: `Invalid sourceModule: ${sourceModule}` },
          { status: 400 }
        );
      }
      query.sourceModule = sourceModule as EcosystemSourceModule;
    }

    const findingType = searchParams.get('findingType');
    if (findingType) {
      if (!VALID_FINDING_TYPES.has(findingType as EcosystemFindingType)) {
        return NextResponse.json(
          { error: `Invalid findingType: ${findingType}` },
          { status: 400 }
        );
      }
      query.findingType = findingType as EcosystemFindingType;
    }

    const severity = searchParams.get('severity');
    if (severity) {
      if (!VALID_SEVERITIES.has(severity as EcosystemSeverity)) {
        return NextResponse.json(
          { error: `Invalid severity: ${severity}` },
          { status: 400 }
        );
      }
      query.severity = severity as EcosystemSeverity;
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      if (isNaN(Date.parse(startDate))) {
        return NextResponse.json(
          { error: 'Invalid startDate format' },
          { status: 400 }
        );
      }
      query.startDate = new Date(startDate).toISOString();
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        return NextResponse.json(
          { error: 'Invalid endDate format' },
          { status: 400 }
        );
      }
      query.endDate = new Date(endDate).toISOString();
    }

    const search = searchParams.get('search');
    if (search) {
      // Limit search term length to prevent abuse
      query.search = search.slice(0, 200);
    }

    const limit = searchParams.get('limit');
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: 'limit must be a positive integer' },
          { status: 400 }
        );
      }
      query.limit = Math.min(parsed, ECOSYSTEM_MAX_QUERY_LIMIT);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      const parsed = parseInt(offset, 10);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: 'offset must be a non-negative integer' },
          { status: 400 }
        );
      }
      query.offset = parsed;
    }

    const result = await queryFindings(query);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error querying ecosystem findings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================================================
// POST /api/ecosystem/findings - Create a new finding
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { sourceModule, findingType, severity, title, description, relatedModel, tpiStory, owaspMapping, evidence, metadata } = body;

    if (!sourceModule || !VALID_SOURCE_MODULES.has(sourceModule)) {
      return NextResponse.json(
        { error: `Invalid or missing sourceModule. Must be one of: ${[...VALID_SOURCE_MODULES].join(', ')}` },
        { status: 400 }
      );
    }

    if (!findingType || !VALID_FINDING_TYPES.has(findingType)) {
      return NextResponse.json(
        { error: `Invalid or missing findingType. Must be one of: ${[...VALID_FINDING_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    if (!severity || !VALID_SEVERITIES.has(severity)) {
      return NextResponse.json(
        { error: `Invalid or missing severity. Must be one of: ${[...VALID_SEVERITIES].join(', ')}` },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    if (title.trim().length > 500) {
      return NextResponse.json(
        { error: 'title must not exceed 500 characters' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'description is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    if (description.trim().length > 5000) {
      return NextResponse.json(
        { error: 'description must not exceed 5000 characters' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (relatedModel !== undefined && typeof relatedModel !== 'string') {
      return NextResponse.json({ error: 'relatedModel must be a string' }, { status: 400 });
    }
    if (tpiStory !== undefined && typeof tpiStory !== 'string') {
      return NextResponse.json({ error: 'tpiStory must be a string' }, { status: 400 });
    }
    if (owaspMapping !== undefined && typeof owaspMapping !== 'string') {
      return NextResponse.json({ error: 'owaspMapping must be a string' }, { status: 400 });
    }
    if (evidence !== undefined && typeof evidence !== 'string') {
      return NextResponse.json({ error: 'evidence must be a string' }, { status: 400 });
    }
    if (evidence !== undefined && typeof evidence === 'string' && evidence.length > 2000) {
      return NextResponse.json({ error: 'evidence must not exceed 2000 characters' }, { status: 400 });
    }
    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
      return NextResponse.json({ error: 'metadata must be a plain object' }, { status: 400 });
    }

    const finding: EcosystemFinding = {
      id: crypto.randomUUID(),
      sourceModule,
      findingType,
      severity,
      timestamp: new Date().toISOString(),
      title: title.trim(),
      description: description.trim(),
      relatedModel: relatedModel?.trim(),
      tpiStory: tpiStory?.trim(),
      owaspMapping: owaspMapping?.trim(),
      evidence: evidence?.trim(),
      metadata: metadata || {},
    };

    const saved = await saveFinding(finding);
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    console.error('Error creating ecosystem finding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
