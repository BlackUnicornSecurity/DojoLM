/**
 * K10.4 — Controlled Document Register Tests
 */
import { describe, it, expect } from 'vitest';
import {
  KATANA_DOCUMENTS,
  buildDocumentRegister,
  getDocumentById,
  getDocumentsByCategory,
  getDocumentsByClause,
  validateRegister,
  exportRegisterMarkdown,
} from '../governance/document-register.js';
import type { DocumentRegister, DocumentEntry } from '../governance/document-register.js';
import { SCHEMA_VERSION } from '../types.js';

describe('K10.4 — Controlled Document Register', () => {
  describe('Document Definitions', () => {
    it('should define at least 10 documents', () => {
      expect(KATANA_DOCUMENTS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique document IDs', () => {
      const ids = KATANA_DOCUMENTS.map(d => d.document_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have at least one document per category', () => {
      const categories = new Set(KATANA_DOCUMENTS.map(d => d.category));
      expect(categories.has('procedure')).toBe(true);
      expect(categories.has('reference')).toBe(true);
      expect(categories.has('template')).toBe(true);
      expect(categories.has('record')).toBe(true);
      expect(categories.has('policy')).toBe(true);
    });

    it('should have change history for every document', () => {
      for (const doc of KATANA_DOCUMENTS) {
        expect(doc.change_history.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have version matching latest change history entry', () => {
      for (const doc of KATANA_DOCUMENTS) {
        const latest = doc.change_history[doc.change_history.length - 1];
        expect(latest.version).toBe(doc.version);
      }
    });

    it('should reference at least one ISO clause per document', () => {
      for (const doc of KATANA_DOCUMENTS) {
        expect(doc.iso_clauses.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have non-empty titles', () => {
      for (const doc of KATANA_DOCUMENTS) {
        expect(doc.title.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty file paths', () => {
      for (const doc of KATANA_DOCUMENTS) {
        expect(doc.file_path.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('buildDocumentRegister', () => {
    it('should produce a valid register', () => {
      const register = buildDocumentRegister();
      expect(register.schema_version).toBe(SCHEMA_VERSION);
      expect(register.register_id).toBe('KATANA-REG-001');
      expect(register.documents.length).toBeGreaterThanOrEqual(10);
    });

    it('should include ISO timestamp', () => {
      const register = buildDocumentRegister();
      expect(register.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getDocumentById', () => {
    it('should find existing document', () => {
      const register = buildDocumentRegister();
      const doc = getDocumentById(register, 'KATANA-PROC-001');
      expect(doc).toBeDefined();
      expect(doc!.title).toContain('Labeling');
    });

    it('should return undefined for unknown ID', () => {
      const register = buildDocumentRegister();
      const doc = getDocumentById(register, 'NONEXISTENT');
      expect(doc).toBeUndefined();
    });
  });

  describe('getDocumentsByCategory', () => {
    it('should return procedures', () => {
      const register = buildDocumentRegister();
      const procedures = getDocumentsByCategory(register, 'procedure');
      expect(procedures.length).toBeGreaterThanOrEqual(5);
      for (const doc of procedures) {
        expect(doc.category).toBe('procedure');
      }
    });

    it('should return policies', () => {
      const register = buildDocumentRegister();
      const policies = getDocumentsByCategory(register, 'policy');
      expect(policies.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for empty category', () => {
      const register: DocumentRegister = {
        schema_version: SCHEMA_VERSION,
        register_id: 'test',
        generated_at: new Date().toISOString(),
        documents: [],
      };
      const result = getDocumentsByCategory(register, 'procedure');
      expect(result).toEqual([]);
    });
  });

  describe('getDocumentsByClause', () => {
    it('should find documents by ISO clause 4.1', () => {
      const register = buildDocumentRegister();
      const docs = getDocumentsByClause(register, '4.1');
      expect(docs.length).toBeGreaterThanOrEqual(2);
    });

    it('should find documents by ISO clause 7.2.1', () => {
      const register = buildDocumentRegister();
      const docs = getDocumentsByClause(register, '7.2.1');
      expect(docs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for unused clause', () => {
      const register = buildDocumentRegister();
      const docs = getDocumentsByClause(register, '99.99');
      expect(docs).toEqual([]);
    });
  });

  describe('validateRegister', () => {
    it('should validate the default register as valid', () => {
      const register = buildDocumentRegister();
      const result = validateRegister(register);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect duplicate document IDs', () => {
      const doc: DocumentEntry = {
        document_id: 'DUP-001',
        title: 'Duplicate',
        category: 'procedure',
        version: '1.0.0',
        author: 'Test',
        reviewer: 'Test',
        approval_date: '2026-01-01',
        effective_date: '2026-01-01',
        file_path: 'test.ts',
        description: 'Test',
        iso_clauses: ['4.1'],
        change_history: [{ version: '1.0.0', date: '2026-01-01', author: 'Test', description: 'Init' }],
      };
      const register: DocumentRegister = {
        schema_version: SCHEMA_VERSION,
        register_id: 'test',
        generated_at: new Date().toISOString(),
        documents: [doc, doc],
      };
      const result = validateRegister(register);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should detect version mismatch', () => {
      const doc: DocumentEntry = {
        document_id: 'MISMATCH-001',
        title: 'Mismatch',
        category: 'procedure',
        version: '2.0.0',
        author: 'Test',
        reviewer: 'Test',
        approval_date: '2026-01-01',
        effective_date: '2026-01-01',
        file_path: 'test.ts',
        description: 'Test',
        iso_clauses: ['4.1'],
        change_history: [{ version: '1.0.0', date: '2026-01-01', author: 'Test', description: 'Init' }],
      };
      const register: DocumentRegister = {
        schema_version: SCHEMA_VERSION,
        register_id: 'test',
        generated_at: new Date().toISOString(),
        documents: [doc],
      };
      const result = validateRegister(register);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Version mismatch'))).toBe(true);
    });

    it('should detect empty change history', () => {
      const doc: DocumentEntry = {
        document_id: 'EMPTY-001',
        title: 'Empty history',
        category: 'procedure',
        version: '1.0.0',
        author: 'Test',
        reviewer: 'Test',
        approval_date: '2026-01-01',
        effective_date: '2026-01-01',
        file_path: 'test.ts',
        description: 'Test',
        iso_clauses: ['4.1'],
        change_history: [],
      };
      const register: DocumentRegister = {
        schema_version: SCHEMA_VERSION,
        register_id: 'test',
        generated_at: new Date().toISOString(),
        documents: [doc],
      };
      const result = validateRegister(register);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No change history'))).toBe(true);
    });

    it('should detect no ISO clauses', () => {
      const doc: DocumentEntry = {
        document_id: 'NOCL-001',
        title: 'No clauses',
        category: 'procedure',
        version: '1.0.0',
        author: 'Test',
        reviewer: 'Test',
        approval_date: '2026-01-01',
        effective_date: '2026-01-01',
        file_path: 'test.ts',
        description: 'Test',
        iso_clauses: [],
        change_history: [{ version: '1.0.0', date: '2026-01-01', author: 'Test', description: 'Init' }],
      };
      const register: DocumentRegister = {
        schema_version: SCHEMA_VERSION,
        register_id: 'test',
        generated_at: new Date().toISOString(),
        documents: [doc],
      };
      const result = validateRegister(register);
      expect(result.valid).toBe(false);
    });
  });

  describe('exportRegisterMarkdown', () => {
    it('should produce markdown with all sections', () => {
      const register = buildDocumentRegister();
      const md = exportRegisterMarkdown(register);
      expect(md).toContain('# KATANA Controlled Document Register');
      expect(md).toContain('## Documents');
      expect(md).toContain('## Document Details');
      expect(md).toContain('KATANA-REG-001');
      expect(md).toContain('ISO 17025 Clause:**');
    });

    it('should include change history tables', () => {
      const register = buildDocumentRegister();
      const md = exportRegisterMarkdown(register);
      expect(md).toContain('**Change History:**');
      expect(md).toContain('| Version | Date |');
    });
  });

  describe('ISO Clause Coverage', () => {
    it('should cover all key ISO clauses', () => {
      const register = buildDocumentRegister();
      const allClauses = new Set(register.documents.flatMap(d => d.iso_clauses));
      expect(allClauses.has('4.1')).toBe(true);
      expect(allClauses.has('6.4')).toBe(true);
      expect(allClauses.has('6.5')).toBe(true);
      expect(allClauses.has('7.2.1')).toBe(true);
      expect(allClauses.has('7.2.2')).toBe(true);
      expect(allClauses.has('7.6')).toBe(true);
      expect(allClauses.has('7.8.6')).toBe(true);
      expect(allClauses.has('7.10')).toBe(true);
      expect(allClauses.has('8.3')).toBe(true);
      expect(allClauses.has('8.7')).toBe(true);
      expect(allClauses.has('8.8')).toBe(true);
    });
  });
});
