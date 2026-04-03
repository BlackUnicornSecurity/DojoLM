/**
 * File: fixtures-manifest.test.ts
 * Purpose: Test static fixture manifest backup data
 */
import { describe, it, expect } from 'vitest';
import { fixtureManifest } from '../fixtures-manifest';

describe('fixtureManifest', () => {
  it('exports a valid manifest object', () => {
    expect(fixtureManifest).toBeDefined();
    expect(typeof fixtureManifest).toBe('object');
  });

  it('has required BlackUnicorn branding fields', () => {
    expect(fixtureManifest.company).toBe('BlackUnicorn');
    expect(fixtureManifest.website).toBe('blackunicorn.tech');
  });

  it('has version and description', () => {
    expect(fixtureManifest.version).toBeDefined();
    expect(fixtureManifest.description).toContain('BlackUnicorn');
  });

  it('has totalFixtures as a positive number', () => {
    expect(fixtureManifest.totalFixtures).toBeGreaterThan(0);
  });

  it('has categories object', () => {
    expect(fixtureManifest.categories).toBeDefined();
    expect(typeof fixtureManifest.categories).toBe('object');
  });
});
