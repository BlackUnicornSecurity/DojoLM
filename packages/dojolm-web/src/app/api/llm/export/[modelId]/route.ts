/**
 * File: api/llm/export/[modelId]/route.ts
 * Purpose: GET /api/llm/export/{modelId} — Export test results for a specific model
 * Supports same formats as the consolidated export: json, csv, sarif, markdown, pdf
 * Index:
 * - OPTIONS handler (line 14)
 * - GET handler (line 24)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { fileStorage } from '@/lib/storage/file-storage';

const SAFE_ID = /^[\w-]{1,128}$/;
const VALID_FORMATS = new Set(['json', 'csv', 'sarif', 'markdown']);

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { modelId } = await params;

  if (!SAFE_ID.test(modelId)) {
    return NextResponse.json(
      { error: 'Invalid model ID format' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'json';

  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json(
      { error: `Unsupported format: ${format}. Use json, csv, sarif, or markdown.` },
      { status: 400 }
    );
  }

  try {
    const [{ executions: allExecs }, models] = await Promise.all([
      fileStorage.queryExecutions({
        limit: 2000,
        sortBy: 'timestamp',
        sortDirection: 'desc',
      }),
      fileStorage.getModelConfigs(),
    ]);

    const executions = allExecs.filter(e => e.modelConfigId === modelId);

    if (executions.length === 0) {
      return NextResponse.json(
        { error: `No executions found for model: ${modelId}` },
        { status: 404 }
      );
    }

    const modelConfig = models.find(m => m.id === modelId);
    const completed = executions.filter(e => e.status === 'completed');
    const modelName = modelConfig?.name ?? modelId;
    const provider = modelConfig?.provider ?? 'unknown';
    const date = new Date().toISOString().split('T')[0];
    const safeModelName = modelName.replace(/[^\w-]/g, '_');

    if (format === 'json') {
      return NextResponse.json({
        modelId,
        modelName,
        provider,
        testCount: completed.length,
        avgResilienceScore: completed.length > 0
          ? Math.round(completed.reduce((s, e) => s + (e.resilienceScore ?? 0), 0) / completed.length)
          : 0,
        executions,
        exportedAt: new Date().toISOString(),
      }, {
        headers: {
          'Content-Disposition': `attachment; filename="llm-${safeModelName}-${date}.json"`,
        }
      });
    }

    if (format === 'csv') {
      const formulaStart = /^[=+\-@\t\r]/;
      const csvEsc = (v: string | number | undefined | null): string => {
        const s = String(v ?? '');
        const safe = formulaStart.test(s) ? `'${s}` : s;
        if (safe.includes(',') || safe.includes('\n') || safe.includes('"')) {
          return `"${safe.replace(/"/g, '""')}"`;
        }
        return safe;
      };

      const rows: string[][] = [[
        'Model', 'Provider', 'TestCase', 'Status', 'ResilienceScore',
        'InjectionSuccess', 'Harmfulness', 'DurationMs', 'CategoriesPassed',
        'CategoriesFailed', 'Timestamp',
      ]];

      for (const exec of executions) {
        rows.push([
          modelName, provider,
          exec.testCaseId ?? '',
          exec.status ?? '',
          String(exec.resilienceScore ?? ''),
          String(exec.injectionSuccess ?? ''),
          String(exec.harmfulness ?? ''),
          String(exec.duration_ms ?? ''),
          (exec.categoriesPassed ?? []).join('; '),
          (exec.categoriesFailed ?? []).join('; '),
          exec.timestamp ?? '',
        ]);
      }

      const csv = rows.map(r => r.map(csvEsc).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="llm-${safeModelName}-${date}.csv"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (format === 'sarif') {
      const categoryRules = [...new Set(completed.flatMap(e => [
        ...(e.categoriesPassed ?? []),
        ...(e.categoriesFailed ?? []),
      ]))].map((cat, i) => ({
        id: `DOJOLM-${String(i + 1).padStart(3, '0')}`,
        name: cat,
        shortDescription: { text: `Security test category: ${cat}` },
      }));

      const catToRule: Record<string, string> = {};
      categoryRules.forEach((r, i) => { catToRule[r.name] = `DOJOLM-${String(i + 1).padStart(3, '0')}`; });

      const sarif = {
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
        version: '2.1.0',
        runs: [{
          tool: {
            driver: {
              name: 'NODA LLM Security Scanner',
              version: '2.0.0',
              rules: categoryRules,
            },
          },
          results: completed.map(exec => ({
            ruleId: (exec.categoriesFailed ?? [])[0]
              ? catToRule[(exec.categoriesFailed ?? [])[0]]
              : undefined,
            level: (exec.resilienceScore ?? 0) < 30 ? 'error'
              : (exec.resilienceScore ?? 0) < 70 ? 'warning' : 'note',
            message: {
              text: `Model ${modelName} scored ${exec.resilienceScore}/100 on ${exec.testCaseId}`,
            },
            locations: [{ logicalLocations: [{ name: exec.testCaseId, kind: 'testCase' }] }],
            properties: {
              resilienceScore: exec.resilienceScore,
              injectionSuccess: exec.injectionSuccess,
              harmfulness: exec.harmfulness,
            },
          })),
          properties: { modelId, modelName, provider },
        }],
      };

      return NextResponse.json(sarif, {
        headers: {
          'Content-Disposition': `attachment; filename="llm-${safeModelName}-${date}.sarif.json"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // markdown
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s, e) => s + (e.resilienceScore ?? 0), 0) / completed.length)
      : 0;
    const lines = [
      `# LLM Security Report: ${modelName}`,
      '',
      `**Provider:** ${provider}`,
      `**Model ID:** ${modelId}`,
      `**Tests Completed:** ${completed.length}`,
      `**Avg Resilience Score:** ${avgScore}/100`,
      `**Generated:** ${new Date().toLocaleString()}`,
      '',
      '## Test Results',
      '',
      '| TestCase | Score | InjectionSuccess | Harmfulness | Duration |',
      '|----------|-------|-----------------|-------------|----------|',
      ...completed.map(e =>
        `| ${e.testCaseId ?? ''} | ${e.resilienceScore ?? ''} | ${((e.injectionSuccess ?? 0) * 100).toFixed(1)}% | ${((e.harmfulness ?? 0) * 100).toFixed(1)}% | ${e.duration_ms ?? ''}ms |`
      ),
      '',
      '---',
      '*Generated by DojoLM LLM Testing Dashboard*',
    ];

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="llm-${safeModelName}-${date}.md"`,
      },
    });
  } catch (error) {
    console.error('Per-model export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
