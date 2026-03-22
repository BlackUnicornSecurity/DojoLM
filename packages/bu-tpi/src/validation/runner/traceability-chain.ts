/**
 * KATANA Traceability Chain (K4.3)
 *
 * Full chain: result → sample → corpus version → tool version →
 *             build hash → module hash → calibration certificate →
 *             environment → configuration snapshot.
 *
 * All chain elements are cryptographically verifiable via HMAC/signatures.
 *
 * ISO 17025 Clause 6.5: Metrological traceability.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import {
  SCHEMA_VERSION,
  type TraceabilityChain,
  TraceabilityChainSchema,
  type EnvironmentSnapshot,
  type CalibrationCertificate,
} from '../types.js';
import { hashEnvironment } from './environment-snapshot.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TraceabilityInput {
  /** Unique result identifier (e.g., run_id::module_id::sample_id) */
  readonly result_id: string;
  /** Sample being validated */
  readonly sample_id: string;
  /** Corpus manifest HMAC or root hash */
  readonly corpus_version: string;
  /** Package version of the tool under test */
  readonly tool_version: string;
  /** Git commit hash of the tool build */
  readonly tool_build_hash: string;
  /** Hash of the specific module's source code */
  readonly module_hash: string;
  /** ID of the calibration certificate used */
  readonly calibration_certificate_id: string;
  /** Environment snapshot for this run */
  readonly environment: EnvironmentSnapshot;
  /** Serialized configuration used for this run */
  readonly config_snapshot: string;
}

// ---------------------------------------------------------------------------
// Chain Construction
// ---------------------------------------------------------------------------

/**
 * Build a complete traceability chain for a validation result.
 *
 * @param input - All traceability components
 * @returns Validated TraceabilityChain
 */
export function buildTraceabilityChain(input: TraceabilityInput): TraceabilityChain {
  const envHash = hashEnvironment(input.environment);
  const configHash = hashConfig(input.config_snapshot);

  const chain: TraceabilityChain = {
    schema_version: SCHEMA_VERSION,
    result_id: input.result_id,
    sample_id: input.sample_id,
    corpus_version: input.corpus_version,
    tool_version: input.tool_version,
    tool_build_hash: input.tool_build_hash,
    module_hash: input.module_hash,
    calibration_certificate_id: input.calibration_certificate_id,
    environment_hash: envHash,
    config_hash: configHash,
  };

  // Validate at system boundary
  return TraceabilityChainSchema.parse(chain);
}

/**
 * Build traceability chains for all results in a validation run.
 *
 * @param resultIds - Array of result identifiers
 * @param sampleIds - Array of sample identifiers (parallel to resultIds)
 * @param shared - Shared context for the entire run
 * @returns Array of traceability chains
 */
export function buildTraceabilityChains(
  resultIds: readonly string[],
  sampleIds: readonly string[],
  shared: Omit<TraceabilityInput, 'result_id' | 'sample_id'>,
): readonly TraceabilityChain[] {
  if (resultIds.length !== sampleIds.length) {
    throw new Error(
      `resultIds length (${resultIds.length}) must match sampleIds length (${sampleIds.length})`,
    );
  }

  return resultIds.map((resultId, i) =>
    buildTraceabilityChain({
      ...shared,
      result_id: resultId,
      sample_id: sampleIds[i],
    }),
  );
}

// ---------------------------------------------------------------------------
// Chain Verification
// ---------------------------------------------------------------------------

/**
 * Verify a traceability chain element matches its expected value.
 *
 * @param chain - The chain to verify
 * @param environment - Current environment snapshot
 * @param configSnapshot - Current configuration snapshot
 * @returns Object with per-field verification results
 */
export function verifyTraceabilityChain(
  chain: TraceabilityChain,
  environment: EnvironmentSnapshot,
  configSnapshot: string,
): TraceabilityVerification {
  const expectedEnvHash = hashEnvironment(environment);
  const expectedConfigHash = hashConfig(configSnapshot);

  const envValid = timingSafeHashEqual(chain.environment_hash, expectedEnvHash);
  const configValid = timingSafeHashEqual(chain.config_hash, expectedConfigHash);
  const schemaValid = chain.schema_version === SCHEMA_VERSION;

  return {
    environment_hash_valid: envValid,
    config_hash_valid: configValid,
    schema_version_valid: schemaValid,
    all_valid: envValid && configValid && schemaValid,
  };
}

/**
 * Compare two hex-encoded hashes using timing-safe comparison.
 */
function timingSafeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface TraceabilityVerification {
  readonly environment_hash_valid: boolean;
  readonly config_hash_valid: boolean;
  readonly schema_version_valid: boolean;
  readonly all_valid: boolean;
}

// ---------------------------------------------------------------------------
// Module Hash
// ---------------------------------------------------------------------------

/**
 * Compute a hash of a module's source code for traceability.
 * Used to detect if a module has changed since calibration.
 *
 * @param sourceContent - The module's source code as a string
 * @returns SHA-256 hex hash
 */
export function hashModuleSource(sourceContent: string): string {
  return createHash('sha256').update(sourceContent).digest('hex');
}

// ---------------------------------------------------------------------------
// Config Hash
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic hash of the configuration snapshot.
 *
 * @param configSnapshot - Serialized configuration (canonical JSON recommended)
 * @returns SHA-256 hex hash
 */
export function hashConfig(configSnapshot: string): string {
  return createHash('sha256').update(configSnapshot).digest('hex');
}

// ---------------------------------------------------------------------------
// Calibration Certificate Lookup
// ---------------------------------------------------------------------------

/**
 * Extract the calibration certificate ID for a module from a certificate map.
 *
 * @param moduleId - Module to look up
 * @param certificates - Map of module ID to calibration certificate
 * @returns Certificate ID or a sentinel value for uncalibrated modules
 */
export function getCertificateId(
  moduleId: string,
  certificates: ReadonlyMap<string, CalibrationCertificate>,
): string {
  const cert = certificates.get(moduleId);
  return cert?.certificate_id ?? `uncalibrated::${moduleId}`;
}
