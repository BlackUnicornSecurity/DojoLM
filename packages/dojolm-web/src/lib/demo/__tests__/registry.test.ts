/**
 * File: registry.test.ts
 * Purpose: Enforce parity between DEMO_ROUTE_REGISTRY and the real filesystem.
 *
 * Failure modes caught by this test:
 *   - A route.ts file adds `isDemoMode()` without a registry entry → drift.
 *   - A registry entry references a route.ts that no longer uses
 *     `isDemoMode()` → stale entry.
 *   - A handler name listed in the registry is not exported from
 *     mock-api-handlers.ts → broken reference.
 *   - A handler is exported but referenced by no registry entry → dead code.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  DEMO_ROUTE_REGISTRY,
  DEMO_REGISTERED_HANDLERS,
  DEMO_ROUTE_COUNT,
} from '../registry';

const API_ROOT = join(__dirname, '../../../app/api');
const HANDLERS_FILE = join(__dirname, '../mock-api-handlers.ts');

/** Recursively find every route.ts under src/app/api. */
function findRouteFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) findRouteFiles(full, out);
    else if (name === 'route.ts') out.push(full);
  }
  return out;
}

/** Convert absolute route.ts path to registry-style path (e.g. '/stats'). */
function toRoutePath(absPath: string): string {
  const rel = relative(API_ROOT, absPath).replace(/\\/g, '/');
  return '/' + rel.replace(/\/route\.ts$/, '');
}

describe('DEMO_ROUTE_REGISTRY', () => {
  it('matches the routes that call isDemoMode() on disk', () => {
    const routeFiles = findRouteFiles(API_ROOT);
    const routesUsingDemoMode = routeFiles
      .filter((f) => readFileSync(f, 'utf8').includes('isDemoMode()'))
      .map(toRoutePath)
      .sort();

    const registryRoutes = DEMO_ROUTE_REGISTRY.map((e) => e.route).sort();

    const missing = routesUsingDemoMode.filter((r) => !registryRoutes.includes(r));
    const stale = registryRoutes.filter((r) => !routesUsingDemoMode.includes(r));

    expect(missing, `Routes that call isDemoMode() but are missing from DEMO_ROUTE_REGISTRY: ${missing.join(', ')}`).toEqual([]);
    expect(stale, `Registry entries for routes no longer calling isDemoMode(): ${stale.join(', ')}`).toEqual([]);
  });

  it('has the expected route count', () => {
    expect(DEMO_ROUTE_COUNT).toBeGreaterThan(0);
    expect(DEMO_ROUTE_REGISTRY).toHaveLength(DEMO_ROUTE_COUNT);
  });

  it('is sorted by route path', () => {
    const routes = DEMO_ROUTE_REGISTRY.map((e) => e.route);
    const sorted = [...routes].sort();
    expect(routes).toEqual(sorted);
  });

  it('has no duplicate route entries', () => {
    const routes = DEMO_ROUTE_REGISTRY.map((e) => e.route);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });
});

describe('DEMO handler references', () => {
  it('every handler in registry is exported from mock-api-handlers.ts', () => {
    const handlersSource = readFileSync(HANDLERS_FILE, 'utf8');
    const missing: string[] = [];
    for (const name of DEMO_REGISTERED_HANDLERS) {
      const exportPattern = new RegExp(
        `^export (?:async )?(?:function|const) ${name}\\b`,
        'm',
      );
      if (!exportPattern.test(handlersSource)) missing.push(name);
    }
    expect(missing, `Registry references handlers not exported from mock-api-handlers.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no dead handlers (exported but never referenced)', () => {
    const handlersSource = readFileSync(HANDLERS_FILE, 'utf8');
    const exported = Array.from(
      handlersSource.matchAll(/^export (?:async )?(?:function|const) (demo\w+)/gm),
      (m) => m[1],
    );
    const referenced = new Set(DEMO_REGISTERED_HANDLERS);
    // Handlers that are wrappers (demoNoOp*, demoBatch*, demoGuard*) may be referenced
    // by inline routes — exempt them from the dead-code check.
    const inlineReferenced = new Set([
      'demoNoOp',
      'demoNoOpCreated',
      'demoNoOpAccepted',
      'demoBatchGet',
      'demoBatchPost',
      'demoBatchById',
      'demoBatchExecutions',
      'demoGuardConfigGet',
      'demoGuardStatsGet',
      'demoGuardAuditGet',
      'demoCampaignsGet',
      'demoCampaignById',
      'demoCampaignRunById',
      'demoComplianceGet',
      'demoComplianceFrameworksGet',
      'demoComplianceAuditGet',
      'demoSettingsGet',
      'demoTestsGet',
      'demoResultsGet',
      'demoTestCasesGet',
      'demoMitsukeGet',
      'demoMcpStatusGet',
      'demoScanPost',
    ]);
    const dead = exported.filter(
      (name) => !referenced.has(name) && !inlineReferenced.has(name),
    );
    expect(dead, `Exported demo handlers with no registry or inline reference: ${dead.join(', ')}`).toEqual([]);
  });
});
