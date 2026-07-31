// SPDX-License-Identifier: Apache-2.0
/**
 * File: intel-sources.ts
 * Purpose: Source adapters for the Ronin intelligence ingest pipeline.
 *          Each source exposes `fetchEntries()` that returns a list of
 *          `IntelligenceEntryRecord`s ready to be merged into the
 *          on-disk store. Adapters live behind the SSRF-safe
 *          `fetchIntelJson` wrapper and never touch the network
 *          directly.
 *
 * Story: WAVE3-INTEL-INGEST / ADR-0026.
 *
 * Two sources ship in this iteration:
 *   - NVD (National Vulnerability Database) — CVE feed via REST API 2.0
 *     https://services.nvd.nist.gov/rest/json/cves/2.0
 *   - AIID (AI Incident Database) — incident feed via the AIID API
 *     https://incidentdatabase.ai/api/incidents
 *
 * Adapters are pure functions over the upstream JSON. HTTP is injected
 * so tests can mock the fetcher without touching the network.
 */

import type {
  IntelligenceAffectedProduct,
  IntelligenceEntryRecord,
  IntelligenceReferenceType,
  IntelligenceTypedReference,
} from './fixtures'
import { fetchIntelJson } from './intel-http'

// ---------------------------------------------------------------------------
// Wave 8.1 / ADR-0074 — shared helpers for typed structured fields.
// ---------------------------------------------------------------------------

const REFERENCE_TAG_MAP: Record<string, IntelligenceReferenceType> = {
  'Patch': 'patch',
  'Mitigation': 'mitigation',
  'Exploit': 'exploit',
  'Vendor Advisory': 'advisory',
  'Third Party Advisory': 'advisory',
  'VDB Entry': 'advisory',
  'US Government Resource': 'advisory',
  'Press/Media Coverage': 'writeup',
  'Technical Description': 'writeup',
}

function inferReferenceType(
  url: string,
  upstreamTags: readonly string[] | undefined,
): IntelligenceReferenceType {
  for (const tag of upstreamTags ?? []) {
    const mapped = REFERENCE_TAG_MAP[tag]
    if (mapped) return mapped
  }
  const lower = url.toLowerCase()
  if (lower.includes('exploit-db') || lower.includes('/exploit')) return 'exploit'
  if (lower.includes('patch') || lower.includes('security-advisories')) return 'patch'
  if (lower.includes('blog') || lower.includes('/post') || lower.includes('writeup')) {
    return 'writeup'
  }
  if (lower.includes('advisory') || lower.includes('nvd.nist.gov')) return 'advisory'
  return 'advisory'
}

function buildTypedReferences(
  entries: readonly { url?: string; tags?: readonly string[] }[],
): IntelligenceTypedReference[] {
  // Carry tags through the filter+slice chain — mapping a reindexed
  // URL array against the original entries array silently misclassifies
  // tags whenever any upstream entry is filtered out.
  return entries
    .filter((r): r is { url: string; tags?: readonly string[] } =>
      typeof r.url === 'string' && r.url.startsWith('https://'))
    .slice(0, 10)
    .map((r) => ({ url: r.url, type: inferReferenceType(r.url, r.tags) }))
}

function parseCpeCriteria(cpe: string): IntelligenceAffectedProduct | null {
  // CPE 2.3 format: cpe:2.3:<part>:<vendor>:<product>:<version>:<update>:...
  if (!cpe.startsWith('cpe:2.3:')) return null
  const parts = cpe.split(':')
  if (parts.length < 6) return null
  const vendor = parts[3]
  const product = parts[4]
  const version = parts[5]
  if (!vendor || vendor === '*' || !product || product === '*') return null
  const vp: IntelligenceAffectedProduct = {
    vendor,
    product,
    ...(version && version !== '*' ? { versions: version } : {}),
  }
  return vp
}

export interface IntelSource {
  readonly id: string
  fetchEntries(ctx: IntelFetchContext): Promise<IntelligenceEntryRecord[]>
}

