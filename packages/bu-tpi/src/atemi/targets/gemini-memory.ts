// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/targets/gemini-memory.ts
 * Purpose: Per-vendor UI adapter for the gemini.google.com "Saved info"
 * (memory) surface. Mirrors `claude-memory.ts` + `chatgpt-memory.ts`.
 *
 * Selectors are centralised so vendor UI churn stays localised.
 *
 * Safety:
 * - NO live vendor API calls — tests inject a mock `PageLike`. Production
 *   requires a vetted Playwright launcher constructed at startup and a
 *   signed `tos-attestation` in `active` state.
 */

import type { PageLike, TargetAdapter } from '../playwright-driver.js';
import type { AtemiDriverResult } from '../types.js';

const SAVED_INFO_URL = 'https://gemini.google.com/app#settings/saved-info';
const SEED_INPUT_SELECTOR = '[data-testid="saved-info-new-entry"]';
const SUBMIT_BUTTON_SELECTOR = '[data-testid="saved-info-save"]';
const CONFIRMATION_SELECTOR = '[data-testid="saved-info-confirmation"]';
const REFUSAL_SELECTOR = '[data-testid="saved-info-refusal"]';

export const geminiMemoryAdapter: TargetAdapter = {
  product: 'gemini-memory',
  async run(args): Promise<AtemiDriverResult> {
    if (args.kind !== 'memory-poison') {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `gemini-memory adapter does not support kind "${args.kind}"`,
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
  await page.goto(SAVED_INFO_URL, { timeout: timeoutMs });
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
    errorMessage: 'No confirmation or refusal element found on Gemini saved-info panel',
  };
}
