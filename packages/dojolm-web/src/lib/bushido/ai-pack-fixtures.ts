// SPDX-License-Identifier: Apache-2.0
/**
 * File: ai-pack-fixtures.ts
 * Purpose: TICKET-C102b / ADR-0095 §5 — bundled AI Pack evidence templates
 *          for the 27-id AI compliance framework corpus
 *          (`AiComplianceFrameworkId` derived from `ALL_FRAMEWORKS`).
 *
 *          Mirrors `DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES` (8-id reference
 *          corpus, 30 templates) — this file ships **54 templates**
 *          (= 2 × 27 frameworks) so every AI Pack framework carries
 *          ≥ 2 evidence templates per master checklist invariant.
 *
 * Per operator §12 item 6 (CONSOLIDATED-GAPS:1036): templates are
 * **ALL** in-house + sourced from public corpora — OWASP LLM Top 10,
 * MITRE ATLAS, NIST AI 600-1, Google SAIF, ENISA. The `sourceRef`
 * field on every template carries the citation identifier. The
 * AI_PACK_EVIDENCE_SOURCES closed-enum pins the supported source
 * corpora — adding a new source means adding it to that tuple.
 *
 * CRITICAL severity is assigned to every prompt-injection-class
 * template (one per framework where the framework's control set
 * includes prompt-injection-relevant controls). This is the
 * "CRITICAL severity coverage for each prompt-injection-class
 * control" invariant from CONSOLIDATED-GAPS:770.
 *
 * Story: TICKET-C102b — Phase A-EXPANDED last open ticket.
 *
 * R-T1 closed-enum discipline:
 *   - `AiPackEvidenceSource` literal-union over the supported sources.
 *   - `AiPackEvidenceTemplate.frameworkIds` typed via
 *     `AiComplianceFrameworkId` (27-id closed enum).
 *   - `severity` reuses the existing `BushidoSeverity` 5-tier enum.
 *
 * File-size note: this file is intentionally larger than the project's
 * 800-line typical guidance because it carries a 27-framework × 2-template
 * fixture corpus (~25 lines/template × 54 = ~1300 lines of literal data).
 * The data and the compile-time exhaustiveness gate are tightly coupled
 * (the gate asserts against `(typeof AI_PACK_FRAMEWORK_THEMES)[number]`)
 * — splitting the data into a sibling file would weaken the gate or
 * require a re-export shim. Master checklist row 174 anticipates this
 * fixture-authoring volume; treating as a documented exception per the
 * data/logic-coupling rationale.
 */

import { ALL_FRAMEWORKS } from 'bu-tpi/compliance'
import type {
  AiComplianceFrameworkId,
  BushidoSeverity,
} from './fixtures'

// ---------------------------------------------------------------------------
// Closed-enum sources (R-T1)
// ---------------------------------------------------------------------------

/**
 * Closed-enum tuple of source corpora cited by AI Pack evidence templates.
 * Adding a new source corpus requires extending this tuple AND providing
 * a citation reference (URL or document id) in the template.
 *
 * `IN-HOUSE` covers BU-authored templates not derived from a public
 * corpus — these still need a `sourceRef` (an internal ADR or doc).
 */
export const AI_PACK_EVIDENCE_SOURCES = Object.freeze([
  'OWASP-LLM-TOP10',
  'MITRE-ATLAS',
  'NIST-AI-600-1',
  'NIST-AI-100-4',
  'GOOGLE-SAIF',
  'ENISA',
  'IN-HOUSE',
] as const)
export type AiPackEvidenceSource = (typeof AI_PACK_EVIDENCE_SOURCES)[number]

const SOURCE_REF_URLS: Readonly<Record<AiPackEvidenceSource, string>> =
  Object.freeze({
    'OWASP-LLM-TOP10':
      'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    'MITRE-ATLAS': 'https://atlas.mitre.org/',
    'NIST-AI-600-1': 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf',
    'NIST-AI-100-4': 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-4.pdf',
    'GOOGLE-SAIF': 'https://safety.google/saif/',
    ENISA:
      'https://www.enisa.europa.eu/publications/multilayer-framework-for-good-cybersecurity-practices-for-ai',
    'IN-HOUSE': 'ADR-0095 (bushido dual corpus)',
  })

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * AI Pack evidence template. Mirrors `BushidoEvidenceTemplate` from
 * `fixtures.ts` (Reference 8-id corpus) but the `frameworkIds` field
 * is typed against the 27-id `AiComplianceFrameworkId` closed enum.
 *
 * Adds two AI-Pack-specific fields:
 *   - `source`: closed-enum citation (which public corpus / IN-HOUSE)
 *   - `sourceRef`: human-readable reference (URL / document path)
 */
export interface AiPackEvidenceTemplate {
  readonly id: string
  readonly name: string
  readonly frameworkIds: readonly AiComplianceFrameworkId[]
  readonly controlIds: readonly string[]
  readonly severity: BushidoSeverity
  readonly collectionSteps: readonly string[]
  readonly expectedArtefacts: readonly string[]
  readonly tags: readonly string[]
  readonly source: AiPackEvidenceSource
  readonly sourceRef: string
}

// ---------------------------------------------------------------------------
// Per-framework theme specification (compact authoring DSL)
// ---------------------------------------------------------------------------

interface ThemePart {
  readonly slug: string
  readonly title: string
  readonly controlIds: readonly string[]
  readonly severity: BushidoSeverity
  readonly source: AiPackEvidenceSource
  readonly secondaryFrameworkId?: AiComplianceFrameworkId
  readonly steps: readonly string[]
  readonly artefacts: readonly string[]
  readonly tags: readonly string[]
  /** Marks the theme as a prompt-injection-class control — invariant
   *  test BUS-AI-002 asserts CRITICAL coverage for every framework
   *  whose theme set includes ≥1 part with `promptInjection: true`. */
  readonly promptInjection?: boolean
}

interface FrameworkTheme {
  readonly frameworkId: AiComplianceFrameworkId
  readonly primary: ThemePart
  readonly secondary: ThemePart
}

/**
 * Per-framework theme spec (27 entries × 2 templates = 54 total).
 *
 * Selection rationale per framework:
 *   - PRIMARY usually targets the framework's central control area
 *     (e.g., OWASP LLM01, MITRE ATLAS prompt injection technique).
 *   - SECONDARY targets a complementary cross-cut (often a
 *     prompt-injection-class control where the framework includes
 *     one — those are tagged CRITICAL).
 *
 * Citation source pinning: PRIMARY cites the framework's own corpus
 * where possible; SECONDARY cross-references an outside corpus or
 * IN-HOUSE BU-authored guidance.
 *
 * Authored 2026-05-05.
 */