export interface IntelFetchContext {
  readonly fetcher: <T>(url: string) => Promise<T>
  readonly now: Date
  readonly sinceDays: number
  /** ADR-0038 — last-known publishedAt for this source's prior
   *  successful fetch. When set, adapters that support cursored
   *  polling should request only entries newer than this timestamp.
   *  Adapters MAY ignore the cursor (e.g., catalogue-style feeds
   *  that always return the full snapshot). When `undefined` the
   *  adapter falls back to the `sinceDays` window. */
  readonly cursor?: string
}

// ---------------------------------------------------------------------------
// NVD — CVE feed
// ---------------------------------------------------------------------------

interface NvdMetric {
  readonly cvssData?: {
    readonly baseSeverity?: string
    readonly baseScore?: number
    readonly vectorString?: string
  }
}

interface NvdDescription {
  readonly lang: string
  readonly value: string
}

interface NvdReference {
  readonly url: string
  readonly tags?: readonly string[]
}

interface NvdWeakness {
  readonly description?: readonly NvdDescription[]
}

interface NvdCpeMatch {
  readonly criteria?: string
  readonly vulnerable?: boolean
}

interface NvdConfigNode {
  readonly cpeMatch?: readonly NvdCpeMatch[]
}

interface NvdConfiguration {
  readonly nodes?: readonly NvdConfigNode[]
}

interface NvdCve {
  readonly id: string
  readonly published: string
  readonly descriptions: readonly NvdDescription[]
  readonly references: readonly NvdReference[]
  readonly weaknesses?: readonly NvdWeakness[]
  readonly configurations?: readonly NvdConfiguration[]
  readonly metrics?: {
    readonly cvssMetricV31?: readonly NvdMetric[]
    readonly cvssMetricV30?: readonly NvdMetric[]
    readonly cvssMetricV2?: readonly NvdMetric[]
  }
}

interface NvdApiResponse {
  readonly vulnerabilities?: readonly { readonly cve: NvdCve }[]
}

function nvdSeverity(cve: NvdCve): IntelligenceEntryRecord['severity'] {
  const metrics =
    cve.metrics?.cvssMetricV31
    ?? cve.metrics?.cvssMetricV30
    ?? cve.metrics?.cvssMetricV2
    ?? []
  const first = metrics[0]
  const raw = first?.cvssData?.baseSeverity?.toUpperCase()
  if (raw === 'CRITICAL' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'LOW') {
    return raw
  }
  return 'INFO'
}

function nvdSummary(cve: NvdCve): string {
  const en = cve.descriptions.find((d) => d.lang === 'en')
  const text = en?.value ?? cve.descriptions[0]?.value ?? ''
  return text.slice(0, 1_000)
}

function nvdPrimaryMetric(cve: NvdCve): NvdMetric | undefined {
  const metrics =
    cve.metrics?.cvssMetricV31
    ?? cve.metrics?.cvssMetricV30
    ?? cve.metrics?.cvssMetricV2
    ?? []
  return metrics[0]
}

function nvdCweIds(cve: NvdCve): readonly string[] {
  const ids = new Set<string>()
  for (const weakness of cve.weaknesses ?? []) {
    for (const desc of weakness.description ?? []) {
      const value = desc.value?.trim()
      if (value && /^CWE-\d+$/i.test(value)) ids.add(value.toUpperCase())
    }
  }
  return Array.from(ids).slice(0, 20)
}

