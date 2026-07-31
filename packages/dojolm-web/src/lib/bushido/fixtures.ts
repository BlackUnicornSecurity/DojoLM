// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixtures.ts
 * Purpose: Wave 8.9 / ADR-0081 — bundled Bushido Book corpus.
 *          8 compliance frameworks + 50 control mappings per
 *          framework (400 total) + 30 evidence templates.
 *          Closes ADR-0071 §3.
 *
 * Story: WAVE8-BUSHIDO-FRAMEWORK-CORPUS / ADR-0071 Theme B §3.
 *
 * BU id convention: `<framework>-bushido-<shortname>-<seq>`.
 * Every rule-to-control mapping references at least one fictional
 * LLM in its rationale.
 */

import { ALL_FRAMEWORKS } from 'bu-tpi/compliance'

export type BushidoSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export type BushidoFrameworkId =
  | 'NIST-SP-800-53'
  | 'ISO-27001'
  | 'SOC2'
  | 'HIPAA'
  | 'GDPR'
  | 'FedRAMP'
  | 'EU-AI-Act'
  | 'BU-Internal'

/**
 * ADR-0095 §5 — Bushido AI Pack 27-id closed enum, derived `as const` from
 * `ALL_FRAMEWORKS` in `bu-tpi/compliance/frameworks.ts`. SOURCE-OF-TRUTH is
 * the AI Pack engine; this derivation is a runtime-free type alias so the
 * dual-corpus surface (Reference 8-id vs AI Pack 27-id) exposes both
 * taxonomies without drift.
 *
 * Disjoint from `BushidoFrameworkId` (8-id Reference taxonomy per ADR-0081);
 * BUS-020 contract test pins the disjointness.
 */
export type AiComplianceFrameworkId = (typeof ALL_FRAMEWORKS)[number]['id']

export interface BushidoFramework {
  readonly id: BushidoFrameworkId
  readonly name: string
  readonly version: string
  readonly description: string
  readonly jurisdiction: string
  readonly tags: readonly string[]
}

export interface BushidoControlMapping {
  readonly id: string
  readonly frameworkId: BushidoFrameworkId
  readonly controlId: string
  readonly ruleId: string
  readonly severity: BushidoSeverity
  readonly rationale: string
  readonly tags: readonly string[]
}

export interface BushidoEvidenceTemplate {
  readonly id: string
  readonly name: string
  readonly frameworkIds: readonly BushidoFrameworkId[]
  readonly controlIds: readonly string[]
  readonly severity: BushidoSeverity
  readonly collectionSteps: readonly string[]
  readonly expectedArtefacts: readonly string[]
  readonly tags: readonly string[]
}

export const DEFAULT_BUSHIDO_FRAMEWORKS: readonly BushidoFramework[] = [
  { id: 'NIST-SP-800-53', name: 'NIST SP 800-53 Rev. 5', version: 'Rev. 5', description: 'Security and privacy controls for federal information systems.', jurisdiction: 'US federal', tags: ['security', 'privacy', 'federal'] },
  { id: 'ISO-27001', name: 'ISO/IEC 27001:2022', version: '2022', description: 'Information security management system requirements.', jurisdiction: 'international', tags: ['isms', 'international'] },
  { id: 'SOC2', name: 'AICPA SOC 2 Trust Services Criteria', version: '2022', description: 'Trust services criteria for service organisations.', jurisdiction: 'US private sector', tags: ['trust', 'soc'] },
  { id: 'HIPAA', name: 'HIPAA Security & Privacy Rules', version: '45 CFR 164', description: 'Protected health information security + privacy.', jurisdiction: 'US healthcare', tags: ['phi', 'healthcare'] },
  { id: 'GDPR', name: 'EU General Data Protection Regulation', version: '2016/679', description: 'Data protection and privacy for EU residents.', jurisdiction: 'EU', tags: ['privacy', 'eu'] },
  { id: 'FedRAMP', name: 'FedRAMP Moderate Baseline', version: 'Rev. 5', description: 'Cloud service provider controls for US federal deployments.', jurisdiction: 'US federal cloud', tags: ['cloud', 'federal'] },
  { id: 'EU-AI-Act', name: 'EU AI Act', version: '2024', description: 'Risk-tiered regulation of artificial intelligence systems.', jurisdiction: 'EU', tags: ['ai', 'risk-tier'] },
  { id: 'BU-Internal', name: 'BlackUnicorn Internal Compliance', version: '1.x', description: 'BU-authored compliance rule-set covering LLM security practices.', jurisdiction: 'internal', tags: ['internal', 'BU'] },
] as const

// ---------------------------------------------------------------------------
// Programmatic mapping generation — 50 per framework × 8 = 400 total
// ---------------------------------------------------------------------------

const FICTIONAL_LLMS = ['DojoLM', 'BonkLM', 'Basileak', 'PantheonLM', 'Marfaak'] as const

