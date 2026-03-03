import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { vectordbInterfaceModule, detectVecMetadataInjection } from './vectordb-interface.js';
import type { Finding } from '../types.js';

function scanVec(t: string): Finding[] { return vectordbInterfaceModule.scan(t, t.toLowerCase()); }

describe('vectordb-interface', () => {
  it('should be registered', () => { expect(scannerRegistry.hasModule('vectordb-interface')).toBe(true); });
  it('should have positive pattern count', () => { expect(vectordbInterfaceModule.getPatternCount()).toBeGreaterThan(0); });

  it('should detect Pinecone namespace traversal', () => {
    expect(scanVec('namespace: "__system"').some(f => f.pattern_name === 'pinecone-namespace-traversal')).toBe(true);
  });
  it('should detect Weaviate GraphQL injection', () => {
    expect(scanVec("{ Get { Article(where: \"test\" OR '1'='1\") } }").some(f => f.pattern_name === 'weaviate-graphql-injection-or')).toBe(true);
  });
  it('should detect Weaviate destructive SQL', () => {
    expect(scanVec('{ Get { MyClass DROP TABLE users } }').some(f => f.pattern_name === 'weaviate-graphql-destructive')).toBe(true);
  });
  it('should detect ChromaDB SQL UNION', () => {
    expect(scanVec('where: { field: "val UNION SELECT * FROM secrets" }').some(f => f.pattern_name === 'chroma-sql-union')).toBe(true);
  });
  it('should detect Qdrant path traversal', () => {
    expect(scanVec('GET /collections/../../etc/passwd').some(f => f.pattern_name === 'qdrant-path-traversal')).toBe(true);
  });
  it('should detect tenant bypass', () => {
    expect(scanVec('tenant_id = "__all__"').some(f => f.pattern_name === 'tenant-isolation-bypass')).toBe(true);
  });
  it('should detect metadata SQL injection', () => {
    const f = detectVecMetadataInjection('{ "metadata": { "t": "test\'; DROP TABLE v; --" } }');
    expect(f.some(x => x.pattern_name === 'vec-metadata-sql-injection')).toBe(true);
  });
  it('should detect metadata NoSQL injection', () => {
    const f = detectVecMetadataInjection('{ "metadata": { "r": { "$ne": "admin" } } }');
    expect(f.some(x => x.pattern_name === 'vec-metadata-nosql-injection')).toBe(true);
  });
  it('should not flag clean content', () => { expect(scanVec('Normal query with namespace user-docs')).toHaveLength(0); });
});
