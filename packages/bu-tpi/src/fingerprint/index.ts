// Kagami Fingerprinting Barrel Export (K1 + K3)

export * from './types.js';
export * from './features.js';

// K3 — Engine components
export { ProbeRunner } from './probe-runner.js';
export { extractFeatureVector } from './response-analyzer.js';
export {
  weightedCosineDistance,
  matchSignatures,
  verifySignature,
  loadSignatures,
  setSignatureCache,
} from './signature-matcher.js';
export { KagamiEngine, serializeResult } from './engine.js';

// Probes
export {
  ALL_PROBES,
  PROBE_PRESETS,
  getProbesForPreset,
  getProbesForCategories,
} from './probes/index.js';

// Lazy-loaded signatures — does not throw at import time
import type { BehavioralSignature } from './types.js';

interface SignaturesFile {
  readonly version: string;
  readonly generated: string;
  readonly signatures: readonly BehavioralSignature[];
}

let _cachedSignatures: readonly BehavioralSignature[] | null = null;

export function validateSignatures(
  signatures: readonly BehavioralSignature[],
): { readonly valid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const sig of signatures) {
    if (ids.has(sig.modelId)) {
      errors.push(`Duplicate modelId: ${sig.modelId}`);
    }
    ids.add(sig.modelId);
    if (!sig.modelFamily) {
      errors.push(`Missing modelFamily for ${sig.modelId}`);
    }
    if (!sig.provider) {
      errors.push(`Missing provider for ${sig.modelId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function loadKagamiSignatures(): readonly BehavioralSignature[] {
  if (_cachedSignatures !== null) return _cachedSignatures;

  try {
    const { createRequire } = require('node:module');
    const req = createRequire(import.meta.url);
    const data = req('./kagami-signatures.json') as SignaturesFile;
    const validation = validateSignatures(data.signatures);
    if (!validation.valid) {
      throw new Error(`Invalid signatures: ${validation.errors.join('; ')}`);
    }
    _cachedSignatures = data.signatures;
    return _cachedSignatures;
  } catch {
    _cachedSignatures = [];
    return _cachedSignatures;
  }
}
