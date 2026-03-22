/**
 * KATANA Framework Threat Model (K10.1)
 *
 * Documents adversaries, assets, attacks, controls, and residual risks
 * for the validation framework itself.
 *
 * ISO 17025 Clause: 4.1 (Impartiality)
 */

import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThreatActor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly motivation: string;
  readonly capability: 'low' | 'medium' | 'high';
}

export interface Asset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly confidentiality: 'low' | 'medium' | 'high';
  readonly integrity: 'low' | 'medium' | 'high';
  readonly availability: 'low' | 'medium' | 'high';
}

export interface Threat {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly actor_ids: readonly string[];
  readonly asset_ids: readonly string[];
  readonly attack_vector: string;
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly likelihood: 'low' | 'medium' | 'high';
}

export interface Control {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: 'preventive' | 'detective' | 'corrective';
  readonly threat_ids: readonly string[];
  readonly implementation: string;
  readonly effectiveness: 'partial' | 'full';
}

export interface ResidualRisk {
  readonly threat_id: string;
  readonly control_ids: readonly string[];
  readonly residual_impact: 'low' | 'medium' | 'high';
  readonly residual_likelihood: 'low' | 'medium' | 'high';
  readonly acceptance_rationale: string;
}

export interface ThreatModel {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly generated_at: string;
  readonly document_id: string;
  readonly title: string;
  readonly scope: string;
  readonly actors: readonly ThreatActor[];
  readonly assets: readonly Asset[];
  readonly threats: readonly Threat[];
  readonly controls: readonly Control[];
  readonly residual_risks: readonly ResidualRisk[];
}

// ---------------------------------------------------------------------------
// Threat Actors
// ---------------------------------------------------------------------------

export const THREAT_ACTORS: readonly ThreatActor[] = [
  {
    id: 'TA-01',
    name: 'Accidental Developer',
    description: 'Internal developer who inadvertently introduces errors into ground truth, generators, or validation code.',
    motivation: 'Unintentional — coding errors, misconfigured environments, incorrect labels.',
    capability: 'medium',
  },
  {
    id: 'TA-02',
    name: 'Malicious Insider',
    description: 'Authorized contributor who deliberately manipulates validation results to pass a defective tool.',
    motivation: 'Financial gain, competitive pressure, or sabotage.',
    capability: 'high',
  },
  {
    id: 'TA-03',
    name: 'External Attacker (Supply Chain)',
    description: 'External actor who compromises a dependency to alter validation logic or inject false results.',
    motivation: 'Undermine trust in DojoLM detection capabilities.',
    capability: 'high',
  },
] as const;

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const ASSETS: readonly Asset[] = [
  {
    id: 'A-01',
    name: 'Ground Truth Corpus',
    description: 'Expert-verified reference samples with ground-truth labels. Foundational to all validation accuracy.',
    confidentiality: 'medium',
    integrity: 'high',
    availability: 'medium',
  },
  {
    id: 'A-02',
    name: 'Holdout Set',
    description: '20% blind corpus reserved for formal validation. Never used during development.',
    confidentiality: 'high',
    integrity: 'high',
    availability: 'low',
  },
  {
    id: 'A-03',
    name: 'Calibration Reference Sets',
    description: 'Immutable 10+10 per module calibration samples with HMAC-signed manifests.',
    confidentiality: 'medium',
    integrity: 'high',
    availability: 'medium',
  },
  {
    id: 'A-04',
    name: 'Validation Reports & Certificates',
    description: 'Ed25519 signed validation reports and calibration certificates providing compliance evidence.',
    confidentiality: 'low',
    integrity: 'high',
    availability: 'medium',
  },
  {
    id: 'A-05',
    name: 'Cryptographic Keys',
    description: 'HMAC key (manifest signing), Ed25519 private key (report/certificate signing).',
    confidentiality: 'high',
    integrity: 'high',
    availability: 'high',
  },
  {
    id: 'A-06',
    name: 'Validation Framework Code',
    description: 'Source code of the validation runner, generators, metrics calculator, and decision rules.',
    confidentiality: 'low',
    integrity: 'high',
    availability: 'medium',
  },
  {
    id: 'A-07',
    name: 'Generated Variation Corpus',
    description: '200K+ deterministic variation samples with Merkle tree integrity.',
    confidentiality: 'low',
    integrity: 'high',
    availability: 'medium',
  },
] as const;

// ---------------------------------------------------------------------------
// Threats
// ---------------------------------------------------------------------------

