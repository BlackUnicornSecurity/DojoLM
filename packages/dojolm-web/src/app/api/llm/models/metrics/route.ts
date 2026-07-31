// SPDX-License-Identifier: Apache-2.0
/**
 * Active Model Switcher — Story C.
 *
 * GET /api/llm/models/metrics
 *
 * Returns `{ metrics: ModelMetric[] }` for every enabled model. Auth:
 * any logged-in user (read-only). The dropdown opens on click and the
 * client SWR-revalidates every 5 minutes; this endpoint is the data
 * source for the latency / resilience / health badges.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { getStorage } from '@/lib/storage/storage-interface';
import { getProviderAdapter } from '@/lib/llm-providers';
import {
  getModelMetrics,
  type GetModelMetricsDeps,
} from '@/lib/llm/model-metrics';
import { apiError } from '@/lib/api-error';

export const GET = withAuth(async (request: NextRequest) => {
  // Active Model Switcher hardening (2026-05-08): rate-limit the metrics
  // endpoint. Each call may probe N upstream LLM providers via
  // adapter.checkStatus(); without this gate one auth'd user could burn
  // provider quota by spamming the dropdown.
  const limit = await checkRateLimit(request, 'read');
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(limit.resetMs / 1000)),
        },
      },
    );
  }

  try {
    const storage = await getStorage();
    const all = await storage.getModelConfigs();
    const enabled = all.filter((m) => m.enabled === true);

    const deps: GetModelMetricsDeps = {
      getRecentExecutions: async (id, limit) =>
        storage.getRecentExecutions(id, limit),
      getModelStats: async (id) => {
        const stats = await storage.getModelStats(id);
        return {
          totalExecutions: stats.totalExecutions,
          avgResilienceScore: stats.avgResilienceScore,
          lastExecutionAt: stats.lastExecutionAt,
        };
      },
      checkAdapterStatus: async (config) => {
        const adapter = await getProviderAdapter(config.provider);
        if (!adapter || typeof adapter.checkStatus !== 'function') {
          return undefined;
        }
        return adapter.checkStatus(config);
      },
    };

    const metrics = await getModelMetrics(enabled, deps);
    return NextResponse.json({ metrics });
  } catch (error) {
    return apiError('Failed to read model metrics', 500, error);
  }
});