// `as const` preserves each entry's literal `frameworkId` so `typeof`
// can derive the per-theme literal union for the
// `_AI_PACK_THEMES_EXHAUSTIVE` compile-time gate below. Annotating
// with `ReadonlyArray<FrameworkTheme>` would widen `frameworkId` to
// the full `AiComplianceFrameworkId` union and silently defeat the
// gate. Structural shape is enforced by the trailing `satisfies`
// clause; `Object.freeze` remains for runtime immutability.
const AI_PACK_FRAMEWORK_THEMES = Object.freeze([
  {
    frameworkId: 'owasp-llm-top10',
    primary: {
      slug: 'llm01-prompt-injection',
      title: 'LLM01: Prompt Injection — payload + mitigation evidence',
      controlIds: ['LLM01'],
      severity: 'CRITICAL',
      source: 'OWASP-LLM-TOP10',
      steps: [
        'Capture latest Kotoba prompt-injection scanner ruleset (last 30 days).',
        'Export DojoLM scanner results for the LLM01 payload battery.',
        'Attach Sensei mode-thresholds policy showing escalation under load.',
        'File the bundle with red-team sign-off in the LLM01 audit folder.',
      ],
      artefacts: [
        'kotoba-llm01-rules.json',
        'dojolm-scanner-llm01-results.ndjson',
        'sensei-thresholds-llm01.json',
      ],
      tags: ['owasp-llm-top10', 'prompt-injection', 'critical'],
      promptInjection: true,
    },
    secondary: {
      slug: 'llm02-insecure-output',
      title: 'LLM02: Insecure Output Handling — sanitisation + downstream evidence',
      controlIds: ['LLM02'],
      severity: 'HIGH',
      source: 'OWASP-LLM-TOP10',
      secondaryFrameworkId: 'owasp-asvs',
      steps: [
        'Export OWASP ASVS V5.3 output-encoding controls for downstream consumers.',
        'Capture Shingan output-canonicalisation traces tagged llm02.',
        'Attach Buki sanitisation fixtures + Atemi exfil playbook results.',
        'File evidence under both LLM02 and ASVS V5.3 audit slots.',
      ],
      artefacts: [
        'asvs-v5-3-controls.json',
        'shingan-llm02-canonicalisation.ndjson',
        'buki-llm02-fixtures.tgz',
      ],
      tags: ['owasp-llm-top10', 'output-handling', 'asvs'],
    },
  },
  {
    frameworkId: 'nist-ai-600-1',
    primary: {
      slug: 'gv-1-1-governance',
      title: 'NIST AI 600-1 GV-1.1: GAI Governance & Roles evidence',
      controlIds: ['GV-1.1', 'GV-1.2'],
      severity: 'HIGH',
      source: 'NIST-AI-600-1',
      steps: [
        'Export NIST AI 600-1 GAI profile control mapping for governance roles.',
        'Capture BU AI governance committee meeting minutes (last quarter).',
        'Attach role-based access policies tagged genai/gv-1.',
        'File the bundle in the AI 600-1 governance audit folder.',
      ],
      artefacts: [
        'nist-ai-600-1-gv-mapping.json',
        'governance-minutes-q.ndjson',
        'rbac-genai-policies.json',
      ],
      tags: ['nist-ai-600-1', 'governance', 'gai'],
    },
    secondary: {
      slug: 'ms-1-1-prompt-injection',
      title: 'NIST AI 600-1 MS-1.1: GAI Prompt Injection Measurement',
      controlIds: ['MS-1.1', 'MS-2.7'],
      severity: 'CRITICAL',
      source: 'NIST-AI-600-1',
      secondaryFrameworkId: 'mitre-atlas',
      steps: [
        'Run NIST GAI prompt-injection measurement battery against tracked models.',
        'Capture Sensei judge results + Hattori escalation events.',
        'Cross-map to MITRE ATLAS AML.T0051 LLM Prompt Injection technique.',
        'File the measurement report in the GAI bias/safety audit folder.',
      ],
      artefacts: [
        'nist-gai-pi-measurement.json',
        'sensei-judge-pi-results.ndjson',
        'atlas-aml-t0051-crossmap.json',
      ],
      tags: ['nist-ai-600-1', 'prompt-injection', 'measurement', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'mitre-atlas',
    primary: {
      slug: 'aml-t0051-prompt-injection',
      title: 'MITRE ATLAS AML.T0051: LLM Prompt Injection technique evidence',
      controlIds: ['AML.T0051'],
      severity: 'CRITICAL',
      source: 'MITRE-ATLAS',
      steps: [
        'Pull MITRE ATLAS AML.T0051 case-study payload set.',
        'Run Sensei generate_attack with prompt-injection category against tracked models.',
        'Capture detection telemetry from Hattori guard-mode escalations.',
        'File ATT&CK-mapped findings in the ATLAS audit folder.',
      ],
      artefacts: [
        'atlas-aml-t0051-payloads.json',
        'sensei-attack-results.ndjson',
        'hattori-escalation-log.ndjson',
      ],
      tags: ['mitre-atlas', 'prompt-injection', 'attack-technique', 'critical'],
      promptInjection: true,
    },
    secondary: {
      slug: 'aml-t0048-backdoor',
      title: 'MITRE ATLAS AML.T0048: Backdoor ML Model — supply-chain evidence',
      controlIds: ['AML.T0048'],
      severity: 'CRITICAL',
      source: 'MITRE-ATLAS',
      secondaryFrameworkId: 'slsa-v1',
      steps: [
        'Capture model registry signatures + SLSA L3 build provenance.',
        'Run Kagami fingerprint-drift detection over the last 90 days.',
        'Attach Onigaeshi audit chain showing model-artefact integrity.',
        'File supply-chain evidence in both ATLAS and SLSA audit folders.',
      ],
      artefacts: [
        'slsa-l3-provenance.json',
        'kagami-drift-90d.ndjson',
        'onigaeshi-model-chain.json',
      ],
      tags: ['mitre-atlas', 'backdoor', 'supply-chain', 'critical'],
    },
  },
  {
    frameworkId: 'iso-42001',
    primary: {
      slug: 'cl-6-1-risk-mgmt',
      title: 'ISO/IEC 42001 Cl. 6.1: AI Risk Management evidence',
      controlIds: ['Cl.6.1', 'Cl.6.2'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Export ISO 42001 risk register for tracked AI systems.',
        'Capture last quarter\'s Bushido sign-off events linked to risk treatment.',
        'Attach AIVSS rollups per framework consumer (G6 aggregator).',
        'File the bundle in the ISO 42001 AIMS audit folder.',
      ],
      artefacts: [
        'iso-42001-risk-register.json',
        'bushido-signoffs-q.ndjson',
        'aivss-rollups-q.json',
      ],
      tags: ['iso-42001', 'risk-management', 'aims'],
    },
    secondary: {
      slug: 'cl-8-2-operations-pi',
      title: 'ISO/IEC 42001 Cl. 8.2: AI System Operations — prompt injection mitigations',
      controlIds: ['Cl.8.2'],
      severity: 'CRITICAL',
      source: 'OWASP-LLM-TOP10',
      secondaryFrameworkId: 'owasp-llm-top10',
      steps: [
        'Cross-reference ISO 42001 operations clause with OWASP LLM01.',
        'Capture Sensei guard-mode policy + Hattori thresholds.',
        'Attach evidence of input-validation gates at LLM ingress.',
        'File the bundle in the AIMS operations audit folder.',
      ],
      artefacts: [
        'iso-42001-operations.json',
        'sensei-guard-policy.json',
        'hattori-thresholds.json',
      ],
      tags: ['iso-42001', 'prompt-injection', 'operations', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'eu-ai-act',
    primary: {
      slug: 'art-9-risk-mgmt',
      title: 'EU AI Act Art. 9: Risk Management System evidence',
      controlIds: ['Art.9'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Export EU AI Act Art. 9 risk-management documentation.',
        'Capture high-risk AI system inventory + classifications.',
        'Attach quarterly risk review meeting minutes.',
        'File the bundle in the EU AI Act conformity audit folder.',
      ],
      artefacts: [
        'eu-ai-act-art9-risk.json',
        'high-risk-ai-inventory.json',
        'risk-review-minutes-q.ndjson',
      ],
      tags: ['eu-ai-act', 'risk-management', 'conformity'],
    },
    secondary: {
      slug: 'art-15-cybersecurity',
      title: 'EU AI Act Art. 15: Accuracy, Robustness, Cybersecurity — adversarial testing',
      controlIds: ['Art.15'],
      severity: 'CRITICAL',
      source: 'ENISA',
      secondaryFrameworkId: 'mitre-atlas',
      steps: [
        'Run ENISA-aligned adversarial testing battery over high-risk AI systems.',
        'Capture Sensei multi-turn attack plans + ablation analyses.',
        'Cross-map findings to MITRE ATLAS techniques.',
        'File robustness evidence in the EU AI Act technical documentation.',
      ],
      artefacts: [
        'enisa-adversarial-results.ndjson',
        'sensei-multiturn-plans.json',
        'atlas-crossmap-art15.json',
      ],
      tags: ['eu-ai-act', 'cybersecurity', 'adversarial', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'nist-800-218a',
    primary: {
      slug: 'pw-4-1-third-party',
      title: 'NIST SP 800-218A PW.4.1: AI Third-Party Component Verification',
      controlIds: ['PW.4.1'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      secondaryFrameworkId: 'ml-bom',
      steps: [
        'Generate ML-BOM inventory of all model + dataset components.',
        'Capture provenance hashes + signing certificates.',
        'Attach upstream-supplier attestation reports.',
        'File supply-chain evidence in the SSDF audit folder.',
      ],
      artefacts: [
        'mlbom-inventory.json',
        'component-provenance.json',
        'supplier-attestations.tgz',
      ],
      tags: ['nist-800-218a', 'ssdf', 'supply-chain'],
    },
    secondary: {
      slug: 'rv-1-1-vuln-disclosure',
      title: 'NIST SP 800-218A RV.1.1: AI Vulnerability Disclosure evidence',
      controlIds: ['RV.1.1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Export coordinated AI vulnerability disclosure policy.',
        'Capture last quarter\'s disclosure intake + remediation timelines.',
        'Attach BU CVE-style AI-CVE tracker entries.',
        'File the bundle in the SSDF response audit folder.',
      ],
      artefacts: [
        'ai-vuln-disclosure-policy.md',
        'disclosure-tracker-q.ndjson',
        'ai-cve-entries.json',
      ],
      tags: ['nist-800-218a', 'vulnerability', 'disclosure'],
    },
  },
  {
    frameworkId: 'iso-23894',
    primary: {
      slug: 'risk-mgmt-process',
      title: 'ISO/IEC 23894: AI Risk Management Process evidence',
      controlIds: ['Cl.6'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Document ISO 23894 risk-mgmt process with role assignments.',
        'Capture risk identification artefacts from last quarter.',
        'Attach risk-treatment plan with owners + due dates.',
        'File the process documentation in the AI risk audit folder.',
      ],
      artefacts: [
        'iso-23894-process.md',
        'risk-id-artefacts-q.json',
        'risk-treatment-plan.json',
      ],
      tags: ['iso-23894', 'risk-management', 'process'],
    },
    secondary: {
      slug: 'risk-treatment-pi',
      title: 'ISO/IEC 23894: Risk Treatment for Prompt-Injection Threats',
      controlIds: ['Cl.6.5'],
      severity: 'CRITICAL',
      source: 'OWASP-LLM-TOP10',
      secondaryFrameworkId: 'owasp-llm-top10',
      steps: [
        'Tie OWASP LLM01 risks into the ISO 23894 treatment register.',
        'Capture mitigations: input filters, output canonicalisation, guard modes.',
        'Attach evidence of residual-risk acceptance sign-offs.',
        'File the cross-mapping in the AI risk audit folder.',
      ],
      artefacts: [
        'iso-23894-pi-treatments.json',
        'mitigation-evidence.tgz',
        'residual-risk-signoffs.ndjson',
      ],
      tags: ['iso-23894', 'prompt-injection', 'risk-treatment', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'iso-24027',
    primary: {
      slug: 'bias-detection',
      title: 'ISO/IEC TR 24027: AI Bias Detection evidence',
      controlIds: ['Cl.6.2'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Run bias-detection battery against tracked models.',
        'Capture demographic parity + equalised odds metrics.',
        'Attach mitigation steps + retraining notes.',
        'File bias-evaluation evidence in the fairness audit folder.',
      ],
      artefacts: [
        'bias-metrics.json',
        'demographic-parity.ndjson',
        'mitigation-notes.md',
      ],
      tags: ['iso-24027', 'bias', 'fairness'],
    },
    secondary: {
      slug: 'fairness-monitoring',
      title: 'ISO/IEC TR 24027: Continuous Fairness Monitoring',
      controlIds: ['Cl.7.1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Configure continuous fairness monitoring dashboards.',
        'Capture last quarter\'s fairness drift alerts.',
        'Attach action plans for any threshold breaches.',
        'File monitoring evidence in the fairness audit folder.',
      ],
      artefacts: [
        'fairness-dashboard-config.json',
        'drift-alerts-q.ndjson',
        'action-plans.json',
      ],
      tags: ['iso-24027', 'fairness', 'monitoring'],
    },
  },
  {
    frameworkId: 'iso-24028',
    primary: {
      slug: 'trustworthiness',
      title: 'ISO/IEC TR 24028: AI Trustworthiness Assessment',
      controlIds: ['Cl.5'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Run ISO 24028 trustworthiness assessment battery.',
        'Capture transparency + explainability metrics.',
        'Attach assessor sign-off + methodology notes.',
        'File trustworthiness evidence in the audit folder.',
      ],
      artefacts: [
        'trustworthiness-report.json',
        'transparency-metrics.json',
        'assessor-signoff.pdf.txt',
      ],
      tags: ['iso-24028', 'trustworthiness', 'transparency'],
    },
    secondary: {
      slug: 'robustness-adversarial',
      title: 'ISO/IEC TR 24028: AI Robustness — Adversarial Test evidence',
      controlIds: ['Cl.6.3'],
      severity: 'CRITICAL',
      source: 'MITRE-ATLAS',
      secondaryFrameworkId: 'mitre-atlas',
      steps: [
        'Run MITRE ATLAS-aligned adversarial battery against tracked models.',
        'Capture robustness scores under various attack vectors.',
        'Attach failure-mode analysis + mitigation roadmap.',
        'File robustness evidence in the trustworthiness audit folder.',
      ],
      artefacts: [
        'adversarial-battery.ndjson',
        'robustness-scores.json',
        'failure-mode-analysis.md',
      ],
      tags: ['iso-24028', 'robustness', 'adversarial', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'google-saif',
    primary: {
      slug: 'saif-1-foundations',
      title: 'Google SAIF-1: Strong Security Foundations — prompt injection defence',
      controlIds: ['SAIF-1'],
      severity: 'CRITICAL',
      source: 'GOOGLE-SAIF',
      steps: [
        'Map Google SAIF-1 controls to active LLM ingress filters.',
        'Capture Hattori threshold rules + auto-escalation events.',
        'Attach Sensei prompt-injection battery results.',
        'File SAIF foundation evidence in the AI security audit folder.',
      ],
      artefacts: [
        'saif-1-controls.json',
        'hattori-rules.json',
        'sensei-pi-battery.ndjson',
      ],
      tags: ['google-saif', 'prompt-injection', 'foundations', 'critical'],
      promptInjection: true,
    },
    secondary: {
      slug: 'saif-3-supply-chain',
      title: 'Google SAIF-3: AI Supply-Chain Security evidence',
      controlIds: ['SAIF-3'],
      severity: 'HIGH',
      source: 'GOOGLE-SAIF',
      secondaryFrameworkId: 'slsa-v1',
      steps: [
        'Map Google SAIF-3 controls to ML-BOM + SLSA provenance evidence.',
        'Capture model + dataset signing chain.',
        'Attach upstream-supplier security attestations.',
        'File supply-chain evidence in the AI security audit folder.',
      ],
      artefacts: [
        'saif-3-controls.json',
        'mlbom-supply-chain.json',
        'supplier-attestations.tgz',
      ],
      tags: ['google-saif', 'supply-chain'],
    },
  },
  {
    frameworkId: 'cisa-ncsc',
    primary: {
      slug: 'secure-design',
      title: 'CISA/NCSC AI Secure Design Principles evidence',
      controlIds: ['SecureDesign-1'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Document CISA/NCSC secure-by-design AI principles applied to tracked models.',
        'Capture threat-modelling outputs.',
        'Attach security-review sign-offs at design milestones.',
        'File design evidence in the AI security audit folder.',
      ],
      artefacts: [
        'secure-design-principles.md',
        'threat-models.json',
        'design-signoffs.ndjson',
      ],
      tags: ['cisa-ncsc', 'secure-design'],
    },
    secondary: {
      slug: 'data-poisoning',
      title: 'CISA/NCSC AI Training Data Poisoning Detection',
      controlIds: ['SecureDev-2'],
      severity: 'CRITICAL',
      source: 'MITRE-ATLAS',
      secondaryFrameworkId: 'mitre-atlas',
      steps: [
        'Run training-data poisoning detection scans (MITRE ATLAS AML.T0020).',
        'Capture dataset integrity hashes + drift analyses.',
        'Attach quarantine actions for any flagged samples.',
        'File data-poisoning evidence in the AI security audit folder.',
      ],
      artefacts: [
        'data-poisoning-scans.ndjson',
        'dataset-integrity.json',
        'quarantine-actions.json',
      ],
      tags: ['cisa-ncsc', 'data-poisoning', 'training', 'critical'],
    },
  },
  {
    frameworkId: 'slsa-v1',
    primary: {
      slug: 'build-l3',
      title: 'SLSA v1.0 Build L3: Hosted Builder + Provenance evidence',
      controlIds: ['Build-L3'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Verify hosted builder configuration meets SLSA L3 requirements.',
        'Capture build provenance attestations for tracked model artefacts.',
        'Attach reproducibility + isolation evidence.',
        'File L3 evidence in the supply-chain audit folder.',
      ],
      artefacts: [
        'slsa-l3-builder.json',
        'provenance-attestations.json',
        'reproducibility-runs.ndjson',
      ],
      tags: ['slsa-v1', 'build', 'l3'],
    },
    secondary: {
      slug: 'source-integrity',
      title: 'SLSA v1.0 Source Track: Source Integrity evidence',
      controlIds: ['Source-L3'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Verify branch-protection + signed commits on model-training repos.',
        'Capture two-person review evidence.',
        'Attach build provenance linking source to artefact.',
        'File source-integrity evidence in the supply-chain audit folder.',
      ],
      artefacts: [
        'branch-protection.json',
        'signed-commits.json',
        'build-source-link.ndjson',
      ],
      tags: ['slsa-v1', 'source', 'integrity'],
    },
  },
  {
    frameworkId: 'ml-bom',
    primary: {
      slug: 'mlbom-inventory',
      title: 'ML-BOM: Component Inventory evidence',
      controlIds: ['MLBOM-1'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Generate ML-BOM (CycloneDX-ML format) for all tracked models.',
        'Capture model + dataset + framework component lists.',
        'Attach licensing + provenance metadata.',
        'File ML-BOM evidence in the supply-chain audit folder.',
      ],
      artefacts: [
        'mlbom-cyclonedx.json',
        'component-licenses.json',
        'provenance-metadata.json',
      ],
      tags: ['ml-bom', 'inventory', 'cyclonedx'],
    },
    secondary: {
      slug: 'mlbom-tracking',
      title: 'ML-BOM: Model Artefact Tracking evidence',
      controlIds: ['MLBOM-2'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Track every model artefact + checkpoint version in registry.',
        'Capture deployment history per model + environment.',
        'Attach decommissioning records for retired artefacts.',
        'File artefact-tracking evidence in the supply-chain audit folder.',
      ],
      artefacts: [
        'model-registry-export.json',
        'deployment-history.ndjson',
        'decommissioning-records.json',
      ],
      tags: ['ml-bom', 'tracking', 'lifecycle'],
    },
  },
  {
    frameworkId: 'openssf',
    primary: {
      slug: 'openssf-supply-chain',
      title: 'OpenSSF AI/ML Supply-Chain Best Practices evidence',
      controlIds: ['OpenSSF-AI-1'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Audit AI/ML repos against OpenSSF best practices.',
        'Capture scorecard results for tracked repos.',
        'Attach remediation tickets for failed checks.',
        'File OpenSSF evidence in the supply-chain audit folder.',
      ],
      artefacts: [
        'openssf-audit.json',
        'scorecard-results.ndjson',
        'remediation-tickets.json',
      ],
      tags: ['openssf', 'supply-chain', 'scorecard'],
    },
    secondary: {
      slug: 'openssf-scorecard',
      title: 'OpenSSF Scorecard: Continuous Repo Hygiene evidence',
      controlIds: ['Scorecard-1'],
      severity: 'LOW',
      source: 'IN-HOUSE',
      steps: [
        'Schedule OpenSSF Scorecard runs in CI for all AI repos.',
        'Capture last quarter\'s score trends.',
        'Attach action items for any score drops.',
        'File scorecard evidence in the repo-hygiene audit folder.',
      ],
      artefacts: [
        'scorecard-ci-config.yml.txt',
        'score-trends-q.json',
        'action-items.ndjson',
      ],
      tags: ['openssf', 'scorecard', 'hygiene'],
    },
  },
  {
    frameworkId: 'nist-csf-2',
    primary: {
      slug: 'gv-oc-governance',
      title: 'NIST CSF 2.0 GV.OC: Organisational Context (AI extension)',
      controlIds: ['GV.OC-01', 'GV.OC-02'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Document AI mission + stakeholder context per CSF 2.0 GV.OC.',
        'Capture AI risk-tolerance statements.',
        'Attach board-level reporting cadence evidence.',
        'File governance evidence in the CSF audit folder.',
      ],
      artefacts: [
        'csf-gv-oc-context.md',
        'risk-tolerance-statements.json',
        'board-reporting-cadence.json',
      ],
      tags: ['nist-csf-2', 'governance', 'context'],
    },
    secondary: {
      slug: 'de-cm-monitoring',
      title: 'NIST CSF 2.0 DE.CM: Continuous Monitoring of AI Systems',
      controlIds: ['DE.CM-01', 'DE.CM-09'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Configure continuous monitoring across LLM ingress + egress.',
        'Capture anomaly detection alerts (last quarter).',
        'Attach incident response playbook executions.',
        'File monitoring evidence in the CSF audit folder.',
      ],
      artefacts: [
        'monitoring-config.json',
        'anomaly-alerts-q.ndjson',
        'ir-playbook-runs.json',
      ],
      tags: ['nist-csf-2', 'monitoring', 'detection'],
    },
  },
  {
    frameworkId: 'uk-dsit',
    primary: {
      slug: 'uk-ai-safety',
      title: 'UK DSIT AI Safety Guidance Adoption evidence',
      controlIds: ['UK-AI-Safety-1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Map tracked AI systems to UK DSIT safety guidance.',
        'Capture pre-deployment safety evaluations.',
        'Attach UK AI Safety Institute liaison records.',
        'File UK guidance evidence in the AI policy audit folder.',
      ],
      artefacts: [
        'dsit-mapping.json',
        'safety-evaluations.ndjson',
        'aisi-liaison.json',
      ],
      tags: ['uk-dsit', 'safety', 'pre-deployment'],
    },
    secondary: {
      slug: 'uk-model-audit',
      title: 'UK DSIT Model Audit + Red Team evidence',
      controlIds: ['UK-AI-Safety-2'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Run UK-aligned model audits including red-team exercises.',
        'Capture findings + mitigation roadmap.',
        'Attach external auditor sign-off.',
        'File model-audit evidence in the AI policy audit folder.',
      ],
      artefacts: [
        'model-audit-report.json',
        'redteam-findings.ndjson',
        'auditor-signoff.txt',
      ],
      tags: ['uk-dsit', 'audit', 'red-team'],
    },
  },
  {
    frameworkId: 'ieee-p7000',
    primary: {
      slug: 'ethical-design',
      title: 'IEEE P7000: Ethical AI Design Process evidence',
      controlIds: ['P7000-Cl.5'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Apply IEEE P7000 ethical-design process to tracked AI systems.',
        'Capture stakeholder values mapping.',
        'Attach ethical risk register.',
        'File ethical-design evidence in the AI ethics audit folder.',
      ],
      artefacts: [
        'p7000-process.md',
        'values-mapping.json',
        'ethical-risk-register.json',
      ],
      tags: ['ieee-p7000', 'ethics', 'design'],
    },
    secondary: {
      slug: 'value-alignment',
      title: 'IEEE P7000: Value-Alignment Verification evidence',
      controlIds: ['P7000-Cl.7'],
      severity: 'LOW',
      source: 'IN-HOUSE',
      steps: [
        'Verify alignment between deployed AI behaviour and stated values.',
        'Capture user-feedback aggregates.',
        'Attach corrective-action records.',
        'File value-alignment evidence in the AI ethics audit folder.',
      ],
      artefacts: [
        'alignment-verification.json',
        'user-feedback.ndjson',
        'corrective-actions.json',
      ],
      tags: ['ieee-p7000', 'value-alignment'],
    },
  },
  {
    frameworkId: 'nist-ai-100-4',
    primary: {
      slug: 'synthetic-content',
      title: 'NIST AI 100-4: Synthetic Content Provenance evidence',
      controlIds: ['SC-Provenance-1'],
      severity: 'HIGH',
      source: 'NIST-AI-100-4',
      steps: [
        'Apply NIST AI 100-4 provenance + watermarking to generated content.',
        'Capture C2PA-compatible signing metadata.',
        'Attach watermark detection evaluation results.',
        'File provenance evidence in the synthetic-content audit folder.',
      ],
      artefacts: [
        'c2pa-signatures.json',
        'watermark-detection.ndjson',
        'provenance-metadata.json',
      ],
      tags: ['nist-ai-100-4', 'provenance', 'watermarking'],
    },
    secondary: {
      slug: 'watermarking-eval',
      title: 'NIST AI 100-4: Watermark Robustness Evaluation evidence',
      controlIds: ['SC-Watermark-2'],
      severity: 'MEDIUM',
      source: 'NIST-AI-100-4',
      steps: [
        'Run watermark robustness battery against tracked generative models.',
        'Capture detection rates under transformations.',
        'Attach failure-mode analysis.',
        'File watermark-evaluation evidence in the synthetic-content audit folder.',
      ],
      artefacts: [
        'watermark-battery.ndjson',
        'detection-rates.json',
        'failure-mode-analysis.md',
      ],
      tags: ['nist-ai-100-4', 'watermarking', 'robustness'],
    },
  },
  {
    frameworkId: 'eu-ai-act-gpai',
    primary: {
      slug: 'gpai-obligations',
      title: 'EU AI Act GPAI: General-Purpose AI Model Obligations evidence',
      controlIds: ['GPAI-Art.53'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Document GPAI model technical documentation per Art. 53.',
        'Capture training data summary (copyright-aware).',
        'Attach downstream-deployer information packets.',
        'File GPAI evidence in the EU AI Act audit folder.',
      ],
      artefacts: [
        'gpai-tech-docs.json',
        'training-data-summary.json',
        'deployer-info-packets.tgz',
      ],
      tags: ['eu-ai-act-gpai', 'gpai', 'art-53'],
    },
    secondary: {
      slug: 'gpai-systemic-risk',
      title: 'EU AI Act GPAI Systemic Risk: Adversarial Evaluation evidence',
      controlIds: ['GPAI-Art.55'],
      severity: 'CRITICAL',
      source: 'ENISA',
      secondaryFrameworkId: 'eu-ai-act',
      steps: [
        'Run systemic-risk adversarial evaluations on GPAI models.',
        'Capture incident-tracking + serious-incident reports.',
        'Attach mitigation roadmap with deadlines.',
        'File systemic-risk evidence in the EU AI Act audit folder.',
      ],
      artefacts: [
        'gpai-systemic-evals.ndjson',
        'incident-reports.json',
        'mitigation-roadmap.json',
      ],
      tags: ['eu-ai-act-gpai', 'systemic-risk', 'adversarial', 'critical'],
      promptInjection: true,
    },
  },
  {
    frameworkId: 'sg-mgaf',
    primary: {
      slug: 'sg-governance',
      title: 'Singapore Model AI Governance Framework evidence',
      controlIds: ['SG-MGAF-1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Apply Singapore MGAF principles to tracked AI systems.',
        'Capture internal governance committee minutes.',
        'Attach IMDA AI Verify toolkit evaluation results.',
        'File Singapore evidence in the regional-compliance audit folder.',
      ],
      artefacts: [
        'sg-mgaf-mapping.json',
        'governance-minutes.ndjson',
        'aiverify-results.json',
      ],
      tags: ['sg-mgaf', 'singapore', 'governance'],
    },
    secondary: {
      slug: 'sg-impact-assessment',
      title: 'Singapore MGAF Impact Assessment evidence',
      controlIds: ['SG-MGAF-2'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Run Singapore MGAF impact assessments per AI system.',
        'Capture severity + likelihood scoring.',
        'Attach mitigation plans.',
        'File impact assessments in the regional-compliance audit folder.',
      ],
      artefacts: [
        'impact-assessments.ndjson',
        'severity-scoring.json',
        'mitigation-plans.json',
      ],
      tags: ['sg-mgaf', 'singapore', 'impact'],
    },
  },
  {
    frameworkId: 'ca-aia',
    primary: {
      slug: 'ca-impact-level',
      title: 'Canada Algorithmic Impact Assessment Level Determination',
      controlIds: ['CA-AIA-Level'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Run Treasury Board AIA questionnaire for tracked systems.',
        'Capture impact-level scoring (I-IV).',
        'Attach mitigations matched to impact level.',
        'File AIA evidence in the regional-compliance audit folder.',
      ],
      artefacts: [
        'aia-questionnaire.json',
        'impact-level-scoring.json',
        'level-matched-mitigations.json',
      ],
      tags: ['ca-aia', 'canada', 'impact'],
    },
    secondary: {
      slug: 'ca-transparency',
      title: 'Canada AIA Transparency Requirement evidence',
      controlIds: ['CA-AIA-Transparency'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Document automated decision-system transparency notices.',
        'Capture user-facing explanations of decisions.',
        'Attach appeal-mechanism logs.',
        'File transparency evidence in the regional-compliance audit folder.',
      ],
      artefacts: [
        'transparency-notices.json',
        'user-explanations.ndjson',
        'appeal-mechanism-logs.json',
      ],
      tags: ['ca-aia', 'canada', 'transparency'],
    },
  },
  {
    frameworkId: 'au-aie',
    primary: {
      slug: 'au-ethics',
      title: 'Australia AI Ethics Principles Adherence evidence',
      controlIds: ['AU-AIE-1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Map tracked AI systems to Australian AI Ethics Principles.',
        'Capture human-centred design evidence.',
        'Attach fairness + transparency evaluations.',
        'File ethics-principles evidence in the regional-compliance audit folder.',
      ],
      artefacts: [
        'au-aie-mapping.json',
        'human-centred-design.json',
        'fairness-evals.ndjson',
      ],
      tags: ['au-aie', 'australia', 'ethics'],
    },
    secondary: {
      slug: 'au-accountability',
      title: 'Australia AI Ethics: Accountability evidence',
      controlIds: ['AU-AIE-Accountability'],
      severity: 'LOW',
      source: 'IN-HOUSE',
      steps: [
        'Document accountability roles per AU AI Ethics Principle 8.',
        'Capture decision-owner sign-offs.',
        'Attach grievance-handling records.',
        'File accountability evidence in the regional-compliance audit folder.',
      ],
      artefacts: [
        'accountability-roles.json',
        'decision-signoffs.ndjson',
        'grievance-records.json',
      ],
      tags: ['au-aie', 'australia', 'accountability'],
    },
  },
  {
    frameworkId: 'iso-27001-ai',
    primary: {
      slug: 'isms-ai',
      title: 'ISO/IEC 27001 ISMS AI Extension evidence',
      controlIds: ['Cl.6.1.2'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Document ISMS scope including AI assets.',
        'Capture AI-specific risk treatments.',
        'Attach Statement of Applicability with AI controls highlighted.',
        'File ISMS-AI evidence in the ISO 27001 audit folder.',
      ],
      artefacts: [
        'isms-scope-ai.md',
        'ai-risk-treatments.json',
        'soa-ai-controls.json',
      ],
      tags: ['iso-27001-ai', 'isms', 'risk-treatment'],
    },
    secondary: {
      slug: 'annex-a-ops',
      title: 'ISO/IEC 27001 Annex A Operations Security — AI extension',
      controlIds: ['A.12.1', 'A.12.2'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Apply Annex A operational-security controls to AI workloads.',
        'Capture change-management records for AI deployments.',
        'Attach malware-protection scans of training pipelines.',
        'File ops-security evidence in the ISO 27001 audit folder.',
      ],
      artefacts: [
        'change-mgmt-ai.ndjson',
        'training-pipeline-scans.json',
        'ops-security-controls.json',
      ],
      tags: ['iso-27001-ai', 'operations', 'annex-a'],
    },
  },
  {
    frameworkId: 'owasp-asvs',
    primary: {
      slug: 'asvs-auth',
      title: 'OWASP ASVS V2: Authentication Verification — LLM API ingress',
      controlIds: ['V2.1', 'V2.2'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      secondaryFrameworkId: 'owasp-api',
      steps: [
        'Verify ASVS V2 authentication controls on LLM API endpoints.',
        'Capture session-token rotation evidence.',
        'Attach MFA enforcement records for admin actions.',
        'File auth evidence in the ASVS audit folder.',
      ],
      artefacts: [
        'asvs-v2-controls.json',
        'token-rotation.ndjson',
        'mfa-enforcement.json',
      ],
      tags: ['owasp-asvs', 'authentication', 'api'],
    },
    secondary: {
      slug: 'asvs-session',
      title: 'OWASP ASVS V3: Session Management evidence',
      controlIds: ['V3.1'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Verify ASVS V3 session-management controls.',
        'Capture session-timeout + concurrent-session policies.',
        'Attach revocation evidence for compromised sessions.',
        'File session evidence in the ASVS audit folder.',
      ],
      artefacts: [
        'session-policies.json',
        'session-timeout-config.json',
        'revocation-records.ndjson',
      ],
      tags: ['owasp-asvs', 'session'],
    },
  },
  {
    frameworkId: 'owasp-api',
    primary: {
      slug: 'api1-bola',
      title: 'OWASP API1: Broken Object Level Authorization on LLM endpoints',
      controlIds: ['API1'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Audit LLM API endpoints for object-level authorisation.',
        'Capture per-tenant access-isolation evidence.',
        'Attach BOLA test results.',
        'File API1 evidence in the OWASP API audit folder.',
      ],
      artefacts: [
        'bola-audit.json',
        'tenant-isolation.json',
        'bola-test-results.ndjson',
      ],
      tags: ['owasp-api', 'bola', 'authorization'],
    },
    secondary: {
      slug: 'api2-broken-auth',
      title: 'OWASP API2: Broken Authentication on LLM endpoints — token theft mitigation',
      controlIds: ['API2'],
      severity: 'CRITICAL',
      source: 'IN-HOUSE',
      secondaryFrameworkId: 'owasp-asvs',
      steps: [
        'Audit LLM API authentication for token theft + replay vulnerabilities.',
        'Capture rate-limiting + anomaly-detection signals.',
        'Attach response to detected credential abuse.',
        'File API2 evidence in the OWASP API audit folder.',
      ],
      artefacts: [
        'auth-audit.json',
        'rate-limiting-signals.ndjson',
        'credential-abuse-response.json',
      ],
      tags: ['owasp-api', 'authentication', 'critical'],
    },
  },
  {
    frameworkId: 'nist-800-53-ai',
    primary: {
      slug: 'ac-family',
      title: 'NIST SP 800-53 AC family: AI access-control evidence',
      controlIds: ['AC-2', 'AC-6'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Apply 800-53 AC-2 + AC-6 to AI admin + operator roles.',
        'Capture least-privilege role configurations.',
        'Attach periodic access reviews.',
        'File AC evidence in the 800-53 AI audit folder.',
      ],
      artefacts: [
        'ac-2-roles.json',
        'least-privilege-config.json',
        'access-reviews.ndjson',
      ],
      tags: ['nist-800-53-ai', 'access-control'],
    },
    secondary: {
      slug: 'si-family',
      title: 'NIST SP 800-53 SI family: AI system + information integrity',
      controlIds: ['SI-3', 'SI-7'],
      severity: 'MEDIUM',
      source: 'IN-HOUSE',
      steps: [
        'Apply 800-53 SI-3 (malware) + SI-7 (integrity) to AI artefacts.',
        'Capture integrity-monitoring + scanning evidence.',
        'Attach incident reports + remediation.',
        'File SI evidence in the 800-53 AI audit folder.',
      ],
      artefacts: [
        'si-monitoring.json',
        'integrity-scans.ndjson',
        'incident-reports.json',
      ],
      tags: ['nist-800-53-ai', 'integrity'],
    },
  },
  {
    frameworkId: 'gdpr-ai',
    primary: {
      slug: 'art-22-automated',
      title: 'GDPR Art. 22: Automated Decision-Making evidence',
      controlIds: ['Art.22'],
      severity: 'CRITICAL',
      source: 'IN-HOUSE',
      steps: [
        'Identify all GDPR Art. 22 in-scope AI systems making automated decisions.',
        'Capture human-review intervention records.',
        'Attach data-subject right-to-explanation responses.',
        'File Art. 22 evidence in the GDPR audit folder.',
      ],
      artefacts: [
        'art-22-inventory.json',
        'human-review-records.ndjson',
        'right-to-explanation.json',
      ],
      tags: ['gdpr-ai', 'art-22', 'automated-decisions', 'critical'],
    },
    secondary: {
      slug: 'art-35-dpia',
      title: 'GDPR Art. 35: Data Protection Impact Assessment for AI',
      controlIds: ['Art.35'],
      severity: 'HIGH',
      source: 'IN-HOUSE',
      steps: [
        'Run GDPR Art. 35 DPIAs for high-risk AI processing.',
        'Capture risk + mitigation analysis.',
        'Attach DPO consultation records.',
        'File DPIA evidence in the GDPR audit folder.',
      ],
      artefacts: [
        'dpia-reports.json',
        'risk-mitigation.json',
        'dpo-consultation.ndjson',
      ],
      tags: ['gdpr-ai', 'dpia', 'art-35'],
    },
  },
] as const satisfies ReadonlyArray<FrameworkTheme>)

// ---------------------------------------------------------------------------
// Compile theme spec → AiPackEvidenceTemplate[]
// ---------------------------------------------------------------------------

function buildTemplate(
  theme: FrameworkTheme,
  part: 'primary' | 'secondary',
): AiPackEvidenceTemplate {
  const spec = theme[part]
  const cross = spec.secondaryFrameworkId
  const frameworkIds: ReadonlyArray<AiComplianceFrameworkId> = cross
    ? [theme.frameworkId, cross]
    : [theme.frameworkId]
  return Object.freeze({
    id: `aipack-${theme.frameworkId}-${spec.slug}`,
    name: spec.title,
    frameworkIds: Object.freeze([...frameworkIds]),
    controlIds: Object.freeze([...spec.controlIds]),
    severity: spec.severity,
    collectionSteps: Object.freeze([...spec.steps]),
    expectedArtefacts: Object.freeze([...spec.artefacts]),
    tags: Object.freeze([...spec.tags]),
    source: spec.source,
    sourceRef: SOURCE_REF_URLS[spec.source],
  })
}

/**
 * Compile-time exhaustiveness gate: every `AiComplianceFrameworkId`
 * MUST appear as a `frameworkId` on at least one entry in
 * `AI_PACK_FRAMEWORK_THEMES`. If a framework is added to
 * `ALL_FRAMEWORKS` (in `bu-tpi/compliance/frameworks.ts`) without
 * a corresponding theme entry, the compile fails here rather than
 * relying on BUS-AI-002 to catch it at test time.
 *
 * Implementation: extract the union of all themed framework ids and
 * assert bidirectional subset relationship with `AiComplianceFrameworkId`.
 */
type ThemedFrameworkIds = (typeof AI_PACK_FRAMEWORK_THEMES)[number]['frameworkId']
// Tuple-wrap [T] extends [U] disables conditional-type distribution
// over unions — without it, the conditional resolves per-member of
// `AiComplianceFrameworkId` and the resulting type is a union that
// trivially admits `true`, defeating the gate.
type _ExhaustivenessOk =
  [AiComplianceFrameworkId] extends [ThemedFrameworkIds]
    ? [ThemedFrameworkIds] extends [AiComplianceFrameworkId]
      ? true
      : ['unexpected extra ids in AI_PACK_FRAMEWORK_THEMES']
    : ['missing framework ids in AI_PACK_FRAMEWORK_THEMES']
const _AI_PACK_THEMES_EXHAUSTIVE: _ExhaustivenessOk = true
void _AI_PACK_THEMES_EXHAUSTIVE

/**
 * The bundled AI Pack evidence template corpus — 54 templates
 * (= 2 × 27 frameworks). Per-framework count ≥ 2 per master checklist
 * invariant; CRITICAL severity coverage for prompt-injection-class
 * templates (one per framework whose theme set marks
 * `promptInjection: true`).
 */
export const DEFAULT_AI_PACK_EVIDENCE_TEMPLATES: ReadonlyArray<AiPackEvidenceTemplate> =
  Object.freeze(
    AI_PACK_FRAMEWORK_THEMES.flatMap((theme) => [
      buildTemplate(theme, 'primary'),
      buildTemplate(theme, 'secondary'),
    ]),
  )

/**
 * Derived set of framework ids whose theme spec marks at least one
 * part with `promptInjection: true`. Used by BUS-AI-004 to assert
 * CRITICAL severity coverage; deriving rather than hard-coding keeps
 * the test self-updating when new prompt-injection-class entries are
 * added.
 */
export const PROMPT_INJECTION_FRAMEWORK_IDS: ReadonlyArray<AiComplianceFrameworkId> =
  Object.freeze(
    AI_PACK_FRAMEWORK_THEMES.filter((t) => {
      // `as const` on the theme array narrows each entry to a literal
      // discriminated-union member, where `promptInjection` only exists
      // on entries that explicitly set it. Cast to the wider `ThemePart`
      // interface so the property access is type-safe across all
      // members (absent property → undefined → falsy).
      const primary: ThemePart = t.primary
      const secondary: ThemePart = t.secondary
      return primary.promptInjection === true || secondary.promptInjection === true
    }).map((t) => t.frameworkId),
  )

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Return all AI Pack evidence templates whose `frameworkIds` includes
 * the given framework id (covers both primary and cross-referenced
 * secondary entries).
 */
export function evidenceTemplatesForAiFramework(
  id: AiComplianceFrameworkId,
): ReadonlyArray<AiPackEvidenceTemplate> {
  return DEFAULT_AI_PACK_EVIDENCE_TEMPLATES.filter((e) => e.frameworkIds.includes(id))
}

/**
 * Validate the closed-enum of all 27 AI Pack framework ids — used by
 * tests to assert per-framework coverage. Single source-of-truth is
 * `ALL_FRAMEWORKS` in `bu-tpi/compliance/frameworks.ts`. Type flows
 * structurally — `f.id` is already `AiComplianceFrameworkId` so no cast.
 */
export const AI_PACK_FRAMEWORK_IDS: ReadonlyArray<AiComplianceFrameworkId> =
  Object.freeze(ALL_FRAMEWORKS.map((f) => f.id))
