/**
 * Tests for branding-helpers.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BRANDS,
  getRandomTagline,
  getBrand,
  brandAttack,
  brandClean,
  brandHTML,
  brandCode,
  brandBash,
  getBrandByIndex,
  getRandomBrand,
  getBrandForCategory,
} from './branding-helpers.js';
import type { BrandKey } from './branding-helpers.js';

// Mock fs so tests don't depend on actual tagline files
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}));

// ---------- tests ----------

describe('branding-helpers.ts', () => {
  // BR-001
  it('BR-001: BRANDS contains all expected brand keys', () => {
    const keys: BrandKey[] = ['blackunicorn', 'dojolm', 'bonklm', 'basileak', 'pantheonlm', 'marfaak'];
    for (const k of keys) {
      expect(BRANDS[k]).toBeDefined();
      expect(BRANDS[k].name).toBeTruthy();
      expect(BRANDS[k].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BRANDS[k].accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  // BR-002
  it('BR-002: getRandomTagline returns fallback when no tagline file exists', () => {
    const tagline = getRandomTagline('blackunicorn');
    expect(tagline).toBe('BlackUnicorn - AI Security');
  });

  // BR-003
  it('BR-003: getRandomTagline returns fallback for each brand', () => {
    const brands: BrandKey[] = ['dojolm', 'bonklm', 'basileak', 'pantheonlm', 'marfaak'];
    for (const brand of brands) {
      const tagline = getRandomTagline(brand);
      expect(tagline).toBe(`${BRANDS[brand].name} - AI Security`);
    }
  });

  // BR-004
  it('BR-004: getBrand returns name, color, accent, and tagline', () => {
    const brand = getBrand('dojolm');
    expect(brand.name).toBe('DojoLM');
    expect(brand.color).toBe('#E63946');
    expect(brand.accent).toBe('#FF1744');
    expect(typeof brand.tagline).toBe('string');
  });

  // BR-005
  it('BR-005: getBrand defaults to blackunicorn', () => {
    const brand = getBrand();
    expect(brand.name).toBe('BlackUnicorn');
  });

  // BR-006
  it('BR-006: brandAttack produces header with brand name and test name', () => {
    const header = brandAttack('prompt injection', 'dojolm');
    expect(header).toContain('# DojoLM AI Security - prompt injection');
    expect(header).toContain('**WARNING: This payload tests prompt injection.**');
  });

  // BR-007
  it('BR-007: brandAttack defaults to blackunicorn', () => {
    const header = brandAttack('XSS test');
    expect(header).toContain('BlackUnicorn AI Security');
  });

  // BR-008
  it('BR-008: brandClean produces no-injection header', () => {
    const header = brandClean('bonklm');
    expect(header).toContain('BonkLM');
    expect(header).toContain('No injection attempts. Valid content for testing.');
  });

  // BR-009
  it('BR-009: brandHTML produces HTML comment with brand name', () => {
    const html = brandHTML('basileak');
    expect(html).toContain('<!--');
    expect(html).toContain('Basileak');
    expect(html).toContain('Security Test Fixture');
  });

  // BR-010
  it('BR-010: brandCode produces JSDoc comment with brand name', () => {
    const code = brandCode('pantheonlm');
    expect(code).toContain('/**');
    expect(code).toContain('PantheonLM');
    expect(code).toContain('Security Test Fixture');
  });

  // BR-011
  it('BR-011: brandBash produces bash comment with brand name', () => {
    const bash = brandBash('marfaak');
    expect(bash).toContain('# Marfaak');
    expect(bash).toContain('# Security Test Fixture');
  });

  // BR-012
  it('BR-012: getBrandByIndex rotates through all 6 brands', () => {
    const seen = new Set<BrandKey>();
    for (let i = 0; i < 6; i++) {
      seen.add(getBrandByIndex(i));
    }
    expect(seen.size).toBe(6);
    // Index 6 wraps to index 0
    expect(getBrandByIndex(6)).toBe(getBrandByIndex(0));
  });

  // BR-013
  it('BR-013: getRandomBrand returns a valid brand key', () => {
    const validKeys: BrandKey[] = ['blackunicorn', 'dojolm', 'bonklm', 'basileak', 'pantheonlm', 'marfaak'];
    for (let i = 0; i < 20; i++) {
      expect(validKeys).toContain(getRandomBrand());
    }
  });

  // BR-014
  it('BR-014: getBrandForCategory returns correct defaults for known categories', () => {
    expect(getBrandForCategory('web')).toBe('dojolm');
    expect(getBrandForCategory('images')).toBe('blackunicorn');
    expect(getBrandForCategory('malformed')).toBe('basileak');
    expect(getBrandForCategory('social')).toBe('bonklm');
    expect(getBrandForCategory('agent-output')).toBe('marfaak');
    expect(getBrandForCategory('search-results')).toBe('pantheonlm');
  });

  // BR-015
  it('BR-015: getBrandForCategory returns blackunicorn for unknown category', () => {
    expect(getBrandForCategory('unknown-category')).toBe('blackunicorn');
    expect(getBrandForCategory('')).toBe('blackunicorn');
  });

  // BR-016
  it('BR-016: getBrandForCategory handles KASHIWA P2 categories', () => {
    expect(getBrandForCategory('prompt-injection')).toBe('dojolm');
    expect(getBrandForCategory('mcp')).toBe('dojolm');
    expect(getBrandForCategory('token-attacks')).toBe('dojolm');
  });
});
