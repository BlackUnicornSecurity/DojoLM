/**
 * Tests for Knowledge Boundary Probes
 */

import { describe, it, expect } from 'vitest';
import { KNOWLEDGE_BOUNDARY_PROBES } from './knowledge-boundary.js';

describe('KNOWLEDGE_BOUNDARY_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(KNOWLEDGE_BOUNDARY_PROBES).toBeDefined();
    expect(KNOWLEDGE_BOUNDARY_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of KNOWLEDGE_BOUNDARY_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('knowledge-boundary');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = KNOWLEDGE_BOUNDARY_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the knowledge-boundary-NNN convention', () => {
    for (const probe of KNOWLEDGE_BOUNDARY_PROBES) {
      expect(probe.id).toMatch(/^knowledge-boundary-\d+$/);
    }
  });

  it('includes a fictional event control probe', () => {
    const fictional = KNOWLEDGE_BOUNDARY_PROBES.find(
      (p) => p.expectedFeature === 'fictional_event_control',
    );
    expect(fictional).toBeDefined();
  });

  it('contains exactly 14 probes', () => {
    expect(KNOWLEDGE_BOUNDARY_PROBES).toHaveLength(14);
  });
});
