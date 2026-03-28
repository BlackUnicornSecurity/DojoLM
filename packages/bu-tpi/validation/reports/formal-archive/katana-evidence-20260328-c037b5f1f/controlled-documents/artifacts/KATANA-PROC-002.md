# KATANA-PROC-002 — Calibration Protocol

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 6.4, 6.5
- Source of Record: `src/validation/calibration/calibration-protocol.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-002.ts`
- Frozen Source SHA-256: `2dc6e448ff39273e6453f417ca4c5ea8e946ab766f71127f51434a343dcd46fe`

## Description

Pre-validation calibration procedure with Ed25519 signed certificates and git-hash-based validity.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA Calibration Protocol (K4.2)
 *
 * Pre-validation calibration check using reference sets.
 * Calibration validity tied to tool_build_hash (git hash of built artifacts).
 * Any code change invalidates calibration automatically.
 *
 * Process:
 * 1. Load reference set for each module
 * 2. Run all reference samples through the scanner
 * 3. 100% agreement = PASS, any disagreement = FAIL + abort
 * 4. Generate CalibrationCertificate with Ed25519 digital signature
 *
 * ISO 17025 Clause 6.4, 6.5
 */

import { randomUUID } from 'node:crypto';
import {
  SCHEMA_VERSION,
  type CalibrationCertificate,
  CalibrationCertificateSchema,
  type EnvironmentSnapshot,
} from '../types.js';
import type { ReferenceSet } from './reference-sets.js';
import { signReport, verifyReport } from '../integrity/certificate-signer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalibrationResult {
  readonly certificate: CalibrationCertificate;
  readonly details: CalibrationDetail[];
}

export interface CalibrationDetail {
  readonly sample_id: string;
  readonly expected_verdict: 'clean' | 'malicious';
  readonly actual_verdict: 'clean' | 'malicious';
  readonly correct: boolean;
}

export type ScanFunction = (
  content: string,
  moduleId: string,
) => { verdict: 'clean' | 'malicious' };

export interface CalibrationOptions {
  /** Environment snapshot for the certificate */
  readonly environment: EnvironmentSnapshot;
  /** Git hash of the tool build */
  readonly tool_build_hash: string;
  /** Optional Ed25519 private key for signing (if omitted, reads from env) */
  readonly signing_key?: string;
  /** Content loader: sample ID → content string (required — no silent fallback) */
  readonly contentLoader: (sampleId: string, sourceFile: string) => string;
}

// ---------------------------------------------------------------------------
// Calibration Execution
// ---------------------------------------------------------------------------

/**
 * Run calibration for a single module using its reference set.
 *
 * All reference samples are scanned. 100% agreement = PASS.
 * Any disagreement = FAIL.
 *
 * @param refSet - Calibration reference set for the module
 * @param scanFn - Function to scan a sample and return verdict
 * @param options - Calibration options (environment, build hash, signing key)
 * @returns CalibrationResult with signed certificate
 */
export function calibrateModule(
  refSet: ReferenceSet,
  scanFn: ScanFunction,
  options: CalibrationOptions,
): CalibrationResult {
  const allSamples = [...refSet.positive_samples, ...refSet.negative_samples];
  const details: CalibrationDetail[] = [];
  let passed = 0;

  for (const sample of allSamples) {
    const content = options.contentLoader(sample.id, sample.source_file);

    const result = scanFn(content, refSet.module_id);
    const correct = result.verdict === sample.expected_verdict;

    details.push({
      sample_id: sample.id,
      expected_verdict: sample.expected_verdict,
      actual_verdict: result.verdict,
      correct,
    });

    if (correct) passed++;
  }

  const certificateResult = passed === allSamples.length ? 'PASS' : 'FAIL';

  const certificate: CalibrationCertificate = {
    schema_version: SCHEMA_VERSION,
    certificate_id: `cal-${randomUUID()}`,
    module_id: refSet.module_id,
    tool_build_hash: options.tool_build_hash,
    reference_set_version: refSet.version,
    environment: options.environment,
    result: certificateResult,
    samples_tested: allSamples.length,
    samples_passed: passed,
    timestamp: new Date().toISOString(),
  };

  // Validate certificate against schema
  CalibrationCertificateSchema.parse(certificate);

  return { certificate, details };
}