export const THREATS: readonly Threat[] = [
  {
    id: 'T-01',
    name: 'Ground Truth Poisoning',
    description: 'Incorrect labels in ground truth corpus cause validation to accept false results as correct.',
    actor_ids: ['TA-01', 'TA-02'],
    asset_ids: ['A-01'],
    attack_vector: 'Direct commit modifying ground-truth manifest or sample files.',
    impact: 'critical',
    likelihood: 'medium',
  },
  {
    id: 'T-02',
    name: 'Holdout Set Leakage',
    description: 'Holdout samples used during development or threshold tuning, invalidating blind validation.',
    actor_ids: ['TA-01'],
    asset_ids: ['A-02'],
    attack_vector: 'Code references holdout samples during development iterations.',
    impact: 'high',
    likelihood: 'medium',
  },
  {
    id: 'T-03',
    name: 'Calibration Certificate Forgery',
    description: 'Forged calibration certificate allows validation to proceed without proper calibration.',
    actor_ids: ['TA-02'],
    asset_ids: ['A-03', 'A-04'],
    attack_vector: 'Create certificate without valid Ed25519 signature or with stolen signing key.',
    impact: 'critical',
    likelihood: 'low',
  },
  {
    id: 'T-04',
    name: 'RNG Seed Prediction',
    description: 'Predictable seed allows targeted evasion of specific generated test samples.',
    actor_ids: ['TA-02'],
    asset_ids: ['A-07'],
    attack_vector: 'Seed value committed in code or documentation; adversary crafts evasion for those specific variations.',
    impact: 'medium',
    likelihood: 'low',
  },
  {
    id: 'T-05',
    name: 'Corpus Tampering',
    description: 'Modification of generated corpus samples or their hashes without detection.',
    actor_ids: ['TA-02'],
    asset_ids: ['A-07'],
    attack_vector: 'Modify sample file and recalculate its hash in manifest without HMAC re-signing.',
    impact: 'critical',
    likelihood: 'low',
  },
  {
    id: 'T-06',
    name: 'Dependency Supply Chain Attack',
    description: 'Compromised npm dependency alters validation logic, metrics calculation, or report generation.',
    actor_ids: ['TA-03'],
    asset_ids: ['A-06'],
    attack_vector: 'Package maintainer compromise, typosquatting, or lockfile manipulation.',
    impact: 'critical',
    likelihood: 'low',
  },
  {
    id: 'T-07',
    name: 'Metrics Calculator Manipulation',
    description: 'Bug or backdoor in metrics calculator produces incorrect accuracy/precision/recall values.',
    actor_ids: ['TA-01', 'TA-02'],
    asset_ids: ['A-06'],
    attack_vector: 'Code change to confusion matrix builder or metrics formula.',
    impact: 'critical',
    likelihood: 'low',
  },
  {
    id: 'T-08',
    name: 'Key Compromise',
    description: 'HMAC or Ed25519 private key exposed via leaked environment variables, logs, or error messages.',
    actor_ids: ['TA-01', 'TA-03'],
    asset_ids: ['A-05'],
    attack_vector: 'Key in error output, committed to repo, or extracted from CI environment.',
    impact: 'critical',
    likelihood: 'low',
  },
] as const;

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export const CONTROLS: readonly Control[] = [
  {
    id: 'C-01',
    name: 'Dual-Reviewer Ground Truth Labeling',
    description: 'Every ground truth sample requires two independent reviewer verdicts with conflict resolution.',
    type: 'preventive',
    threat_ids: ['T-01'],
    implementation: 'GroundTruthSampleSchema enforces reviewer_1, reviewer_2, independent_agreement fields.',
    effectiveness: 'full',
  },
  {
    id: 'C-02',
    name: 'HMAC-Signed Manifests',
    description: 'All corpus manifests (ground-truth, holdout, reference sets, generated) are HMAC-SHA256 signed.',
    type: 'detective',
    threat_ids: ['T-01', 'T-05'],
    implementation: 'hmac-signer.ts with timing-safe verification; key in KATANA_HMAC_KEY env var.',
    effectiveness: 'full',
  },
  {
    id: 'C-03',
    name: 'Merkle Tree Corpus Integrity',
    description: 'SHA-256 Merkle tree with RFC 6962 domain separation detects any single-sample modification.',
    type: 'detective',
    threat_ids: ['T-05'],
    implementation: 'merkle-tree.ts with HMAC-signed root hash; verified before every validation run.',
    effectiveness: 'full',
  },
  {
    id: 'C-04',
    name: 'Ed25519 Digital Signatures',
    description: 'Calibration certificates and validation reports are Ed25519 signed for non-repudiation.',
    type: 'preventive',
    threat_ids: ['T-03'],
    implementation: 'certificate-signer.ts; key type assertion (asymmetricKeyType === ed25519).',
    effectiveness: 'full',
  },
  {
    id: 'C-05',
    name: 'Holdout Set Access Separation',
    description: 'Holdout corpus in separate directory with separate HMAC-signed manifest; CI check for references.',
    type: 'preventive',
    threat_ids: ['T-02'],
    implementation: 'holdout-separator.ts; CI pipeline checks no code references holdout samples outside formal runs.',
    effectiveness: 'partial',
  },
  {
    id: 'C-06',
    name: 'Dependency Pinning & Integrity',
    description: 'All dependencies pinned to exact versions; lockfile hashed; npm audit pre-validation; SBOM generated.',
    type: 'preventive',
    threat_ids: ['T-06'],
    implementation: 'dependency-integrity.ts; checks pinning, lockfile hash, npm audit, SBOM.',
    effectiveness: 'full',
  },
  {
    id: 'C-07',
    name: 'Meta-Validation (Calculator Tests)',
    description: 'Hand-computed confusion matrices verify metrics calculator correctness before validation runs.',
    type: 'detective',
    threat_ids: ['T-07'],
    implementation: 'K11.1 tests in metrics-calculator.test.ts with known expected values.',
    effectiveness: 'full',
  },
  {
    id: 'C-08',
    name: 'Key Management via Environment Variables',
    description: 'Cryptographic keys stored in environment variables, never in code. Minimum key length enforced.',
    type: 'preventive',
    threat_ids: ['T-08'],
    implementation: 'INTEGRITY_CONFIG env var names; 32-char HMAC minimum; PEM format for Ed25519.',
    effectiveness: 'partial',
  },
  {
    id: 'C-09',
    name: 'Git-Hash-Based Calibration Validity',
    description: 'Calibration certificates tied to tool_build_hash; any code change invalidates calibration.',
    type: 'detective',
    threat_ids: ['T-03', 'T-07'],
    implementation: 'calibration-protocol.ts checkCalibrationValidity compares current git hash.',
    effectiveness: 'full',
  },
  {
    id: 'C-10',
    name: 'Ground Truth Challenge Process',
    description: 'Formal 3-reviewer majority vote process for disputed labels, triggered after 3+ run failures.',
    type: 'corrective',
    threat_ids: ['T-01'],
    implementation: 'ground-truth-challenge.ts; K9.2 challenge workflow.',
    effectiveness: 'full',
  },
  {
    id: 'C-11',
    name: 'CAPA System',
    description: 'Corrective/preventive action system triggered by validation failures, regressions, and calibration failures.',
    type: 'corrective',
    threat_ids: ['T-01', 'T-07'],
    implementation: 'capa-integration.ts; K9.3 CAPA workflow with mandatory closure.',
    effectiveness: 'full',
  },
  {
    id: 'C-12',
    name: 'Path Traversal Prevention',
    description: 'All file operations validate resolved paths stay within expected directories.',
    type: 'preventive',
    threat_ids: ['T-05', 'T-08'],
    implementation: 'resolve() + startsWith() checks in labeler, checkpoint, dependency-integrity.',
    effectiveness: 'full',
  },
] as const;

