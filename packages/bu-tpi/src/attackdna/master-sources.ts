// SPDX-License-Identifier: Apache-2.0
/**
 * File: master-sources.ts
 * Purpose: Master Tier Source Registry + Parsers
 * Story: 11.1
 * Index:
 * - MasterSourceAdapter interface (line 20)
 * - HARDCODED_SOURCE_URLS registry (line 40)
 * - MITREAtlasAdapter (line 55)
 * - OWASPLLMTop10Adapter (line 95)
 * - NVDAIAdapter (line 130)
 * - getAdapter() factory (line 175)
 * - getAllAdapters() (line 185)
 */

import type { MasterThreatEntry } from './types.js';
import { validateSourceURL } from '../threatfeed/url-validator.js';
import { sanitizeContent } from '../threatfeed/content-sanitizer.js';
import {
  parseCommunityFeed,
  type CommunityFeedFormat,
  type CommunityPayload,
} from './liberator-feed.js';
import { mapCommunityLabel } from './taxonomy-bridge.js';
import { contentHashFor } from './ingestion-batch.js';

// ===========================================================================
// Adapter Interface
// ===========================================================================

/** Each master source implements this interface */
export interface MasterSourceAdapter {
  /** Unique source identifier */
  getSourceId(): string;
  /** Display name */
  getSourceName(): string;
  /** Hardcoded URL (not user-modifiable) */
  getSourceUrl(): string;
  /** Fetch raw data from the source */
  fetch(options?: { timeout?: number; maxResponseSize?: number }): Promise<unknown>;
  /** Parse raw data into MasterThreatEntry array */
  parse(raw: unknown): MasterThreatEntry[];
}

// ===========================================================================
// Hardcoded Source URLs (R2: SecArch — SSRF prevention)
// ===========================================================================

const HARDCODED_SOURCE_URLS: Record<string, string> = {
  'mitre-atlas': 'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.json',
  'owasp-llm-top10': 'https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/data/owasp-top10-llm.json',
  'nvd-ai': 'https://services.nvd.nist.gov/rest/json/cves/2.0',
  // Gap 2 community feeds — upstream orgs pinned in deploy config (plan lines 306-312).
  // URLs intentionally reference `<upstream>` so deploy overrides are explicit;
  // production deployments replace the placeholder via `AMATERASU_*_URL` env vars.
  'l1b3rt4s-primary': 'https://raw.githubusercontent.com/<upstream>/L1B3RT4S/main/',
  'l1b3rt4s-mirror': 'https://codeberg.org/mirrors/l1b3rt4s/raw/branch/main/',
  'basi-prompt': 'https://raw.githubusercontent.com/<upstream>/BASI-PROMPT/main/',
  'hf-jailbreak': 'https://huggingface.co/datasets/JailbreakBench/JBB-Behaviors/raw/main/',
} as const;

/** Maximum entries per source (R2: SecArch) */
const MAX_ENTRIES_PER_SOURCE = 10_000;
/** Maximum errors before aborting source sync (R2: SecArch) */
const MAX_ERRORS_PER_SOURCE = 100;
/** Default fetch timeout (30s) */
const DEFAULT_TIMEOUT = 30_000;
/** Default max response size (10MB) */
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

// ===========================================================================
// MITRE ATLAS Adapter
// ===========================================================================

export class MITREAtlasAdapter implements MasterSourceAdapter {
  getSourceId(): string { return 'mitre-atlas'; }
  getSourceName(): string { return 'MITRE ATLAS'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS['mitre-atlas']; }

  async fetch(options?: { timeout?: number; maxResponseSize?: number }): Promise<unknown> {
    return fetchWithValidation(this.getSourceUrl(), options);
  }

