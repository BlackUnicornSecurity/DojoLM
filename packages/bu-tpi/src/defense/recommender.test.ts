import { describe, it, expect } from 'vitest';
import { recommendDefenses } from './recommender.js';

describe('recommendDefenses', () => {
  it('returns recommendations for matching findings', () => {
    const findings = [{ category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' }];
    const recs = recommendDefenses(findings);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].template).toBeDefined();
    expect(recs[0].matchQuality).toBeGreaterThan(0);
    expect(recs[0].priority).toBeGreaterThan(0);
  });

  it('returns empty array for non-matching categories', () => {
    const findings = [{ category: 'COMPLETELY_UNKNOWN_CATEGORY_XYZ', severity: 'INFO' }];
    const recs = recommendDefenses(findings);
    expect(recs).toHaveLength(0);
  });

  it('sorts recommendations by priority (highest first)', () => {
    const findings = [
      { category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' },
      { category: 'SOCIAL_ENGINEERING', severity: 'INFO' },
    ];
    const recs = recommendDefenses(findings);
    if (recs.length >= 2) {
      for (let i = 0; i < recs.length - 1; i++) {
        expect(recs[i].priority).toBeGreaterThanOrEqual(recs[i + 1].priority);
      }
    }
  });

  it('deduplicates templates across multiple findings', () => {
    const findings = [
      { category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' },
      { category: 'SYSTEM_OVERRIDE', severity: 'WARNING' },
    ];
    const recs = recommendDefenses(findings);
    const templateIds = recs.map((r) => r.template.id);
    const uniqueIds = new Set(templateIds);
    expect(templateIds.length).toBe(uniqueIds.size);
  });

  it('assigns higher priority to CRITICAL findings', () => {
    const criticalFindings = [{ category: 'SYSTEM_OVERRIDE', severity: 'CRITICAL' }];
    const infoFindings = [{ category: 'SYSTEM_OVERRIDE', severity: 'INFO' }];
    const critRecs = recommendDefenses(criticalFindings);
    const infoRecs = recommendDefenses(infoFindings);
    if (critRecs.length > 0 && infoRecs.length > 0) {
      expect(critRecs[0].priority).toBeGreaterThan(infoRecs[0].priority);
    }
  });
});
