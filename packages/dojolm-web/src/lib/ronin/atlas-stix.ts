// SPDX-License-Identifier: Apache-2.0
/**
 * File: atlas-stix.ts
 * Purpose: Wave 8.3 / ADR-0076 — parse the MITRE ATLAS STIX 2.1
 *          bundle and resolve tactic / technique / mitigation
 *          relationships for each case study.
 *
 * Story: WAVE8-I-ATLAS-STIX.
 *
 * The pre-Wave-8.3 adapter consumed `case-studies.json`, a flat list
 * with `tactics: string[]` and `techniques: string[]`. MITRE has since
 * migrated ATLAS content to a STIX 2.1 bundle keyed by SDO `id`
 * (`attack-pattern--...`, `x-mitre-tactic--...`, `course-of-action--...`,
 * `x-mitre-atlas-case-study--...`) and connected by `relationship`
 * SDOs (`relationship_type: 'uses' | 'mitigates'`).
 *
 * This module:
 * 1. Parses the raw bundle into an index keyed by SDO id.
 * 2. Walks the relationship graph for each case study to collect:
 *    - `atlasTechniqueIds`: technique external ids (AML.T####)
 *    - `atlasTacticIds`: unique tactic ids (AML.TA####) reachable from
 *      those techniques via `kill_chain_phases` or direct relationships.
 *    - `atlasMitigationIds`: mitigation ids (AML.M####) that mitigate
 *      any reached technique.
 * 3. Emits `IntelligenceEntryRecord[]` preserving the existing ATLAS
 *    record shape (same id prefix, same severity, same source label).
 */

import type {
  IntelligenceEntryRecord,
  IntelligenceTypedReference,
} from './fixtures'

// ---------------------------------------------------------------------------
// STIX 2.1 type surface — only the subset we read
// ---------------------------------------------------------------------------

export interface StixExternalReference {
  readonly source_name?: string
  readonly external_id?: string
  readonly url?: string
}

export interface StixKillChainPhase {
  readonly kill_chain_name?: string
  readonly phase_name?: string
}

export interface StixSdo {
  readonly id: string
  readonly type: string
  readonly name?: string
  readonly description?: string
  readonly external_references?: readonly StixExternalReference[]
  readonly kill_chain_phases?: readonly StixKillChainPhase[]
  readonly created?: string
  readonly modified?: string
  readonly x_mitre_report_urls?: readonly string[]
  readonly x_mitre_report_date?: string
}

export interface StixRelationship extends StixSdo {
  readonly type: 'relationship'
  readonly relationship_type: string
  readonly source_ref: string
  readonly target_ref: string
}

export interface StixBundle {
  readonly type?: string
  readonly id?: string
  readonly objects?: readonly (StixSdo | StixRelationship)[]
}

// ---------------------------------------------------------------------------
// Index built from the bundle
// ---------------------------------------------------------------------------

export interface AtlasStixIndex {
  readonly byId: ReadonlyMap<string, StixSdo>
  readonly relationships: readonly StixRelationship[]
  readonly caseStudies: readonly StixSdo[]
  /** Pre-computed tactic lookup keyed by slugified name.
   *  Avoids an O(n) scan of byId on every technique resolution. */
  readonly tacticBySlug: ReadonlyMap<string, StixSdo>
}

// ---------------------------------------------------------------------------
// External-id extraction
// ---------------------------------------------------------------------------

const ATLAS_SOURCE_NAMES = new Set(['mitre-atlas', 'atlas', 'x-mitre-atlas'])

function atlasExternalId(sdo: StixSdo): string | null {
  for (const ref of sdo.external_references ?? []) {
    const source = typeof ref.source_name === 'string'
      ? ref.source_name.toLowerCase()
      : ''
    if (ATLAS_SOURCE_NAMES.has(source)
        && typeof ref.external_id === 'string'
        && ref.external_id.trim().length > 0) {
      return ref.external_id.trim()
    }
  }
  return null
}

function atlasReferenceUrls(sdo: StixSdo): string[] {
  const urls: string[] = []
  for (const ref of sdo.external_references ?? []) {
    if (typeof ref.url === 'string' && ref.url.startsWith('https://')) {
      urls.push(ref.url)
    }
  }
  for (const url of sdo.x_mitre_report_urls ?? []) {
    if (typeof url === 'string' && url.startsWith('https://')) {
      urls.push(url)
    }
  }
  return Array.from(new Set(urls)).slice(0, 10)
}

// ---------------------------------------------------------------------------
// Bundle parser
// ---------------------------------------------------------------------------

function slugifyTacticName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function parseAtlasStixBundle(bundle: StixBundle): AtlasStixIndex {
  const byId = new Map<string, StixSdo>()
  const relationships: StixRelationship[] = []
  const caseStudies: StixSdo[] = []
  const tacticBySlug = new Map<string, StixSdo>()
  for (const obj of bundle.objects ?? []) {
    if (!obj || typeof obj.id !== 'string' || typeof obj.type !== 'string') {
      continue
    }
    byId.set(obj.id, obj)
    if (obj.type === 'relationship') {
      const rel = obj as StixRelationship
      if (typeof rel.relationship_type === 'string'
          && typeof rel.source_ref === 'string'
          && typeof rel.target_ref === 'string') {
        relationships.push(rel)
      }
    } else if (obj.type === 'x-mitre-atlas-case-study') {
      caseStudies.push(obj)
    } else if (obj.type === 'x-mitre-tactic' && typeof obj.name === 'string') {
      tacticBySlug.set(slugifyTacticName(obj.name), obj)
    }
  }
  return {
    byId,
    relationships,
    caseStudies,
    tacticBySlug,
  }
}