  parse(raw: unknown): MasterThreatEntry[] {
    const entries: MasterThreatEntry[] = [];
    let errorCount = 0;

    if (!raw || typeof raw !== 'object') return entries;

    const data = raw as Record<string, unknown>;
    const techniques = (data.objects || data.techniques || []) as Array<Record<string, unknown>>;

    for (const tech of techniques) {
      if (errorCount >= MAX_ERRORS_PER_SOURCE) break;
      if (entries.length >= MAX_ENTRIES_PER_SOURCE) break;

      try {
        if (!tech.id || !tech.name) { errorCount++; continue; }

        const { sanitized } = sanitizeContent(String(tech.description || ''));

        entries.push({
          id: `atlas-${String(tech.id).replace(/\./g, '_')}`,
          sourceId: 'mitre-atlas',
          sourceTier: 'master',
          title: String(tech.name).slice(0, 500),
          description: sanitized.slice(0, 5000),
          category: mapATLASCategory(tech),
          severity: 'WARNING',
          confidence: 0.85,
          techniqueIds: [String(tech.id)],
          indicators: extractATLASIndicators(tech),
          rawContent: JSON.stringify(tech).slice(0, 50_000),
          firstSeen: String(tech.created || new Date().toISOString()),
          lastUpdated: String(tech.modified || new Date().toISOString()),
          metadata: {
            source: 'mitre-atlas',
            type: String(tech.type || 'technique'),
            phase: tech.kill_chain_phases,
          },
        });
      } catch {
        errorCount++;
      }
    }

    return entries;
  }
}

function mapATLASCategory(tech: Record<string, unknown>): string {
  const name = String(tech.name || '').toLowerCase();
  if (name.includes('injection') || name.includes('prompt')) return 'prompt-injection';
  if (name.includes('evasion')) return 'evasion';
  if (name.includes('exfiltration') || name.includes('extraction')) return 'data-exfiltration';
  if (name.includes('poison')) return 'data-poisoning';
  if (name.includes('model') && name.includes('theft')) return 'model-theft';
  return 'ml-attack';
}

function extractATLASIndicators(tech: Record<string, unknown>): string[] {
  const indicators: string[] = [];
  if (tech.id) indicators.push(String(tech.id));
  const refs = (tech.external_references || []) as Array<Record<string, unknown>>;
  for (const ref of refs.slice(0, 20)) {
    if (ref.external_id) indicators.push(String(ref.external_id));
  }
  return indicators;
}

// ===========================================================================
// OWASP LLM Top 10 Adapter
// ===========================================================================

export class OWASPLLMTop10Adapter implements MasterSourceAdapter {
  getSourceId(): string { return 'owasp-llm-top10'; }
  getSourceName(): string { return 'OWASP LLM Top 10'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS['owasp-llm-top10']; }

  async fetch(options?: { timeout?: number; maxResponseSize?: number }): Promise<unknown> {
    return fetchWithValidation(this.getSourceUrl(), options);
  }

  parse(raw: unknown): MasterThreatEntry[] {
    const entries: MasterThreatEntry[] = [];
    let errorCount = 0;

    if (!raw || typeof raw !== 'object') return entries;

    const data = raw as Record<string, unknown>;
    const items = (data.risks || data.items || (Array.isArray(data) ? data : [])) as Array<Record<string, unknown>>;

    for (const item of items) {
      if (errorCount >= MAX_ERRORS_PER_SOURCE) break;
      if (entries.length >= MAX_ENTRIES_PER_SOURCE) break;

      try {
        if (!item.id && !item.name) { errorCount++; continue; }

        const { sanitized } = sanitizeContent(String(item.description || ''));

        entries.push({
          id: `owasp-${String(item.id || item.name).replace(/\s+/g, '-').toLowerCase()}`,
          sourceId: 'owasp-llm-top10',
          sourceTier: 'master',
          title: String(item.name || item.title || '').slice(0, 500),
          description: sanitized.slice(0, 5000),
          category: mapOWASPCategory(item),
          severity: 'CRITICAL',
          confidence: 0.95,
          techniqueIds: item.id ? [String(item.id)] : [],
          indicators: item.id ? [String(item.id)] : [],
          rawContent: JSON.stringify(item).slice(0, 50_000),
          firstSeen: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          metadata: {
            source: 'owasp-llm-top10',
            rank: item.rank || item.id,
            impact: item.impact,
          },
        });
      } catch {
        errorCount++;
      }
    }

    return entries;
  }
}