function nvdAffectedProducts(cve: NvdCve): readonly IntelligenceAffectedProduct[] {
  const out: IntelligenceAffectedProduct[] = []
  const seen = new Set<string>()
  for (const config of cve.configurations ?? []) {
    for (const node of config.nodes ?? []) {
      for (const match of node.cpeMatch ?? []) {
        if (match.vulnerable === false) continue
        if (typeof match.criteria !== 'string') continue
        const parsed = parseCpeCriteria(match.criteria)
        if (!parsed) continue
        const key = `${parsed.vendor}:${parsed.product}:${parsed.versions ?? '*'}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(parsed)
        if (out.length >= 25) return out
      }
    }
  }
  return out
}

function mapNvdEntry(cve: NvdCve): IntelligenceEntryRecord {
  const metric = nvdPrimaryMetric(cve)
  const cvssVector = metric?.cvssData?.vectorString
  const cvssScore = typeof metric?.cvssData?.baseScore === 'number'
    ? metric.cvssData.baseScore
    : undefined
  const cweIds = nvdCweIds(cve)
  const affectedProducts = nvdAffectedProducts(cve)
  const referenceTypes = buildTypedReferences(cve.references)
  const record: IntelligenceEntryRecord = {
    id: cve.id,
    type: 'cve',
    title: cve.id,
    summary: nvdSummary(cve),
    severity: nvdSeverity(cve),
    source: 'NVD',
    publishedAt: cve.published.slice(0, 10),
    references: cve.references.slice(0, 10).map((r) => r.url),
    tags: ['cve', 'nvd'],
    ...(cvssVector ? { cvssVector } : {}),
    ...(cvssScore !== undefined ? { cvssScore } : {}),
    ...(cweIds.length > 0 ? { cweIds } : {}),
    ...(affectedProducts.length > 0 ? { affectedProducts } : {}),
    ...(referenceTypes.length > 0 ? { referenceTypes } : {}),
  }
  return record
}

function buildNvdUrl(ctx: IntelFetchContext): string {
  const end = ctx.now.toISOString().replace(/\.\d{3}Z$/, '.000Z')
  // ADR-0038 — narrow the window to "since cursor" when one exists,
  // falling back to the sinceDays window for the very first poll.
  // The cursor is a YYYY-MM-DD prefix from the prior fetched batch;
  // we anchor it to start-of-day UTC so the window includes the
  // cursor day itself (NVD's pubStartDate is inclusive).
  const cursorIso = ctx.cursor !== undefined && ctx.cursor.length >= 10
    ? `${ctx.cursor.slice(0, 10)}T00:00:00.000Z`
    : null
  const fallbackIso = new Date(ctx.now.getTime() - ctx.sinceDays * 24 * 60 * 60 * 1000)
    .toISOString().replace(/\.\d{3}Z$/, '.000Z')
  const start = cursorIso ?? fallbackIso
  const params = new URLSearchParams({
    pubStartDate: start,
    pubEndDate: end,
    resultsPerPage: '100',
  })
  return `https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`
}

export const NVD_SOURCE: IntelSource = {
  id: 'nvd',
  async fetchEntries(ctx) {
    const url = buildNvdUrl(ctx)
    const body = await ctx.fetcher<NvdApiResponse>(url)
    const list = body.vulnerabilities ?? []
    return list.map((item) => mapNvdEntry(item.cve))
  },
}

// ---------------------------------------------------------------------------
// AIID — AI Incident Database feed
// ---------------------------------------------------------------------------

interface AiidIncident {
  readonly incident_id: number
  readonly title: string
  readonly description?: string
  readonly date: string
  readonly reports?: readonly { readonly url?: string }[]
  readonly tags?: readonly string[]
}

function buildAiidUrl(): string {
  return 'https://incidentdatabase.ai/api/incidents?limit=50&sort=-date'
}

function mapAiidEntry(entry: AiidIncident): IntelligenceEntryRecord {
  const id = `AIID-${entry.incident_id}`
  const references = (entry.reports ?? [])
    .map((r) => r.url)
    .filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))
    .slice(0, 10)
  const tags = Array.from(
    new Set<string>([
      'ai-incident',
      ...(entry.tags ?? [])
        .filter((t) => typeof t === 'string')
        .map((t) => t.slice(0, 40)),
    ]),
  ).slice(0, 20)
  const summary = (entry.description ?? entry.title).slice(0, 1_000)
  // Wave 8.1 — AIID reports are almost always incident write-ups
  // rather than vendor advisories; default to writeup.
  const referenceTypes: IntelligenceTypedReference[] = references.map((url) => ({
    url,
    type: 'writeup' as const,
  }))
  return {
    id,
    type: 'ai-incident',
    title: entry.title.slice(0, 200),
    summary,
    severity: 'INFO',
    source: 'AIID',
    publishedAt: entry.date.slice(0, 10),
    references,
    tags,
    ...(referenceTypes.length > 0 ? { referenceTypes } : {}),
  }
}

export const AIID_SOURCE: IntelSource = {
  id: 'aiid',
  async fetchEntries(ctx) {
    const body = await ctx.fetcher<{ readonly incidents?: readonly AiidIncident[] }>(buildAiidUrl())
    const list = body.incidents ?? []
    return list.map(mapAiidEntry)
  },
}

// ---------------------------------------------------------------------------
// CISA KEV — Known Exploited Vulnerabilities catalogue (ADR-0037)
// ---------------------------------------------------------------------------

interface CisaKevEntry {
  readonly cveID: string
  readonly vendorProject?: string
  readonly product?: string
  readonly vulnerabilityName?: string
  readonly dateAdded: string
  readonly shortDescription?: string
  readonly requiredAction?: string
  readonly knownRansomwareCampaignUse?: string
}

interface CisaKevApiResponse {
  readonly vulnerabilities?: readonly CisaKevEntry[]
}

const CISA_KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

function mapCisaKevEntry(entry: CisaKevEntry): IntelligenceEntryRecord {
  // KEV listing implies an actively exploited vulnerability — treat as
  // HIGH severity by default; escalate to CRITICAL when the catalogue
  // flags known ransomware campaign use.
  const ransomware = (entry.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known'
  const severity: IntelligenceEntryRecord['severity'] = ransomware ? 'CRITICAL' : 'HIGH'
  const title = entry.vulnerabilityName?.slice(0, 200)
    ?? `${entry.vendorProject ?? 'Unknown vendor'} — ${entry.product ?? 'unknown product'}`.slice(0, 200)
  const summary = (entry.shortDescription ?? entry.requiredAction ?? title).slice(0, 1_000)
  const tags = Array.from(new Set([
    'cve', 'kev', 'exploited',
    ...(ransomware ? ['ransomware'] : []),
  ]))
  // Wave 8.1 — populate affectedProducts when the catalogue gives
  // vendor + product (almost always). referenceTypes points at the
  // NVD advisory page KEV links to.
  const vendor = entry.vendorProject?.trim()
  const product = entry.product?.trim()
  const affectedProducts: IntelligenceAffectedProduct[] = (vendor && product)
    ? [{ vendor, product }]
    : []
  const nvdRef = `https://nvd.nist.gov/vuln/detail/${entry.cveID}`
  const referenceTypes: IntelligenceTypedReference[] = [{ url: nvdRef, type: 'advisory' }]
  return {
    // Prefix to keep KEV records distinct from NVD records under the
    // same CVE id — operators see both signals side-by-side.
    id: `KEV-${entry.cveID}`,
    type: 'cve',
    title,
    summary,
    severity,
    source: 'CISA KEV',
    publishedAt: entry.dateAdded.slice(0, 10),
    references: [nvdRef],
    tags,
    ...(affectedProducts.length > 0 ? { affectedProducts } : {}),
    referenceTypes,
  }
}

export const CISA_KEV_SOURCE: IntelSource = {
  id: 'cisa-kev',
  async fetchEntries(ctx) {
    const body = await ctx.fetcher<CisaKevApiResponse>(CISA_KEV_URL)
    const list = body.vulnerabilities ?? []
    return list.map(mapCisaKevEntry)
  },
}

// ---------------------------------------------------------------------------
// FIRST EPSS — Exploit Prediction Scoring System (ADR-0037)
// ---------------------------------------------------------------------------

interface EpssEntry {
  readonly cve: string
  readonly epss: string | number
  readonly percentile: string | number
  readonly date: string
}

interface EpssApiResponse {
  readonly data?: readonly EpssEntry[]
}

function buildEpssUrl(ctx: IntelFetchContext): string {
  const params = new URLSearchParams({
    'envelope': 'true',
    'days': String(Math.max(1, Math.min(30, ctx.sinceDays))),
    'order': '!percentile',
    'limit': '100',
  })
  return `https://api.first.org/data/v1/epss?${params.toString()}`
}

function epssNumber(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function epssSeverity(percentile: number): IntelligenceEntryRecord['severity'] {
  if (percentile >= 0.95) return 'CRITICAL'
  if (percentile >= 0.80) return 'HIGH'
  if (percentile >= 0.50) return 'MEDIUM'
  if (percentile >= 0.20) return 'LOW'
  return 'INFO'
}

function mapEpssEntry(entry: EpssEntry): IntelligenceEntryRecord {
  const score = epssNumber(entry.epss)
  const percentile = epssNumber(entry.percentile)
  const nvdRef = `https://nvd.nist.gov/vuln/detail/${entry.cve}`
  return {
    id: `EPSS-${entry.cve}`,
    type: 'cve',
    title: `${entry.cve} — EPSS ${(score * 100).toFixed(2)}%`.slice(0, 200),
    summary: `Exploit Prediction Scoring System: probability ${(score * 100).toFixed(2)}%, ${(percentile * 100).toFixed(1)}th percentile across all scored CVEs.`,
    severity: epssSeverity(percentile),
    source: 'FIRST EPSS',
    publishedAt: entry.date.slice(0, 10),
    references: [nvdRef],
    tags: ['cve', 'epss', 'exploit-prediction'],
    // Wave 8.1 — EPSS provides probabilistic exploit scores that 8.2
    // reconciles against NVD CVSS. Preserve both raw values.
    epssScore: score,
    epssPercentile: percentile,
    referenceTypes: [{ url: nvdRef, type: 'advisory' }],
  }
}

export const EPSS_SOURCE: IntelSource = {
  id: 'epss',
  async fetchEntries(ctx) {
    const url = buildEpssUrl(ctx)
    const body = await ctx.fetcher<EpssApiResponse>(url)
    const list = body.data ?? []
    return list.map(mapEpssEntry)
  },
}

// ---------------------------------------------------------------------------
// MITRE ATLAS — Adversarial Threat Landscape for AI Systems
// Wave 4 baseline: case-studies.json (ADR-0037).
// Wave 8.3 upgrade: STIX 2.1 bundle with relationship graph (ADR-0076).
// ---------------------------------------------------------------------------

import {
  stixBundleToIntelRecords,
  type StixBundle,
} from './atlas-stix'

const ATLAS_STIX_URL = 'https://atlas.mitre.org/data/stix-atlas.json'

export const MITRE_ATLAS_SOURCE: IntelSource = {
  id: 'mitre-atlas',
  async fetchEntries(ctx) {
    const body = await ctx.fetcher<StixBundle>(ATLAS_STIX_URL)
    return stixBundleToIntelRecords(body)
  },
}

// ---------------------------------------------------------------------------
// Default source set + production fetcher
// ---------------------------------------------------------------------------

export const DEFAULT_INTEL_SOURCES: readonly IntelSource[] = [
  NVD_SOURCE,
  AIID_SOURCE,
  CISA_KEV_SOURCE,
  EPSS_SOURCE,
  MITRE_ATLAS_SOURCE,
]

// Wave 8.3 — the ATLAS STIX bundle is larger than the catalogue feeds
// (NVD / KEV / EPSS). Raise the byte cap only for this host so a
// future ATLAS release cycle doesn't silently wipe the source with a
// body-too-large error. The per-host opt-in keeps the default tight
// for every other adapter.
const ATLAS_MAX_BYTES = 20 * 1024 * 1024

export function productionIntelFetcher<T>(url: string): Promise<T> {
  if (url.startsWith('https://atlas.mitre.org/')) {
    return fetchIntelJson<T>(url, { maxBytes: ATLAS_MAX_BYTES })
  }
  return fetchIntelJson<T>(url)
}
