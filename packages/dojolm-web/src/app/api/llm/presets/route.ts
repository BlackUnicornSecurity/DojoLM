/**
 * Presets Endpoint (P8-S84)
 * GET /api/llm/presets — List built-in provider presets
 *
 * PUBLIC ENDPOINT: Intentionally unauthenticated. Returns only non-sensitive
 * preset metadata and setup hints. No API keys, secrets, or env-var names.
 */
import { NextResponse } from 'next/server';
import { getAllPresets } from 'bu-tpi/llm';

export async function GET() {
  const presets = getAllPresets().map((preset) => ({
    id: preset.id,
    name: preset.name,
    tier: preset.tier,
    region: preset.region ?? 'Global',
    isOpenAICompatible: preset.isOpenAICompatible,
    authType: preset.authType,
    baseUrl: preset.baseUrl,
    defaultModels: [...preset.defaultModels],
  }));

  return NextResponse.json(presets);
}