// ---------------------------------------------------------------------------
// Residual Risks
// ---------------------------------------------------------------------------

export const RESIDUAL_RISKS: readonly ResidualRisk[] = [
  {
    threat_id: 'T-01',
    control_ids: ['C-01', 'C-02', 'C-10', 'C-11'],
    residual_impact: 'low',
    residual_likelihood: 'low',
    acceptance_rationale: 'Dual review + challenge process + CAPA makes undetected poisoning require collusion of 2+ reviewers. Quarterly label audit (K11.2) provides additional detection.',
  },
  {
    threat_id: 'T-02',
    control_ids: ['C-05'],
    residual_impact: 'medium',
    residual_likelihood: 'low',
    acceptance_rationale: 'CI check catches code references. Manual discipline required for ad-hoc debugging. Access separation is partial — same repo contains both sets.',
  },
  {
    threat_id: 'T-04',
    control_ids: ['C-03'],
    residual_impact: 'low',
    residual_likelihood: 'low',
    acceptance_rationale: 'Seed in config is public, but exploitation requires per-variation crafted evasion across 200K+ samples. Merkle tree integrity (C-03) detects any corpus tampering. Practical benefit is negligible given corpus size and generator diversity.',
  },
  {
    threat_id: 'T-08',
    control_ids: ['C-08'],
    residual_impact: 'high',
    residual_likelihood: 'low',
    acceptance_rationale: 'Keys never in code. Risk remains if CI environment is compromised or error messages leak key material. Rotation procedure documented.',
  },
] as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildThreatModel(): ThreatModel {
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    document_id: 'KATANA-TM-001',
    title: 'KATANA Validation Framework Threat Model',
    scope: 'Covers all KATANA validation framework components: corpus management, generators, validation runner, calibration, reporting, and cryptographic integrity layers.',
    actors: THREAT_ACTORS,
    assets: ASSETS,
    threats: THREATS,
    controls: CONTROLS,
    residual_risks: RESIDUAL_RISKS,
  };
}

