// SPDX-License-Identifier: Apache-2.0
/**
 * OSS resource set — bundled, self-contained reference content served under the
 * `dojolm://` scheme by `resources/list` + `resources/read`.
 *
 * SAFETY (the reason this is constants, not a filesystem read): the control MCP
 * must NEVER serve the harmful-payload fixtures corpus, and the standalone
 * package does not bundle `packages/bu-tpi/fixtures` anyway. So every resource
 * here is an in-module constant — there is no disk read on the `dojolm://`
 * namespace, hence no path to the corpus and no traversal surface.
 *
 * Content is two kinds (operator decision: option a + b):
 *  - `dojolm://docs/*`     curated OSS-safe reference docs.
 *  - `dojolm://fixtures/index`  a payload-free taxonomy index: category NAMES
 *    and COUNTS only (sourced from the corpus manifest metadata, v4.0.0), never
 *    any payload, filename, attack description, or internal product codename.
 */

import type { ControlResource } from '../types.js';

const OVERVIEW_DOC = `# DojoLM Control MCP — Overview

The DojoLM control-plane MCP server exposes the platform's governance and
red-team operations to MCP clients over JSON-RPC 2.0. It is dependency-free
(no MCP SDK) so it stays install-light.

## Surfaces
- **tools** — control operations (scanning, campaigns, reporting). See \`tools/list\`.
- **prompts** — reusable red-team skill playbooks. See \`prompts/list\`.
- **resources** — this bundled, read-only reference set under \`dojolm://\`.

## Authentication model (confused-deputy-safe)
- The server forwards the CALLER's \`x-api-key\` to the platform; it never holds
  an ambient platform credential on the HTTP transport.
- The platform's RBAC is the authoritative gate. This server adds a
  friendlier-than-403 pre-filter: an anonymous caller (no key) can reach only
  public viewer/read surfaces.

## Safety envelope
- Mutating tools require a two-phase confirmation token before they execute.
- Every returned payload is run through a sanitizer: secret-field redaction,
  HTML stripping, and a size cap.
- Resources are bundled constants — no \`dojolm://\` content is read from disk,
  so attack-payload fixtures are never reachable through this surface.
`;

const TIERS_DOC = `# DojoLM Control MCP — OSS and EE tiers

Capabilities are split into two tiers.

## OSS (Apache-2.0)
Shipped in the community package. Includes the OSS tool catalog, OSS prompt
playbooks, and this reference resource set. This is the only tier present in the
standalone package.

## EE (Enterprise)
Enterprise-only tools, prompts, and resources. They are merged in ONLY when the
process enables the Enterprise tier (\`DOJOLM_EE=1\` / \`includeEE\`) AND the
Enterprise modules are present in the build. The community package does not
bundle them, so an OSS deployment degrades cleanly to the OSS tier.

EE resources, when present, require an authenticated caller; OSS resources are
public-read.
`;

/**
 * Per-category fixture counts — METADATA ONLY (no payloads, no filenames, no
 * attack descriptions). Snapshot of the corpus manifest v4.0.0; the names are
 * the standard adversarial-LLM taxonomy categories. Keep this in sync with the
 * manifest if the corpus is re-versioned.
 */
const FIXTURE_CATEGORY_COUNTS: Readonly<Record<string, number>> = {
  agent: 152,
  'agent-output': 63,
  audio: 178,
  'audio-attacks': 89,
  bias: 154,
  boundary: 83,
  code: 112,
  cognitive: 111,
  context: 75,
  'delivery-vectors': 114,
  'document-attacks': 98,
  dos: 158,
  encoded: 244,
  environmental: 102,
  'few-shot': 118,
  images: 96,
  malformed: 110,
  mcp: 90,
  'model-theft': 139,
  modern: 111,
  multimodal: 176,
  or: 132,
  output: 156,
  'prompt-injection': 110,
  'search-results': 79,
  session: 140,
  social: 97,
  'supply-chain': 123,
  'token-attacks': 109,
  'tool-manipulation': 70,
  translation: 117,
  'untrusted-sources': 73,
  vec: 103,
  web: 109,
  webmcp: 107,
};

// Totals are DERIVED from the map so the index can never drift from its own data.
const FIXTURE_TOTAL = Object.values(FIXTURE_CATEGORY_COUNTS).reduce((a, b) => a + b, 0);

const FIXTURES_INDEX = {
  schema: 'dojolm.fixtures.index/v1',
  manifestVersion: '4.0.0',
  totalFixtures: FIXTURE_TOTAL,
  categoryCount: Object.keys(FIXTURE_CATEGORY_COUNTS).length,
  categories: FIXTURE_CATEGORY_COUNTS,
  notice:
    'Index/metadata only. No attack payloads are served through OSS MCP ' +
    'resources, and the fixtures corpus is not bundled with this package. ' +
    'Category names and counts describe the red-team taxonomy; payload access ' +
    'is gated behind the authenticated platform.',
};

/** The canonical OSS resource set. All entries are `tier: 'oss'` (public-read). */
export const OSS_RESOURCES: readonly ControlResource[] = [
  {
    uri: 'dojolm://docs/overview',
    name: 'overview',
    title: 'Control MCP — Overview',
    description: 'What the control MCP exposes, its auth model, and its safety envelope.',
    mimeType: 'text/markdown',
    tier: 'oss',
    text: OVERVIEW_DOC,
  },
  {
    uri: 'dojolm://docs/tiers',
    name: 'tiers',
    title: 'Control MCP — OSS and EE tiers',
    description: 'How the OSS and Enterprise tiers differ and how EE capabilities are gated.',
    mimeType: 'text/markdown',
    tier: 'oss',
    text: TIERS_DOC,
  },
  {
    uri: 'dojolm://fixtures/index',
    name: 'fixtures-index',
    title: 'Red-team fixtures — taxonomy index',
    description:
      'Payload-free index of the red-team fixtures corpus: category names and counts only (manifest v4.0.0). No payloads are served.',
    mimeType: 'application/json',
    tier: 'oss',
    text: JSON.stringify(FIXTURES_INDEX, null, 2),
  },
];
