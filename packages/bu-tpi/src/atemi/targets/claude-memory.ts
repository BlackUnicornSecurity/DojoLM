// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/targets/claude-memory.ts
 * Purpose: Per-vendor UI adapter for the claude.ai "Memory" surface.
 *
 * Runs against an authenticated `PageLike` handle provided by the
 * launcher. Selectors are centralised here so they can be version-
 * tracked without touching the driver / runner plumbing.
 *
 * v1 behavior: navigates to the memory panel, fills the seed payload,
 * submits, and scrapes the confirmation/refusal text. Selectors will
 * need re-tuning per vendor UI changes — a follow-up PR will pull
 * these into a versioned selector registry.
 */

import type { PageLike, TargetAdapter } from '../playwright-driver.js';
import type { AtemiDriverResult } from '../types.js';

const MEMORY_URL = 'https://claude.ai/settings/memory';
const SEED_INPUT_SELECTOR = '[data-testid="memory-new-entry-input"]';
const SUBMIT_BUTTON_SELECTOR = '[data-testid="memory-new-entry-submit"]';
const CONFIRMATION_SELECTOR = '[data-testid="memory-entry-confirmation"]';
const REFUSAL_SELECTOR = '[data-testid="memory-refusal"]';

export const claudeMemoryAdapter: TargetAdapter = {
  product: 'claude-memory',
  async run(args): Promise<AtemiDriverResult> {
    if (args.kind !== 'memory-poison') {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `claude-memory adapter does not support kind "${args.kind}"`,
      };
    }
    return runMemoryPoison(args.page, args.seedPayload, args.timeoutMs);
  },
};

async function runMemoryPoison(
  page: PageLike,
  seed: string,
  timeoutMs: number,
): Promise<AtemiDriverResult> {
  await page.goto(MEMORY_URL, { timeout: timeoutMs });
  await page.fill(SEED_INPUT_SELECTOR, seed, { timeout: timeoutMs });
  await page.click(SUBMIT_BUTTON_SELECTOR, { timeout: timeoutMs });

  // Race: whichever confirmation OR refusal shows first wins.
  const refusalText = await page.textContent(REFUSAL_SELECTOR, { timeout: timeoutMs }).catch(() => null);
  if (refusalText && refusalText.trim().length > 0) {
    return { status: 'refused', responseText: refusalText };
  }
  const confirmationText = await page.textContent(CONFIRMATION_SELECTOR, { timeout: timeoutMs }).catch(() => null);
  if (confirmationText && confirmationText.trim().length > 0) {
    return { status: 'success', responseText: confirmationText };
  }
  return {
    status: 'error',
    responseText: '',
    errorMessage: 'No confirmation or refusal element found on memory panel',
  };
}
