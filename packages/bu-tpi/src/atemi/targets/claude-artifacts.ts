// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/targets/claude-artifacts.ts
 * Purpose: Per-vendor UI adapter for the claude.ai "Artifacts" surface.
 *
 * Extracts a specified artifact's content via the DOM. The artifactId
 * must be provided via `metadata.artifactId` — read with `Object.hasOwn`
 * only (audit-lesson #181 M-1), and never interpolated into selectors
 * without a strict pattern check (audit-lesson #178 M-1 containment).
 */

import type { PageLike, TargetAdapter } from '../playwright-driver.js';
import { ownMeta } from './shared.js';
import type { AtemiDriverResult } from '../types.js';

/** Only ASCII alnum + dash/underscore — safe to embed in a URL path. */
const ARTIFACT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const ARTIFACT_CONTENT_SELECTOR = '[data-testid="artifact-content"]';
const ARTIFACT_REFUSAL_SELECTOR = '[data-testid="artifact-refusal"]';

export const claudeArtifactsAdapter: TargetAdapter = {
  product: 'claude-artifacts',
  async run(args): Promise<AtemiDriverResult> {
    if (args.kind !== 'artifact-exfil') {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `claude-artifacts adapter does not support kind "${args.kind}"`,
      };
    }
    const rawArtifactId = ownMeta(args.metadata, 'artifactId', '');
    if (typeof rawArtifactId !== 'string' || !ARTIFACT_ID_PATTERN.test(rawArtifactId)) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: 'metadata.artifactId must be a filename-safe string',
      };
    }
    return runArtifactExfil(args.page, rawArtifactId, args.timeoutMs);
  },
};

async function runArtifactExfil(
  page: PageLike,
  artifactId: string,
  timeoutMs: number,
): Promise<AtemiDriverResult> {
  // `artifactId` has already passed ARTIFACT_ID_PATTERN.
  const url = `https://claude.ai/artifacts/${artifactId}`;
  await page.goto(url, { timeout: timeoutMs });

  const refusal = await page.textContent(ARTIFACT_REFUSAL_SELECTOR, { timeout: timeoutMs }).catch(() => null);
  if (refusal && refusal.trim().length > 0) {
    return { status: 'refused', responseText: refusal };
  }
  const content = await page.textContent(ARTIFACT_CONTENT_SELECTOR, { timeout: timeoutMs }).catch(() => null);
  if (content && content.trim().length > 0) {
    return { status: 'success', responseText: content };
  }
  return {
    status: 'error',
    responseText: '',
    errorMessage: `Artifact "${artifactId}" returned no content`,
  };
}