const CONTROL_FAMILIES_BY_FRAMEWORK: Record<BushidoFrameworkId, readonly string[]> = {
  'NIST-SP-800-53': ['AC', 'AU', 'CA', 'CM', 'IA', 'IR', 'RA', 'SC', 'SI', 'CP'],
  'ISO-27001': ['A.5', 'A.6', 'A.7', 'A.8', 'A.12', 'A.13', 'A.14', 'A.16', 'A.17', 'A.18'],
  'SOC2': ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9', 'A1'],
  'HIPAA': ['164.308', '164.310', '164.312', '164.314', '164.316', '164.502', '164.504', '164.506', '164.512', '164.524'],
  'GDPR': ['Art.5', 'Art.6', 'Art.12', 'Art.15', 'Art.17', 'Art.25', 'Art.28', 'Art.32', 'Art.33', 'Art.35'],
  'FedRAMP': ['AC', 'AU', 'CM', 'IA', 'IR', 'RA', 'SC', 'SI', 'CP', 'SA'],
  'EU-AI-Act': ['Art.9', 'Art.10', 'Art.12', 'Art.13', 'Art.14', 'Art.15', 'Art.16', 'Art.17', 'Art.50', 'Art.52'],
  'BU-Internal': ['BU-SEC', 'BU-PRIV', 'BU-AI', 'BU-OPS', 'BU-VULN', 'BU-MON', 'BU-ACCESS', 'BU-DATA', 'BU-TEST', 'BU-RESP'],
}

const SEVERITY_CYCLE: readonly BushidoSeverity[] = [
  'CRITICAL', 'HIGH', 'HIGH', 'MEDIUM', 'MEDIUM', 'MEDIUM',
  'LOW', 'LOW', 'LOW', 'INFO',
]

function frameworkSlug(id: BushidoFrameworkId): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '-')
}

function buildMappings(): readonly BushidoControlMapping[] {
  const out: BushidoControlMapping[] = []
  let seq = 1
  for (const framework of DEFAULT_BUSHIDO_FRAMEWORKS) {
    const families = CONTROL_FAMILIES_BY_FRAMEWORK[framework.id]
    for (let i = 0; i < 50; i++) {
      const family = families[i % families.length]
      const controlNumber = String(1 + Math.floor(i / families.length)).padStart(2, '0')
      const llm = FICTIONAL_LLMS[i % FICTIONAL_LLMS.length]
      const severity = SEVERITY_CYCLE[i % SEVERITY_CYCLE.length]
      const ruleId = `rule-${frameworkSlug(framework.id)}-${String(i + 1).padStart(3, '0')}`
      const controlId = `${family}-${controlNumber}`
      const id = `${frameworkSlug(framework.id)}-bushido-map-${String(seq).padStart(3, '0')}`
      out.push({
        id,
        frameworkId: framework.id,
        controlId,
        ruleId,
        severity,
        rationale: `${llm} enforces ${controlId} in ${framework.name} via Kotoba rule ${ruleId}.`,
        tags: [frameworkSlug(framework.id), llm.toLowerCase(), family.toLowerCase()],
      })
      seq += 1
    }
  }
  return out
}

export const DEFAULT_BUSHIDO_MAPPINGS: readonly BushidoControlMapping[] = buildMappings()

// ---------------------------------------------------------------------------
// Evidence templates — 30 cross-framework playbooks
// ---------------------------------------------------------------------------

export const DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES: readonly BushidoEvidenceTemplate[] = Array.from(
  { length: 30 },
  (_, i): BushidoEvidenceTemplate => {
    const target = FICTIONAL_LLMS[i % FICTIONAL_LLMS.length]
    const framework = DEFAULT_BUSHIDO_FRAMEWORKS[i % DEFAULT_BUSHIDO_FRAMEWORKS.length]
    const secondaryFramework = DEFAULT_BUSHIDO_FRAMEWORKS[(i + 3) % DEFAULT_BUSHIDO_FRAMEWORKS.length]
    const severity = SEVERITY_CYCLE[i % SEVERITY_CYCLE.length]
    const family = CONTROL_FAMILIES_BY_FRAMEWORK[framework.id][i % CONTROL_FAMILIES_BY_FRAMEWORK[framework.id].length]
    const seq = String(i + 1).padStart(3, '0')
    const primaryControl = `${family}-0${(i % 9) + 1}`
    const secondaryFamily = CONTROL_FAMILIES_BY_FRAMEWORK[secondaryFramework.id][
      (i + 2) % CONTROL_FAMILIES_BY_FRAMEWORK[secondaryFramework.id].length
    ]
    const secondaryControl = `${secondaryFamily}-0${((i + 2) % 9) + 1}`
    return {
      id: `${target.toLowerCase()}-bushido-evidence-${seq}`,
      name: `${target} × ${framework.name}: ${primaryControl}`,
      frameworkIds: [framework.id, secondaryFramework.id],
      controlIds: [primaryControl, secondaryControl],
      severity,
      collectionSteps: [
        `Export ${target} policy ruleset for ${framework.name}.`,
        `Capture Kotoba scoring log for the last 30 days.`,
        `Attach SAGE quarantine and mutation snapshots tagged ${target.toLowerCase()}.`,
        `File the bundle in the ${framework.id} audit evidence folder.`,
      ],
      expectedArtefacts: [
        `${target.toLowerCase()}-policy-${frameworkSlug(framework.id)}-${seq}.json`,
        `${target.toLowerCase()}-kotoba-${frameworkSlug(framework.id)}-${seq}.ndjson`,
        `${target.toLowerCase()}-sage-${frameworkSlug(framework.id)}-${seq}.tgz`,
      ],
      tags: [frameworkSlug(framework.id), target.toLowerCase(), 'evidence'],
    }
  },
)

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function mappingsForFramework(
  id: BushidoFrameworkId,
): readonly BushidoControlMapping[] {
  return DEFAULT_BUSHIDO_MAPPINGS.filter((m) => m.frameworkId === id)
}

export function evidenceTemplatesForFramework(
  id: BushidoFrameworkId,
): readonly BushidoEvidenceTemplate[] {
  return DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES.filter((e) => e.frameworkIds.includes(id))
}
