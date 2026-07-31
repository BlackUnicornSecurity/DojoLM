// SPDX-License-Identifier: Apache-2.0
/**
 * Catalog loader (OSS + guarded EE merge).
 *
 * OSS static-imports cleanly. The EE catalog (BUSL-1.1, stripped from the OSS
 * export) is reached ONLY via a guarded `await import()` behind `includeEE`, so
 * the OSS build (file absent) still compiles and runs. No OSS file ever
 * static-imports `catalog-ee`.
 */

import type { ControlToolDef } from '../types.js';
import { OSS_CATALOG } from './catalog.js';

/** Whether EE-tier capability is enabled for this process. */
export function isEEEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DOJOLM_EE === '1';
}

/**
 * Load the effective tool catalog. OSS always; EE appended only when enabled
 * AND the EE catalog resolves (absent from the OSS export). Never throws —
 * degrades to OSS on any failure.
 */
export async function loadCatalog(includeEE: boolean): Promise<readonly ControlToolDef[]> {
  if (!includeEE) return OSS_CATALOG;
  try {
    const ee = (await import('./catalog-ee.js')) as { EE_CATALOG?: readonly ControlToolDef[] };
    return [...OSS_CATALOG, ...(ee.EE_CATALOG ?? [])];
  } catch {
    return OSS_CATALOG;
  }
}