function mapOWASPCategory(item: Record<string, unknown>): string {
  const name = String(item.name || '').toLowerCase();
  if (name.includes('injection') || name.includes('prompt')) return 'prompt-injection';
  if (name.includes('data') && name.includes('leak')) return 'data-exfiltration';
  if (name.includes('supply') && name.includes('chain')) return 'supply-chain';
  if (name.includes('denial')) return 'denial-of-service';
  if (name.includes('overreliance')) return 'overreliance';
  if (name.includes('training') && name.includes('data')) return 'data-poisoning';
  return 'llm-security';
}

// ===========================================================================
// NVD AI-Filtered CVE Adapter
// ===========================================================================

export class NVDAIAdapter implements MasterSourceAdapter {
  getSourceId(): string { return 'nvd-ai'; }
  getSourceName(): string { return 'NVD AI CVEs'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS['nvd-ai']; }

  async fetch(options?: { timeout?: number; maxResponseSize?: number }): Promise<unknown> {
    // Filter NVD for AI/ML related CVEs
    const url = `${this.getSourceUrl()}?keywordSearch=artificial+intelligence+machine+learning+LLM&resultsPerPage=50`;
    return fetchWithValidation(url, options);
  }

  parse(raw: unknown): MasterThreatEntry[] {
    const entries: MasterThreatEntry[] = [];
    let errorCount = 0;

    if (!raw || typeof raw !== 'object') return entries;

    const data = raw as Record<string, unknown>;
    const vulnerabilities = (data.vulnerabilities || []) as Array<Record<string, unknown>>;

    for (const vuln of vulnerabilities) {
      if (errorCount >= MAX_ERRORS_PER_SOURCE) break;
      if (entries.length >= MAX_ENTRIES_PER_SOURCE) break;

      try {
        const cve = (vuln.cve || vuln) as Record<string, unknown>;
        const cveId = String(cve.id || cve.cveId || '');
        if (!cveId) { errorCount++; continue; }

        const descriptions = (cve.descriptions || []) as Array<Record<string, unknown>>;
        const enDesc = descriptions.find(d => d.lang === 'en') || descriptions[0];
        const description = String(enDesc?.value || '');

        const { sanitized } = sanitizeContent(description);

        // Extract CVSS severity
        const metrics = cve.metrics as Record<string, unknown> | undefined;
        const severity = extractNVDSeverity(metrics);

        entries.push({
          id: `nvd-${cveId.toLowerCase()}`,
          sourceId: 'nvd-ai',
          sourceTier: 'master',
          title: cveId,
          description: sanitized.slice(0, 5000),
          category: 'cve',
          severity,
          confidence: 0.9,
          techniqueIds: [cveId],
          indicators: [cveId],
          rawContent: JSON.stringify(cve).slice(0, 50_000),
          firstSeen: String(cve.published || new Date().toISOString()),
          lastUpdated: String(cve.lastModified || new Date().toISOString()),
          metadata: {
            source: 'nvd-ai',
            cvssScore: extractCVSSScore(metrics),
          },
        });
      } catch {
        errorCount++;
      }
    }

    return entries;
  }
}

function extractNVDSeverity(metrics: Record<string, unknown> | undefined): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (!metrics) return 'WARNING';
  const cvss = (metrics.cvssMetricV31 || metrics.cvssMetricV30 || metrics.cvssMetricV2) as Array<Record<string, unknown>> | undefined;
  if (!cvss || cvss.length === 0) return 'WARNING';
  const score = Number((cvss[0].cvssData as Record<string, unknown>)?.baseScore || 0);
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 4.0) return 'WARNING';
  return 'INFO';
}

