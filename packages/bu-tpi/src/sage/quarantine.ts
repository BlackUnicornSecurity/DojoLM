/**
 * S57: SAGE Quarantine System
 * Human review gate for generated attack variants.
 * Per SME CRIT-04: quarantine directory, require human approval before fixture promotion.
 */

import { randomUUID } from 'crypto';
import type { GeneticIndividual, QuarantineEntry, QuarantineStatus } from './types.js';

const MODULE_SOURCE = 'S57';

/**
 * In-memory quarantine store.
 * Production deployments should persist to database.
 */
const quarantineStore = new Map<string, QuarantineEntry>();
const MAX_QUARANTINE_SIZE = 10_000;

/**
 * Submit a variant to quarantine for human review.
 */
export function quarantineVariant(
  variant: GeneticIndividual,
  category?: string,
  brand?: string
): QuarantineEntry {
  if (quarantineStore.size >= MAX_QUARANTINE_SIZE) {
    throw new Error('Quarantine store capacity exceeded; review pending entries before adding new ones');
  }
  const entry: QuarantineEntry = {
    id: randomUUID(),
    variant,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewerNotes: null,
    category: category ?? null,
    brand: brand ?? null,
  };

  quarantineStore.set(entry.id, entry);
  return entry;
}

/**
 * Get quarantined variants with optional filtering.
 */
export function getQuarantinedVariants(filter?: {
  status?: QuarantineStatus;
  category?: string;
}): QuarantineEntry[] {
  let entries = Array.from(quarantineStore.values());

  if (filter?.status) {
    entries = entries.filter((e) => e.status === filter.status);
  }
  if (filter?.category) {
    entries = entries.filter((e) => e.category === filter.category);
  }

  return entries.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

/**
 * Approve a quarantined variant for fixture promotion.
 */
export function approveVariant(id: string, notes?: string): QuarantineEntry | null {
  const entry = quarantineStore.get(id);
  if (!entry) return null;

  const updated: QuarantineEntry = {
    ...entry,
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewerNotes: notes ?? null,
  };

  quarantineStore.set(id, updated);
  return updated;
}

/**
 * Reject a quarantined variant.
 */
export function rejectVariant(id: string, reason: string): QuarantineEntry | null {
  const entry = quarantineStore.get(id);
  if (!entry) return null;

  const updated: QuarantineEntry = {
    ...entry,
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewerNotes: reason,
  };

  quarantineStore.set(id, updated);
  return updated;
}

/**
 * Get a specific quarantine entry by ID.
 */
export function getQuarantineEntry(id: string): QuarantineEntry | null {
  return quarantineStore.get(id) ?? null;
}

/**
 * Get quarantine statistics.
 */
export function getQuarantineStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
} {
  const entries = Array.from(quarantineStore.values());
  return {
    total: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    approved: entries.filter((e) => e.status === 'approved').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
  };
}

/**
 * Clear all quarantine entries (for testing).
 */
export function clearQuarantine(): void {
  quarantineStore.clear();
}