// ---------------------------------------------------------------------------
// Per-case-study resolution
// ---------------------------------------------------------------------------

interface ResolvedRelationships {
  readonly techniques: readonly string[]
  readonly tactics: readonly string[]
  readonly mitigations: readonly string[]
}

function resolveTechniquesForCaseStudy(
  caseStudyId: string,
  index: AtlasStixIndex,
): readonly StixSdo[] {
  const out: StixSdo[] = []
  for (const rel of index.relationships) {
    if (rel.source_ref !== caseStudyId) continue
    if (rel.relationship_type !== 'uses') continue
    const target = index.byId.get(rel.target_ref)
    if (target && target.type === 'attack-pattern') {
      out.push(target)
    }
  }
  return out
}

function resolveTacticIdsFromTechniques(
  techniques: readonly StixSdo[],
  index: AtlasStixIndex,
): readonly string[] {
  const acc = new Set<string>()
  for (const tech of techniques) {
    for (const phase of tech.kill_chain_phases ?? []) {
      // Scope guard: only consider ATLAS kill-chain phases; an ATT&CK
      // phase inside a multi-framework bundle must not contribute.
      const chain = typeof phase.kill_chain_name === 'string'
        ? phase.kill_chain_name.toLowerCase()
        : ''
      if (chain && !chain.includes('atlas')) continue
      const name = typeof phase.phase_name === 'string' ? phase.phase_name : ''
      if (!name) continue
      // O(1) lookup via the slug index built in parseAtlasStixBundle.
      const shortName = name.toLowerCase()
      const tacticSdo = index.tacticBySlug.get(shortName)
      if (!tacticSdo) continue
      const id = atlasExternalId(tacticSdo)
      if (id) acc.add(id)
    }
  }
  return Array.from(acc).slice(0, 20)
}

function resolveMitigationIdsForTechniques(
  techniques: readonly StixSdo[],
  index: AtlasStixIndex,
): readonly string[] {
  const techniqueIds = new Set(techniques.map((t) => t.id))
  const acc = new Set<string>()
  for (const rel of index.relationships) {
    if (rel.relationship_type !== 'mitigates') continue
    if (!techniqueIds.has(rel.target_ref)) continue
    const mitigation = index.byId.get(rel.source_ref)
    if (!mitigation || mitigation.type !== 'course-of-action') continue
    const extId = atlasExternalId(mitigation)
    if (extId) acc.add(extId)
  }
  return Array.from(acc).slice(0, 20)
}

function resolveAtlasRelations(
  caseStudy: StixSdo,
  index: AtlasStixIndex,
): ResolvedRelationships {
  const techniques = resolveTechniquesForCaseStudy(caseStudy.id, index)
  const techniqueIds = Array.from(
    new Set(
      techniques
        .map((t) => atlasExternalId(t))
        .filter((id): id is string => id !== null),
    ),
  ).slice(0, 20)
  const tacticIds = resolveTacticIdsFromTechniques(techniques, index)
  const mitigationIds = resolveMitigationIdsForTechniques(techniques, index)
  return {
    techniques: techniqueIds,
    tactics: tacticIds,
    mitigations: mitigationIds,
  }
}

// ---------------------------------------------------------------------------
// Case-study → IntelligenceEntryRecord
// ---------------------------------------------------------------------------

function caseStudyExternalId(sdo: StixSdo): string {
  return atlasExternalId(sdo) ?? sdo.id
}

function caseStudyPublishedAt(sdo: StixSdo): string {
  const raw = sdo.x_mitre_report_date ?? sdo.created ?? sdo.modified ?? '1970-01-01'
  return raw.slice(0, 10)
}

export function caseStudyToIntelRecord(
  caseStudy: StixSdo,
  index: AtlasStixIndex,
): IntelligenceEntryRecord {
  const relations = resolveAtlasRelations(caseStudy, index)
  const extId = caseStudyExternalId(caseStudy)
  const references = atlasReferenceUrls(caseStudy)
  const referenceTypes: IntelligenceTypedReference[] = references.map((url) => ({
    url,
    type: 'writeup' as const,
  }))
  const tags = Array.from(new Set<string>([
    'ai-incident', 'mitre-atlas', 'adversarial-ai', 'stix',
    ...relations.tactics, ...relations.techniques,
  ])).slice(0, 20)
  const title = (caseStudy.name ?? extId).slice(0, 200)
  const summary = (caseStudy.description ?? caseStudy.name ?? extId).slice(0, 1_000)
  return {
    id: `ATLAS-${extId}`,
    type: 'ai-incident',
    title,
    summary,
    severity: 'INFO',
    source: 'MITRE ATLAS',
    publishedAt: caseStudyPublishedAt(caseStudy),
    references,
    tags,
    ...(relations.tactics.length > 0 ? { atlasTacticIds: relations.tactics } : {}),
    ...(relations.techniques.length > 0 ? { atlasTechniqueIds: relations.techniques } : {}),
    ...(relations.mitigations.length > 0 ? { atlasMitigationIds: relations.mitigations } : {}),
    ...(referenceTypes.length > 0 ? { referenceTypes } : {}),
  }
}

export function stixBundleToIntelRecords(
  bundle: StixBundle,
): IntelligenceEntryRecord[] {
  const index = parseAtlasStixBundle(bundle)
  return index.caseStudies.map((cs) => caseStudyToIntelRecord(cs, index))
}
