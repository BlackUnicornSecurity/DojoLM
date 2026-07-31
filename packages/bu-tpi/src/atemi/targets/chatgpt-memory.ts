// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/targets/chatgpt-memory.ts
 * Purpose: Per-vendor UI adapter for the chatgpt.com "Memory" surface
 * (Settings -> Personalization -> Memory).
 *
 * Mirrors `claude-memory.ts` — selectors are centralized here so they
 * can be version-tracked per vendor UI change without touching driver
 * plumbing. Production launch requires a signed ToS attestation
 * (`atemi/tos-attestation.ts`) — adapter dispatch is blocked until the
 * attestation state is `active`.
 *
 * Safety:
 * - NO live vendor API calls — tests inject a `MockAtemiDriver` or a
 *   mock `PageLike`. Production requires a vetted Playwright launcher
 *   constructed at startup (never at runtime).
 * - Selectors are hard-coded (never interpolated from user input).
 */

import type { PageLike, TargetAdapter } from '../playwright-driver.js';
import type { AtemiDriverResult } from '../types.js';

const MEMORY_URL = 'https://chatgpt.com/#settings/Personalization';
const SEED_INPUT_SELECTOR = '[data-testid="memory-manager-new-entry"]';
const SUBMIT_BUTTON_SELECTOR = '[data-testid="memory-manager-save"]';
const CONFIRMATION_SELECTOR = '[data-testid="memory-manager-confirmation"]';
const REFUSAL_SELECTOR = '[data-testid="memory-manager-refusal"]';

export const chatgptMemoryAdapter: TargetAdapter = {
  product: 'chatgpt-memory',
  async run(args): Promise<AtemiDriverResult> {
    if (args.kind !== 'memory-poison') {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `chatgpt-memory adapter does not support kind "${args.kind}"`,
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

  const refusalText = await page
    .textContent(REFUSAL_SELECTOR, { timeout: timeoutMs })
    .catch(() => null);
  if (refusalText && refusalText.trim().length > 0) {
    return { status: 'refused', responseText: refusalText };
  }
  const confirmationText = await page
    .textContent(CONFIRMATION_SELECTOR, { timeout: timeoutMs })
    .catch(() => null);
  if (confirmationText && confirmationText.trim().length > 0) {
    return { status: 'success', responseText: confirmationText };
  }
  return {
    status: 'error',
    responseText: '',
    errorMessage: 'No confirmation or refusal element found on ChatGPT memory panel',
  };
}
