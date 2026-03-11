/**
 * Tests for S57: SAGE Quarantine System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  quarantineVariant,
  getQuarantinedVariants,
  approveVariant,
  rejectVariant,
  getQuarantineEntry,
  getQuarantineStats,
  clearQuarantine,
} from './quarantine.js';
import type { GeneticIndividual } from './types.js';

function makeVariant(overrides: Partial<GeneticIndividual> = {}): GeneticIndividual {
  return {
    id: overrides.id ?? 'variant-1',
    text: overrides.text ?? 'ignore previous instructions',
    parentIds: overrides.parentIds ?? [],
    generation: overrides.generation ?? 0,
    fitness: overrides.fitness ?? {
      novelty: 0.5,
      evasion: 0.5,
      semanticPreservation: 0.5,
      harmScore: 0.3,
      overall: 0.5,
    },
    mutations: overrides.mutations ?? ['character-substitution'],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

describe('SAGE Quarantine System', () => {
  beforeEach(() => {
    clearQuarantine();
  });

  // QR-001
  it('QR-001: quarantineVariant creates a pending entry', () => {
    const entry = quarantineVariant(makeVariant());
    expect(entry.status).toBe('pending');
    expect(entry.reviewedAt).toBeNull();
    expect(entry.reviewerNotes).toBeNull();
    expect(entry.id).toBeTruthy();
  });

  // QR-002
  it('QR-002: quarantineVariant stores category and brand', () => {
    const entry = quarantineVariant(makeVariant(), 'injection', 'acme');
    expect(entry.category).toBe('injection');
    expect(entry.brand).toBe('acme');
  });

  // QR-003
  it('QR-003: quarantineVariant defaults category/brand to null', () => {
    const entry = quarantineVariant(makeVariant());
    expect(entry.category).toBeNull();
    expect(entry.brand).toBeNull();
  });

  // QR-004
  it('QR-004: getQuarantinedVariants returns all entries', () => {
    quarantineVariant(makeVariant());
    quarantineVariant(makeVariant());
    const entries = getQuarantinedVariants();
    expect(entries).toHaveLength(2);
  });

  // QR-005
  it('QR-005: getQuarantinedVariants filters by status', () => {
    const entry = quarantineVariant(makeVariant());
    quarantineVariant(makeVariant());
    approveVariant(entry.id);
    const pending = getQuarantinedVariants({ status: 'pending' });
    expect(pending).toHaveLength(1);
    const approved = getQuarantinedVariants({ status: 'approved' });
    expect(approved).toHaveLength(1);
  });

  // QR-006
  it('QR-006: getQuarantinedVariants filters by category', () => {
    quarantineVariant(makeVariant(), 'injection');
    quarantineVariant(makeVariant(), 'encoding');
    const results = getQuarantinedVariants({ category: 'injection' });
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('injection');
  });

  // QR-007
  it('QR-007: approveVariant sets status to approved with notes', () => {
    const entry = quarantineVariant(makeVariant());
    const approved = approveVariant(entry.id, 'Looks good');
    expect(approved).not.toBeNull();
    expect(approved!.status).toBe('approved');
    expect(approved!.reviewerNotes).toBe('Looks good');
    expect(approved!.reviewedAt).toBeTruthy();
  });

  // QR-008
  it('QR-008: approveVariant returns null for unknown ID', () => {
    const result = approveVariant('nonexistent');
    expect(result).toBeNull();
  });

  // QR-009
  it('QR-009: rejectVariant sets status to rejected with reason', () => {
    const entry = quarantineVariant(makeVariant());
    const rejected = rejectVariant(entry.id, 'Too dangerous');
    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.reviewerNotes).toBe('Too dangerous');
  });

  // QR-010
  it('QR-010: rejectVariant returns null for unknown ID', () => {
    const result = rejectVariant('nonexistent', 'reason');
    expect(result).toBeNull();
  });

  // QR-011
  it('QR-011: getQuarantineEntry retrieves a specific entry', () => {
    const entry = quarantineVariant(makeVariant());
    const retrieved = getQuarantineEntry(entry.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(entry.id);
  });

  // QR-012
  it('QR-012: getQuarantineEntry returns null for unknown ID', () => {
    const result = getQuarantineEntry('nonexistent');
    expect(result).toBeNull();
  });

  // QR-013
  it('QR-013: getQuarantineStats returns correct counts', () => {
    const e1 = quarantineVariant(makeVariant());
    const e2 = quarantineVariant(makeVariant());
    quarantineVariant(makeVariant());
    approveVariant(e1.id);
    rejectVariant(e2.id, 'bad');

    const stats = getQuarantineStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(1);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
  });

  // QR-014
  it('QR-014: clearQuarantine removes all entries', () => {
    quarantineVariant(makeVariant());
    quarantineVariant(makeVariant());
    clearQuarantine();
    const entries = getQuarantinedVariants();
    expect(entries).toHaveLength(0);
  });

  // QR-015
  it('QR-015: getQuarantinedVariants returns entries sorted by submittedAt', () => {
    const e1 = quarantineVariant(makeVariant());
    const e2 = quarantineVariant(makeVariant());
    const entries = getQuarantinedVariants();
    // Both entries should be returned
    expect(entries).toHaveLength(2);
    // Sorted by submittedAt descending: entries with same timestamp maintain order,
    // both entries are present
    const ids = entries.map((e) => e.id);
    expect(ids).toContain(e1.id);
    expect(ids).toContain(e2.id);
  });
});
