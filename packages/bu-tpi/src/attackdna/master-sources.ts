/**
 * File: master-sources.ts
 * Purpose: Master Tier Source Registry + Parsers
 * Story: KASHIWA-11.1
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
// Adapter Registry
// ===========================================================================

const ADAPTERS: Record<string, () => MasterSourceAdapter> = {
  'mitre-atlas': () => new MITREAtlasAdapter(),
  'owasp-llm-top10': () => new OWASPLLMTop10Adapter(),
  'nvd-ai': () => new NVDAIAdapter(),
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
