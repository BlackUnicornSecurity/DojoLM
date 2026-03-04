/**
 * File: api/llm/batch/[id]/stream/route.ts
 * Purpose: SSE endpoint for real-time batch progress streaming
 * Index:
 * - GET handler (line 15)
 */

import { NextRequest } from 'next/server';
import { fileStorage } from '@/lib/storage/file-storage';

const SAFE_ID = /^[\w-]{1,128}$/;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/llm/batch/[id]/stream
 *
 * Server-Sent Events endpoint for real-time batch progress.
 * Emits: progress, model_complete, batch_complete, error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: batchId } = await params;

  // Validate batchId format to prevent path traversal
  if (!batchId || !SAFE_ID.test(batchId)) {
    return new Response(JSON.stringify({ error: 'Invalid batch ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate batch exists
  const batch = await fileStorage.getBatch(batchId);
  if (!batch) {
    return new Response(JSON.stringify({ error: 'Batch not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const closeStream = () => {
        if (closed) return;
        closed = true;
        if (pollTimer !== null) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
        try { controller.close(); } catch { /* already closed */ }
      };

      const sendEvent = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          const jsonStr = JSON.stringify(data).replace(/\n/g, '\\n');
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${jsonStr}\n\n`)
          );
        } catch {
          closeStream();
        }
      };

      // Track which models have been reported as complete
      const reportedModels = new Set<string>();
      const pollStart = Date.now();

      const poll = async () => {
        if (closed) return;

        // Enforce maximum poll duration
        if (Date.now() - pollStart > MAX_POLL_DURATION_MS) {
          sendEvent('error', { message: 'Stream timed out waiting for batch completion' });
          closeStream();
          return;
        }

        try {
          const currentBatch = await fileStorage.getBatch(batchId);
          if (!currentBatch) {
            sendEvent('error', { message: 'Batch not found' });
            closeStream();
            return;
          }

          // Send progress update
          const progressPercent = currentBatch.totalTests > 0
            ? Math.round((currentBatch.completedTests / currentBatch.totalTests) * 100)
            : 0;

          // Get per-model progress from executions
          const perModelProgress: Record<string, {
            completed: number;
            total: number;
            percent: number;
            lastScore?: number;
          }> = {};

          for (const modelId of currentBatch.modelConfigIds) {
            const total = currentBatch.testCaseIds.length;
            const { executions } = await fileStorage.queryExecutions({
              modelConfigId: modelId,
              limit: total,
            });

            // Filter to executions from this batch (by timestamp)
            const batchStart = new Date(currentBatch.createdAt).getTime();
            const batchExecs = executions.filter(
              e => new Date(e.timestamp).getTime() >= batchStart
            );

            const completed = batchExecs.length;
            const lastExec = batchExecs[batchExecs.length - 1];

            perModelProgress[modelId] = {
              completed,
              total,
              percent: total > 0 ? Math.round((completed / total) * 100) : 0,
              lastScore: lastExec?.resilienceScore,
            };

            // Check if model just completed
            if (completed >= total && !reportedModels.has(modelId)) {
              reportedModels.add(modelId);
              const avgScore = batchExecs.length > 0
                ? Math.round(
                    batchExecs.reduce((s, e) => s + e.resilienceScore, 0) / batchExecs.length
                  )
                : 0;

              sendEvent('model_complete', {
                modelId,
                completed,
                total,
                avgScore,
              });
            }
          }

          sendEvent('progress', {
            batchId: currentBatch.id,
            status: currentBatch.status,
            completedTests: currentBatch.completedTests,
            totalTests: currentBatch.totalTests,
            failedTests: currentBatch.failedTests,
            progressPercent,
            avgResilienceScore: currentBatch.avgResilienceScore ?? 0,
            perModelProgress,
          });

          // Check if batch is complete
          if (
            currentBatch.status === 'completed' ||
            currentBatch.status === 'failed' ||
            currentBatch.status === 'cancelled'
          ) {
            sendEvent('batch_complete', {
              batchId: currentBatch.id,
              status: currentBatch.status,
              completedTests: currentBatch.completedTests,
              totalTests: currentBatch.totalTests,
              failedTests: currentBatch.failedTests,
              avgResilienceScore: currentBatch.avgResilienceScore ?? 0,
            });
            closeStream();
            return;
          }

          // Continue polling
          pollTimer = setTimeout(poll, 2000);
        } catch (err) {
          if (!closed) {
            sendEvent('error', {
              message: err instanceof Error ? err.message : 'Stream error',
            });
            closeStream();
          }
        }
      };

      // Start polling
      poll();
    },

    cancel() {
      closed = true;
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