/**
 * Run calibration for all modules and return signed certificates.
 *
 * @param referenceSets - All module reference sets
 * @param scanFn - Scan function
 * @param options - Calibration options
 * @returns Map of module ID to calibration result
 */
export function calibrateAll(
  referenceSets: readonly ReferenceSet[],
  scanFn: ScanFunction,
  options: CalibrationOptions,
): Map<string, CalibrationResult> {
  const results = new Map<string, CalibrationResult>();

  for (const refSet of referenceSets) {
    const result = calibrateModule(refSet, scanFn, options);
    results.set(refSet.module_id, result);

    // Abort on first FAIL — no point continuing calibration
    if (result.certificate.result === 'FAIL') {
      break;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Certificate Signing
// ---------------------------------------------------------------------------

/**
 * Sign a calibration certificate with Ed25519.
 *
 * @param certificate - Certificate to sign
 * @param privateKey - Optional PEM-encoded Ed25519 private key
 * @returns Certificate with signature field set
 */
export function signCertificate(
  certificate: CalibrationCertificate,
  privateKey?: string,
): CalibrationCertificate {
  return signReport(certificate, privateKey);
}

/**
 * Verify a signed calibration certificate.
 *
 * @param certificate - Certificate with signature
 * @param publicKey - Optional PEM-encoded Ed25519 public key
 * @returns true if signature is valid
 */
export function verifyCertificate(
  certificate: CalibrationCertificate,
  publicKey?: string,
): boolean {
  return verifyReport(certificate, publicKey);
}

// ---------------------------------------------------------------------------
// Calibration Validity
// ---------------------------------------------------------------------------

/**
 * Check if a calibration certificate is still valid.
 *
 * Calibration is valid if:
 * 1. Certificate result is PASS
 * 2. tool_build_hash matches current build hash
 *
 * Any code change (new git hash) invalidates calibration.
 *
 * @param certificate - Existing calibration certificate
 * @param currentBuildHash - Current git hash of the tool build
 * @returns Validity status with reason
 */
export function checkCalibrationValidity(
  certificate: CalibrationCertificate,
  currentBuildHash: string,
): CalibrationValidity {
  if (certificate.result !== 'PASS') {
    return {
      valid: false,
      reason: 'calibration_failed',
      message: `Calibration for ${certificate.module_id} did not pass (${certificate.samples_passed}/${certificate.samples_tested} samples correct)`,
    };
  }

  if (certificate.tool_build_hash !== currentBuildHash) {
    return {
      valid: false,
      reason: 'build_hash_mismatch',
      message: `Tool build hash changed: certificate has '${certificate.tool_build_hash}', current is '${currentBuildHash}'`,
    };
  }

  return {
    valid: true,
    reason: 'valid',
    message: `Calibration valid for ${certificate.module_id} at build ${currentBuildHash}`,
  };
}

export interface CalibrationValidity {
  readonly valid: boolean;
  readonly reason: 'valid' | 'calibration_failed' | 'build_hash_mismatch';
  readonly message: string;
}

/**
 * Check calibration validity for all modules.
 *
 * @param certificates - Map of module ID to calibration certificate
 * @param currentBuildHash - Current git hash
 * @returns Map of module ID to validity status
 */
export function checkAllCalibrationValidity(
  certificates: ReadonlyMap<string, CalibrationCertificate>,
  currentBuildHash: string,
): Map<string, CalibrationValidity> {
  const results = new Map<string, CalibrationValidity>();
  for (const [moduleId, cert] of certificates) {
    results.set(moduleId, checkCalibrationValidity(cert, currentBuildHash));
  }
  return results;
}

/**
 * Check if all modules pass calibration validity check.
 *
 * @param validities - Map of module ID to validity
 * @returns true if ALL modules are valid
 */
export function allCalibrationsValid(
  validities: ReadonlyMap<string, CalibrationValidity>,
): boolean {
  if (validities.size === 0) return false;
  for (const v of validities.values()) {
    if (!v.valid) return false;
  }
  return true;
}

```