function extractCVSSScore(metrics: Record<string, unknown> | undefined): number | null {
  if (!metrics) return null;
  const cvss = (metrics.cvssMetricV31 || metrics.cvssMetricV30 || metrics.cvssMetricV2) as Array<Record<string, unknown>> | undefined;
  if (!cvss || cvss.length === 0) return null;
  return Number((cvss[0].cvssData as Record<string, unknown>)?.baseScore || 0);
}

// ===========================================================================
// Shared Fetch with Validation
// ===========================================================================

async function fetchWithValidation(
  url: string,
  options?: { timeout?: number; maxResponseSize?: number }
): Promise<unknown> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxSize = options?.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE;

  // Validate URL against SSRF
  const validation = validateSourceURL(url);
  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.reason}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await globalThis.fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error(`Response exceeds max size of ${maxSize} bytes`);
    }

    const text = await response.text();
    if (text.length > maxSize) {
      throw new Error(`Response body exceeds max size of ${maxSize} bytes`);
    }

    return JSON.parse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===========================================================================
// Community-feed Adapters (Gap 2 — plan §Gap 2 lines 306-312, 318)
// ===========================================================================

/**
 * Shared behaviour for the three Gap 2 community adapters. They all:
 *   1. Fetch a text body (not JSON — L1B3RT4S is markdown, HF is JSONL).
 *   2. Delegate to `parseCommunityFeed` for format-specific parsing.
 *   3. Map labels through the Dojo taxonomy bridge.
 *   4. Emit `MasterThreatEntry` rows tagged `sourceTier: 'dojolm-global'`
 *      (community tier — distinct from `master` tier for authoritative
 *      vendors like MITRE/OWASP).
 */
abstract class CommunityAdapterBase implements MasterSourceAdapter {
  abstract getSourceId(): string;
  abstract getSourceName(): string;
  abstract getSourceUrl(): string;
  protected abstract getFormat(): CommunityFeedFormat;
  /** Optional per-source entry path appended to the base URL (defaults to empty). */
  protected getEntryPath(): string { return ''; }

  async fetch(options?: { timeout?: number; maxResponseSize?: number }): Promise<unknown> {
    const url = this.getSourceUrl() + this.getEntryPath();
    return fetchTextWithValidation(url, options);
  }

  parse(raw: unknown): MasterThreatEntry[] {
    if (typeof raw !== 'string') return [];
    const result = parseCommunityFeed({
      sourceId: this.getSourceId(),
      format: this.getFormat(),
      body: raw,
    });
    const entries: MasterThreatEntry[] = [];
    for (const payload of result.payloads) {
      if (entries.length >= MAX_ENTRIES_PER_SOURCE) break;
      const entry = communityPayloadToEntry(payload);
      if (entry) entries.push(entry);
    }
    return entries;
  }
}

export class L1B3RT4SAdapter extends CommunityAdapterBase {
  constructor(private readonly variant: 'l1b3rt4s-primary' | 'l1b3rt4s-mirror' = 'l1b3rt4s-primary') {
    super();
  }
  getSourceId(): string { return this.variant; }
  getSourceName(): string { return this.variant === 'l1b3rt4s-primary' ? 'L1B3RT4S (primary)' : 'L1B3RT4S (mirror)'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS[this.variant]; }
  protected getFormat(): CommunityFeedFormat { return 'l1b3rt4s-markdown'; }
  protected getEntryPath(): string { return 'CLAUDE.mkd'; }
}

export class BASIPromptAdapter extends CommunityAdapterBase {
  getSourceId(): string { return 'basi-prompt'; }
  getSourceName(): string { return 'BASI-PROMPT'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS['basi-prompt']; }
  protected getFormat(): CommunityFeedFormat { return 'basi-json'; }
  protected getEntryPath(): string { return 'prompts.json'; }
}

