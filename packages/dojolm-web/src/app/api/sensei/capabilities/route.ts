// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/sensei/capabilities — read-only view of the Sensei tool surface
 * for the drawer's capability panel.
 *
 * Sensei Rework (Pillar B, step 9). The capability panel is a client
 * component, but the authoritative tool set is server-side and role + OSS/EE
 * tier filtered — an OSS edition must never even *describe* an EE tool. This
 * thin read endpoint mirrors the chat route's derivation EXACTLY (same
 * `includeEE` union, same `SenseiToolSource.listTools`, same
 * `resolveToolCallingMode`) so the panel surfaces precisely what the model
 * will be handed, instead of reading the raw 34-tool registry directly.
 *
 * Response: `{ mode, tools[] }`.
 *   - `mode` — the resolved native/XML transport for the pinned brain, or
 *     `null` when no brain resolves (the panel hides the badge rather than
 *     inventing a value).
 *   - `tools[]` — each tool's name + a coarse `kind` for grouping ONLY. No
 *     endpoints, schemas, or descriptions cross the wire; the panel needs
 *     none of that and shipping less keeps the read tight.
 *
 * Auth: admin role required (mirrors the chat route, which is admin-only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { apiError } from '@/lib/api-error';
import { isEnterpriseEdition } from '@/lib/edition';
import { getProviderAdapter } from '@/lib/llm-providers';
import { buildSenseiContext } from '@/lib/sensei/context-builder';
import { getSenseiToolSource } from '@/lib/sensei/tool-source';
import {
  resolveToolCallingMode,
  type ToolCallingMode,
} from '@/lib/sensei/tool-calling-capability';
import { resolveSenseiModelId } from '@/lib/sensei/resolve-sensei-model';
import type { SenseiToolDefinition } from '@/lib/sensei/types';
import type { NavId } from '@/lib/constants';

/** Coarse capability bucket the panel renders as a tone-coded group. */
type CapabilityKind = 'query' | 'write' | 'confirm' | 'navigate';

interface CapabilityToolView {
  readonly name: string;
  readonly kind: CapabilityKind;
}

interface SenseiCapabilitiesResponse {
  /** Resolved tool-calling transport for the pinned brain; null when none. */
  readonly mode: ToolCallingMode | null;
  readonly tools: readonly CapabilityToolView[];
}

/**
 * Bucket a tool the same way the panel's legacy `buildGroups` did — the
 * order matters: client-nav sentinel first, then mutating, then confirm-
 * gated, else a plain read. `get_skill`'s `__skill__` sentinel is neither
 * `__client__` nor mutating/confirming, so it lands in `query` (a read).
 */
function classifyTool(tool: SenseiToolDefinition): CapabilityKind {
  if (tool.endpoint === '__client__') return 'navigate';
  if (tool.mutating) return 'write';
  if (tool.requiresConfirmation) return 'confirm';
  return 'query';
}

// The active module does not affect `listTools` (it returns the full
// role/tier-permitted set, not a per-module narrowing), so a fixed module
// is fine for the capability summary.
const CAPABILITY_MODULE: NavId = 'dashboard';

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      // EE availability — identical union to the chat route so the panel
      // never describes a tool the model wouldn't actually receive.
      const includeEE = isEnterpriseEdition() || process.env.DOJOLM_EE === '1';

      const senseiContext = await buildSenseiContext(CAPABILITY_MODULE, request);
      const toolSource = getSenseiToolSource();
      const tools = await toolSource.listTools({
        userRole: senseiContext.userRole,
        activeModule: CAPABILITY_MODULE,
        includeEE,
      });
      const view: CapabilityToolView[] = tools.map((t) => ({
        name: t.name,
        kind: classifyTool(t),
      }));

      // Best-effort tool-calling mode for the pinned brain. A missing brain
      // (none pinned/enabled), a deleted config, or an adapter without
      // native support all leave `mode` null — the panel hides the badge
      // rather than asserting a transport that isn't real.
      let mode: ToolCallingMode | null = null;
      try {
        const resolvedId = await resolveSenseiModelId({});
        const { getStorage } = await import('@/lib/storage/storage-interface');
        const storage = await getStorage();
        const config = await storage.getModelConfig(resolvedId);
        if (config) {
          const adapter = await getProviderAdapter(config.provider);
          mode = resolveToolCallingMode({
            supportsNativeTools: adapter.supportsNativeTools,
            model: config.model,
            // Honor the per-config operator override so the capability panel
            // reports the SAME transport chat will execute (chat/route.ts) —
            // otherwise a pinned 'xml'/'native' override would silently disagree.
            override: config.toolCallingMode,
          });
        }
      } catch {
        mode = null;
      }

      const body: SenseiCapabilitiesResponse = { mode, tools: view };
      return NextResponse.json(body);
    } catch (error) {
      return apiError('Failed to list capabilities', 500, error);
    }
  },
  { role: 'admin' },
);
