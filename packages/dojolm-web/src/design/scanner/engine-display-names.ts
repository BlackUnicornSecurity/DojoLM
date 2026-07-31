// SPDX-License-Identifier: Apache-2.0

import type { ScannerEngineId } from "@/lib/scanner/engines";

/**
 * Presentation-only labels for engine names that collide with full modules.
 * Registry ids and canonical metadata remain unchanged.
 */
export const ENGINE_DISPLAY_NAME_BY_ID: Readonly<
  Partial<Record<ScannerEngineId, string>>
> = Object.freeze({
  mitsuke: "Mitsuke feed",
  kagami: "Kagami match",
  // The registry name is abbreviated ("Jailbrk"); the filter chip renders
  // the full word (Command Center v2.html:233 — "JAILBREAK"). Presentation
  // only; the canonical engine id/name are untouched.
  jailbreak: "Jailbreak",
});

export function engineDisplayName(
  id: ScannerEngineId,
  fallback: string,
): string {
  return ENGINE_DISPLAY_NAME_BY_ID[id] ?? fallback;
}