export class HuggingFaceJailbreakAdapter extends CommunityAdapterBase {
  getSourceId(): string { return 'hf-jailbreak'; }
  getSourceName(): string { return 'HuggingFace JailbreakBench'; }
  getSourceUrl(): string { return HARDCODED_SOURCE_URLS['hf-jailbreak']; }
  protected getFormat(): CommunityFeedFormat { return 'hf-jsonl'; }
  protected getEntryPath(): string { return 'behaviors.jsonl'; }
}

/**
 * Convert a CommunityPayload into the shared MasterThreatEntry shape.
 * Returns `null` if the payload has no usable content.
 */
export function communityPayloadToEntry(payload: CommunityPayload): MasterThreatEntry | null {
  if (!payload.content || !payload.content.trim()) return null;
  const { sanitized } = sanitizeContent(payload.content);
  const category = mapCommunityLabel(payload.labels);
  const entry: MasterThreatEntry = {
    id: `${payload.sourceId}-${contentHashFor({ sourceId: payload.sourceId, rawContent: payload.content })}`,
    sourceId: payload.sourceId,
    sourceTier: 'dojolm-global',
    title: (payload.title ?? payload.id).slice(0, 500),
    description: sanitized.slice(0, 5000),
    category,
    severity: category === 'unknown' ? 'INFO' : 'WARNING',
    confidence: 0.6,
    techniqueIds: payload.labels.slice(0, 20),
    indicators: payload.labels.slice(0, 20),
    rawContent: payload.content.slice(0, 50_000),
    firstSeen: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    metadata: {
      source: payload.sourceId,
      origin: 'community',
      labels: payload.labels.slice(0, 20),
    },
  };
  return entry;
}

/**
 * Text-body fetcher mirroring `fetchWithValidation` but without the JSON
 * parse. Community feeds are markdown/JSONL; callers parse downstream.
 */
async function fetchTextWithValidation(
  url: string,
  options?: { timeout?: number; maxResponseSize?: number },
): Promise<string> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxSize = options?.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE;
  const validation = validateSourceURL(url);
  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.reason}`);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await globalThis.fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/plain, application/json, */*' },
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(retryAfter ?? null);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error(`Response exceeds max size of ${maxSize} bytes`);
    }
    const text = await response.text();
    if (text.length > maxSize) {
      throw new Error(`Response body exceeds max size of ${maxSize} bytes`);
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Signals an upstream 429. Callers (scheduler, syncLiberatorFeed) abort
 * the remaining sources instead of retrying tight — plan line 339.
 */
export class RateLimitError extends Error {
  readonly code = 'AMATERASU.RATE_LIMITED' as const;
  constructor(public readonly retryAfter: string | null) {
    super(`upstream rate-limited${retryAfter ? ` (retry-after ${retryAfter})` : ''}`);
    this.name = 'RateLimitError';
  }
}

// ===========================================================================
// Adapter Registry
// ===========================================================================

const ADAPTERS: Record<string, () => MasterSourceAdapter> = {
  'mitre-atlas': () => new MITREAtlasAdapter(),
  'owasp-llm-top10': () => new OWASPLLMTop10Adapter(),
  'nvd-ai': () => new NVDAIAdapter(),
  'l1b3rt4s-primary': () => new L1B3RT4SAdapter('l1b3rt4s-primary'),
  'l1b3rt4s-mirror': () => new L1B3RT4SAdapter('l1b3rt4s-mirror'),
  'basi-prompt': () => new BASIPromptAdapter(),
  'hf-jailbreak': () => new HuggingFaceJailbreakAdapter(),
};

/** Get adapter by source ID */
export function getAdapter(sourceId: string): MasterSourceAdapter | null {
  const factory = ADAPTERS[sourceId];
  return factory ? factory() : null;
}

/** Get all available adapter source IDs */
export function getAvailableSourceIds(): string[] {
  return Object.keys(ADAPTERS);
}

/** Get all adapters */
export function getAllAdapters(): MasterSourceAdapter[] {
  return Object.values(ADAPTERS).map(f => f());
}
