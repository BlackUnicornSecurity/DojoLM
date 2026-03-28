/**
 * S16: Vector Database Interface
 * Detects vector DB attack patterns: namespace traversal, GraphQL/SQL injection,
 * payload poisoning, tenant isolation bypass.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const VEC_PINECONE_PATTERNS: RegexPattern[] = [
  { name: 'pinecone-namespace-traversal', cat: 'VEC_NAMESPACE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:namespace|_namespace)["']?\s*[:=]\s*["']?(?:__system|__internal|_admin|__meta)/i,
    desc: 'Pinecone namespace traversal to reserved namespace', source: 'S16', weight: 9 },
  { name: 'pinecone-namespace-path-traversal', cat: 'VEC_NAMESPACE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /["']?(?:namespace|_namespace)["']?\s*[:=]\s*["']?(?:\.\.[/\\][^"'\s}]+|%2e%2e[/\\][^"'\s}]+)/i,
    desc: 'Namespace path traversal against vector collection boundary', source: 'S16', weight: 10 },
  { name: 'pinecone-metadata-injection', cat: 'VEC_METADATA_INJECTION', sev: SEVERITY.WARNING,
    re: /metadata\s*[:=]\s*\{[^}]*\$(?:gt|lt|gte|lte|eq|ne|in|nin)\s*:/i,
    desc: 'Pinecone metadata filter injection with MongoDB operators', source: 'S16', weight: 7 },
  { name: 'pinecone-topk-exfiltration', cat: 'VEC_DATA_LEAK', sev: SEVERITY.CRITICAL,
    re: /pinecone\.Index\(\s*["'](?:sensitive|secret|private|admin)[^"']*["']\s*\)\.query\([^)]*top_k\s*=\s*(?:10000|[1-9]\d{4,})/i,
    desc: 'Pinecone query requests an abusive top_k against a sensitive namespace or index', source: 'S16', weight: 10 },
];

export const VEC_WEAVIATE_PATTERNS: RegexPattern[] = [
  { name: 'weaviate-graphql-injection-or', cat: 'VEC_GRAPHQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\{\s*Get\s*\{[^}]*(?:OR\s+['"]1['"]\s*=\s*['"]1['"]|'\s*OR\s+'1'\s*=\s*'1)/i,
    desc: 'GraphQL injection in Weaviate with tautological OR', source: 'S16', weight: 10 },
  { name: 'weaviate-graphql-destructive', cat: 'VEC_GRAPHQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\{\s*(?:Get|Aggregate)\s*\{[^}]*(?:DROP\s+TABLE|DELETE\s+FROM|TRUNCATE)/i,
    desc: 'Destructive SQL in Weaviate GraphQL query', source: 'S16', weight: 10 },
  { name: 'weaviate-vector-leak', cat: 'VEC_DATA_LEAK', sev: SEVERITY.WARNING,
    re: /_additional\s*\{[^}]*(?:vector|certainty|distance)/i,
    desc: 'Weaviate _additional field access leaking vectors', source: 'S16', weight: 6 },
];

export const VEC_CHROMA_PATTERNS: RegexPattern[] = [
  { name: 'chroma-sql-union', cat: 'VEC_SQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:where|where_document)\s*[:=]\s*\{[^}]*UNION\s+(?:ALL\s+)?SELECT/i,
    desc: 'SQL UNION injection in ChromaDB filter', source: 'S16', weight: 10 },
  { name: 'chroma-sql-destructive', cat: 'VEC_SQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:where|where_document)\s*[:=]\s*\{[^}]*(?:DROP\s+TABLE|DELETE\s+FROM)/i,
    desc: 'Destructive SQL in ChromaDB filter', source: 'S16', weight: 10 },
  { name: 'chroma-id-injection', cat: 'VEC_SQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:ids|include)\s*[:=]\s*\[[^\]]*['"];\s*(?:DROP|DELETE|UPDATE)/i,
    desc: 'SQL injection via ChromaDB id field', source: 'S16', weight: 9 },
  { name: 'chroma-delete-many-abuse', cat: 'VEC_SQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /collection\.delete_many\s*\(\s*\{\s*\}\s*\)/i,
    desc: 'Destructive bulk delete against vector collection', source: 'S16', weight: 10 },
  { name: 'chroma-drop-collection', cat: 'VEC_SQL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /DROP\s+COLLECTION\b/i,
    desc: 'Collection drop command against vector store', source: 'S16', weight: 10 },
];

export const VEC_QDRANT_PATTERNS: RegexPattern[] = [
  { name: 'qdrant-path-traversal', cat: 'VEC_PATH_TRAVERSAL', sev: SEVERITY.CRITICAL,
    re: /collections?\s*[/\\]\s*(?:\.\.[/\\]|%2e%2e)/i,
    desc: 'Qdrant collection path traversal', source: 'S16', weight: 9 },
  { name: 'qdrant-payload-poisoning', cat: 'VEC_PAYLOAD_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:set_payload|overwrite_payload)\s*\([^)]*(?:__proto__|constructor\s*:|prototype\s*:)/i,
    desc: 'Prototype pollution via Qdrant payload', source: 'S16', weight: 10 },
];

export const VEC_TENANT_PATTERNS: RegexPattern[] = [
  { name: 'tenant-isolation-bypass', cat: 'VEC_TENANT_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:tenant[_-]?id|org[_-]?id)\s*[:=]\s*["']?\s*(?:\*|%2a|all|ANY|__all__|__global__)/i,
    desc: 'Tenant isolation bypass with wildcard', source: 'S16', weight: 10 },
  { name: 'tenant-cross-access', cat: 'VEC_TENANT_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:cross[_-]?tenant|tenant[_-]?switch|impersonate[_-]?tenant)\s*[:=]\s*["']?[a-zA-Z0-9_-]+/i,
    desc: 'Cross-tenant data access attempt', source: 'S16', weight: 9 },
  { name: 'tenant-unbounded-query', cat: 'VEC_TENANT_BYPASS', sev: SEVERITY.WARNING,
    re: /"query"\s*:\s*\{[^}]*\$(?:ne|regex)[^}]*\}[\s\S]{0,120}"limit"\s*:\s*(?:999999|[1-9]\d{5,})/i,
    desc: 'Unbounded cross-tenant style query with abusive limit', source: 'S16', weight: 8 },
];

export function detectVecMetadataInjection(text: string): Finding[] {
  const findings: Finding[] = [];
  const metaRe = /["']?metadata["']?\s*[:=]\s*\{([^}]{5,})\}/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(text)) !== null) {
    const content = m[1];
    if (/(?:UNION\s+SELECT|DROP\s+TABLE|DELETE\s+FROM|';\s*--|;\s*DROP)/i.test(content)) {
      findings.push({ category: 'VEC_METADATA_INJECTION', severity: SEVERITY.CRITICAL,
        description: 'SQL injection in vector DB metadata field',
        match: m[0].slice(0, 200), source: 'S16', engine: 'vectordb-interface',
        pattern_name: 'vec-metadata-sql-injection', weight: 10 });
    }
    if (/\$(?:gt|lt|ne|eq|in|nin|where|or|and)\b/i.test(content)) {
      findings.push({ category: 'VEC_METADATA_INJECTION', severity: SEVERITY.WARNING,
        description: 'NoSQL operator injection in vector DB metadata',
        match: m[0].slice(0, 200), source: 'S16', engine: 'vectordb-interface',
        pattern_name: 'vec-metadata-nosql-injection', weight: 8 });
    }
    if (/["']?__proto__["']?\s*:\s*\{[^}]*\}/i.test(content)) {
      findings.push({ category: 'VEC_PAYLOAD_POISONING', severity: SEVERITY.CRITICAL,
        description: 'Prototype pollution payload embedded in vector metadata',
        match: m[0].slice(0, 200), source: 'S16', engine: 'vectordb-interface',
        pattern_name: 'vec-metadata-proto-pollution', weight: 10 });
    }
  }

  const protoMetadata = text.match(/["']?metadata["']?\s*[:=]\s*\{[\s\S]{0,160}["']?__proto__["']?\s*:\s*\{[\s\S]{0,160}\}/i);
  if (protoMetadata) {
    findings.push({ category: 'VEC_PAYLOAD_POISONING', severity: SEVERITY.CRITICAL,
      description: 'Prototype pollution payload embedded in vector metadata',
      match: protoMetadata[0].slice(0, 200), source: 'S16', engine: 'vectordb-interface',
      pattern_name: 'vec-metadata-proto-pollution', weight: 10 });
  }

  const whereFilter = text.match(/["']?filter["']?\s*:\s*\{[\s\S]{0,120}["']?\$where["']?\s*:\s*["'][^"']*(?:admin|tenant|role|system)[^"']*["']/i);
  if (whereFilter) {
    findings.push({ category: 'VEC_METADATA_INJECTION', severity: SEVERITY.CRITICAL,
      description: 'JavaScript-style $where filter enables arbitrary privilege checks inside vector metadata queries',
      match: whereFilter[0].slice(0, 200), source: 'S16', engine: 'vectordb-interface',
      pattern_name: 'vec-filter-where-injection', weight: 10 });
  }
  return findings;
}

export function detectVecAdministrativeAbuse(text: string): Finding[] {
  const findings: Finding[] = [];

  if (/"filter"\s*:\s*\{[^}]*"\$regex"\s*:\s*"[^"]*"\s*,\s*"\$options"\s*:\s*"i"[^}]*\}[\s\S]{0,120}"include"\s*:\s*\[[^\]]*"embeddings"[^\]]*\]/i.test(text)) {
    findings.push({
      category: 'VEC_DATA_LEAK',
      severity: SEVERITY.CRITICAL,
      description: 'Vector query uses regex-wide filter while requesting raw embeddings',
      match: text.slice(0, 200),
      source: 'S16',
      engine: 'vectordb-interface',
      pattern_name: 'vec-regex-embedding-exfiltration',
      weight: 10,
    });
  }

  if (/collection\.delete_many\s*\(\s*\{\s*\}\s*\)[\s\S]{0,120}(?:retrieve|dump|extract)\s+all\s+embeddings/i.test(text)) {
    findings.push({
      category: 'VEC_DATA_LEAK',
      severity: SEVERITY.CRITICAL,
      description: 'Bulk-delete instruction chained with retrieval of all embeddings',
      match: text.slice(0, 200),
      source: 'S16',
      engine: 'vectordb-interface',
      pattern_name: 'vec-delete-many-exfiltration',
      weight: 10,
    });
  }

  if (/DROP\s+COLLECTION\b[\s\S]{0,120}db\.admin\.find\s*\(\s*\{\s*\}\s*\)/i.test(text)) {
    findings.push({
      category: 'VEC_DATA_LEAK',
      severity: SEVERITY.CRITICAL,
      description: 'Administrative vector-store command chained with privileged data access',
      match: text.slice(0, 200),
      source: 'S16',
      engine: 'vectordb-interface',
      pattern_name: 'vec-admin-chain',
      weight: 10,
    });
  }

  return findings;
}

const VDB_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: VEC_PINECONE_PATTERNS, name: 'VEC_PINECONE' },
  { patterns: VEC_WEAVIATE_PATTERNS, name: 'VEC_WEAVIATE' },
  { patterns: VEC_CHROMA_PATTERNS, name: 'VEC_CHROMA' },
  { patterns: VEC_QDRANT_PATTERNS, name: 'VEC_QDRANT' },
  { patterns: VEC_TENANT_PATTERNS, name: 'VEC_TENANT' },
];

const VDB_DETECTORS = [
  { name: 'vec-metadata-injection', detect: detectVecMetadataInjection },
  { name: 'vec-administrative-abuse', detect: detectVecAdministrativeAbuse },
];

const vectordbInterfaceModule: ScannerModule = {
  name: 'vectordb-interface',
  version: '1.0.0',
  description: 'Detects vector database attack patterns',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of VDB_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S16', engine: 'vectordb-interface',
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of VDB_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return VDB_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + VDB_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = VDB_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: 'S16' }));
    groups.push({ name: 'vec-detectors', count: VDB_DETECTORS.length, source: 'S16' });
    return groups;
  },
};

scannerRegistry.register(vectordbInterfaceModule);
export { vectordbInterfaceModule };