// ---------------------------------------------------------------------------
// Threat-Control Coverage Matrix
// ---------------------------------------------------------------------------

export interface ThreatCoverage {
  readonly threat_id: string;
  readonly threat_name: string;
  readonly control_ids: readonly string[];
  readonly covered: boolean;
  readonly has_residual_risk: boolean;
}

export function computeThreatCoverage(model: ThreatModel): readonly ThreatCoverage[] {
  const controlsByThreat = new Map<string, readonly string[]>();
  for (const control of model.controls) {
    for (const threatId of control.threat_ids) {
      const existing = controlsByThreat.get(threatId) ?? [];
      controlsByThreat.set(threatId, [...existing, control.id]);
    }
  }

  const residualThreatIds = new Set(model.residual_risks.map(r => r.threat_id));

  return model.threats.map(threat => ({
    threat_id: threat.id,
    threat_name: threat.name,
    control_ids: controlsByThreat.get(threat.id) ?? [],
    covered: (controlsByThreat.get(threat.id) ?? []).length > 0,
    has_residual_risk: residualThreatIds.has(threat.id),
  }));
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportThreatModelMarkdown(model: ThreatModel): string {
  const lines: string[] = [
    `# ${model.title}`,
    '',
    `**Document ID:** ${model.document_id}`,
    `**Generated:** ${model.generated_at}`,
    `**Schema Version:** ${model.schema_version}`,
    '',
    `## Scope`,
    '',
    model.scope,
    '',
    '## Threat Actors',
    '',
    '| ID | Name | Capability | Motivation |',
    '|-----|------|------------|------------|',
  ];

  for (const actor of model.actors) {
    lines.push(`| ${actor.id} | ${actor.name} | ${actor.capability} | ${actor.motivation} |`);
  }

  lines.push('', '## Assets', '', '| ID | Name | C | I | A |', '|-----|------|---|---|---|');
  for (const asset of model.assets) {
    lines.push(`| ${asset.id} | ${asset.name} | ${asset.confidentiality} | ${asset.integrity} | ${asset.availability} |`);
  }

  lines.push('', '## Threats', '', '| ID | Name | Impact | Likelihood | Actors | Assets |', '|-----|------|--------|------------|--------|--------|');
  for (const threat of model.threats) {
    lines.push(`| ${threat.id} | ${threat.name} | ${threat.impact} | ${threat.likelihood} | ${threat.actor_ids.join(', ')} | ${threat.asset_ids.join(', ')} |`);
  }

  lines.push('', '## Controls', '', '| ID | Name | Type | Effectiveness | Threats Mitigated |', '|-----|------|------|---------------|-------------------|');
  for (const control of model.controls) {
    lines.push(`| ${control.id} | ${control.name} | ${control.type} | ${control.effectiveness} | ${control.threat_ids.join(', ')} |`);
  }

  lines.push('', '## Residual Risks', '', '| Threat | Controls Applied | Residual Impact | Residual Likelihood | Rationale |', '|--------|------------------|-----------------|---------------------|-----------|');
  for (const risk of model.residual_risks) {
    lines.push(`| ${risk.threat_id} | ${risk.control_ids.join(', ')} | ${risk.residual_impact} | ${risk.residual_likelihood} | ${risk.acceptance_rationale} |`);
  }

  const coverage = computeThreatCoverage(model);
  lines.push('', '## Threat-Control Coverage Matrix', '', '| Threat | Controls | Covered | Residual Risk Documented |', '|--------|----------|---------|--------------------------|');
  for (const c of coverage) {
    lines.push(`| ${c.threat_id} — ${c.threat_name} | ${c.control_ids.join(', ') || 'NONE'} | ${c.covered ? 'Yes' : '**NO**'} | ${c.has_residual_risk ? 'Yes' : 'No'} |`);
  }

  lines.push('');
  return lines.join('\n');
}
