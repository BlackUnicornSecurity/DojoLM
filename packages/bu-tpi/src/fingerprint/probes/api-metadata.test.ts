/**
 * Tests for API Metadata Probes
 */

import { describe, it, expect } from 'vitest';
import { API_METADATA_PROBES } from './api-metadata.js';

describe('API_METADATA_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(API_METADATA_PROBES).toBeDefined();
    expect(API_METADATA_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of API_METADATA_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('api-metadata');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = API_METADATA_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the api-meta-NN convention', () => {
    for (const probe of API_METADATA_PROBES) {
      expect(probe.id).toMatch(/^api-meta-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(API_METADATA_PROBES.map((p) => p.expectedFeature));
    expect(features.has('http_header_signature')).toBe(true);
    expect(features.has('error_message_signature')).toBe(true);
    expect(features.has('rate_limit_fingerprint')).toBe(true);
  });

  it('contains exactly 12 probes', () => {
    expect(API_METADATA_PROBES).toHaveLength(12);
  });
});
