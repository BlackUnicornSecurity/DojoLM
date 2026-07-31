// SPDX-License-Identifier: Apache-2.0
/**
 * /api/sensei/plan failure mapping.
 *
 * Extracted from route.ts so the mapping is unit-testable without HTTP
 * mocks: a held red line (model refusal, surfaced by bu-tpi as a typed
 * `refusal` payload) is NOT an upstream failure — it maps to 422 with the
 * refusal payload forwarded, so callers score a correct refusal as a
 * refusal. Genuine upstream/parse failures keep 502.
 */

export interface PlanFailureResult {
  readonly success: false;
  readonly error?: string;
  readonly refusal?: {
    readonly class: string;
    readonly confidence: number;
    readonly reason: string;
  };
  readonly meta: unknown;
}

export function planFailureHttp(result: PlanFailureResult): {
  status: number;
  body: Record<string, unknown>;
} {
  if (result.refusal) {
    return {
      status: 422,
      body: { success: false, error: result.error, refusal: result.refusal, meta: result.meta },
    };
  }
  return {
    status: 502,
    body: { success: false, error: result.error, meta: result.meta },
  };
}
