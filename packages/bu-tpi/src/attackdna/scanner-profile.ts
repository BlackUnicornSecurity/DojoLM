// SPDX-License-Identifier: Apache-2.0
/**
 * File: scanner-profile.ts
 * Purpose: Gap 11.4 — per-model scanner profile wiring.
 * Story: Industry-tools parity plan §11.4 (lines 736–754)
 *
 * Wires Gap 11.1 per-model jailbreak corpus (fixtures/jailbreaks/<model>/)
 * into the scanner. A `ScannerProfile` declares a `jailbreakSetId` — when
 * set, `runScanWithProfile` enumerates that model's payloads from disk,
 * loads each fixture, and scans it via the shipped `scan()` surface.
 *
 * Shipped scanner public API is NOT mutated:
 * - `scan()` and `ScanOptions` continue to work unchanged.
 * - Profile is an additive layer that calls `scan()` per fixture.
 *
 * Security (post-#176 lesson):
 * - `isSafeBucketRoot` + `isSafeManifestFilename` guard every filesystem
 *   access before `path.join`, so a profile with a crafted root or a
 *   manifest row that somehow escaped `model-router` validation cannot
 *   reach files outside the bucket directory.
 *
 * Telemetry (spec §11.4):
 * - `scanner.profile.selected` — emitted once per `runScanWithProfile` call
 * - `scanner.jailbreak_set.resolved` — emitted once per `resolveJailbreakSet`
 *   call (includes resolved fixture count so ops can alert on drift).
 */

import { readFile } from 'node:fs/promises';
import { join, resolve, isAbsolute, sep } from 'node:path';

import {
  TARGET_MODEL_IDS,
  defaultJailbreakRoot,
  isSafeManifestFilename as routerIsSafeManifestFilename,
  listJailbreaks,
  type JailbreakEntry,
  type TargetModelId,
} from './model-router.js';
import { scan, type ScanOptions } from '../scanner.js';
import type { ScanResult } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A scanner profile. Describes which per-model jailbreak corpus the scanner
 * should enumerate for a target, plus any scan-engine overrides.
 *
 * `id` is a stable human-readable identifier (e.g. "claude-default").
 * `jailbreakSetId` points at one of the Gap 11.1 buckets.
 */
export interface ScannerProfile {
  readonly id: string;
  readonly jailbreakSetId: TargetModelId;
  readonly scanOptions?: ScanOptions;
}

/** Minimal target config consumed by `runScanWithProfile`. */
export interface TargetConfig {
  readonly id: string;
  /**
   * Optional inline payload. When provided, it is scanned in addition to
   * the jailbreak set — lets callers feed a live session prompt through
   * the same profile.
   */
  readonly inline?: string;
}

/**
 * Result of resolving a jailbreak set. `root` is the absolute directory
 * containing the model's fixtures; `entries` is the pre-filtered manifest
 * rows. `count` is surfaced separately so callers can log without
 * re-iterating the array.
 */
export interface JailbreakSet {
  readonly modelId: TargetModelId;
  readonly root: string;
  readonly entries: readonly JailbreakEntry[];
  readonly count: number;
}

export interface ScannerProfileSource {
  /** Override the jailbreak fixtures root (tests / alternate corpora). */
  readonly root?: string;
  /** In-memory manifest override — bypasses disk entirely. */
  readonly entries?: readonly JailbreakEntry[];
}

export interface ProfileScanItem {
  readonly filename: string;
  readonly targetModel: TargetModelId;
  readonly result: ScanResult;
}

export interface ProfileScanResult {
  readonly profileId: string;
  readonly jailbreakSetId: TargetModelId;
  readonly scanned: readonly ProfileScanItem[];
  readonly skipped: readonly string[];
  readonly inline: ScanResult | null;
  /** True when the set had zero entries; no fixtures were scanned. */
  readonly emptySet: boolean;
}

/**
 * Telemetry event shape. Matches the amaterasu bridge contract
 * (`emit(event)` receives an object — the web layer re-emits it as-is).
 */
export type ScannerProfileTelemetryEvent =
  | {
      readonly type: 'scanner.profile.selected';
      readonly profileId: string;
      readonly jailbreakSetId: TargetModelId;
      readonly targetId: string;
      readonly at: string;
    }
  | {
      readonly type: 'scanner.jailbreak_set.resolved';
      readonly jailbreakSetId: TargetModelId;
      readonly count: number;
      readonly fallbackToUnknown: boolean;
      readonly at: string;
    };

export type ScannerProfileTelemetryEmitter = (
  event: ScannerProfileTelemetryEvent,
) => void;

export interface RunScanWithProfileOptions extends ScannerProfileSource {
  readonly onTelemetry?: ScannerProfileTelemetryEmitter;
  /**
   * Cap on the number of fixtures loaded per call. Defaults to 1000 — high
   * enough for realistic corpora, low enough to bound memory if a manifest
   * grows unchecked.
   */
  readonly maxFixtures?: number;
}

// ---------------------------------------------------------------------------
// Safety guards (apply #176 lesson — validate ALL fs inputs)
// ---------------------------------------------------------------------------

const MAX_FIXTURE_BYTES = 256 * 1024; // 256KB per payload — plenty for a jailbreak.
const DEFAULT_MAX_FIXTURES = 1000;

/**
 * Reject a bucket root that does not resolve to an absolute, traversal-free
 * path. We refuse relative roots because the caller's cwd is not guaranteed
 * in the Next.js server runtime.
 */
export function isSafeBucketRoot(root: string): boolean {
  if (typeof root !== 'string' || root.length === 0) return false;
  if (!isAbsolute(root)) return false;
  // `resolve` collapses `..` — if the result differs from the input in a way
  // that shortens it, the input contained traversal segments.
  const resolved = resolve(root);
  // Permit trailing-slash normalisation (`/x/` → `/x`) but reject anything
  // else. A traversal like `/a/b/../etc` would resolve to `/a/etc` which
  // differs — we reject.
  return resolved === root || resolved === root.replace(/\/+$/, '');
}

/**
 * Reject a manifest filename that could escape the bucket directory.
 * Post-#178 L-1: delegates to the canonical implementation in
 * `model-router.ts` so the two modules cannot drift.
 */
export function isSafeManifestFilename(filename: string): boolean {
  return routerIsSafeManifestFilename(filename);
}

function isKnownModelId(value: string): value is TargetModelId {
  return (TARGET_MODEL_IDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a model bucket into a concrete jailbreak set. When `modelId` is
 * unknown (not in `TARGET_MODEL_IDS`) the resolver falls back to the
 * `'unknown'` bucket — same policy the Gap 11.1 manifest uses.
 *
 * Emits `scanner.jailbreak_set.resolved` when `onTelemetry` is provided.
 */
export async function resolveJailbreakSet(
  modelId: TargetModelId | string,
  options: RunScanWithProfileOptions = {},
): Promise<JailbreakSet> {
  const fallbackToUnknown = !isKnownModelId(modelId);
  const effective: TargetModelId = fallbackToUnknown ? 'unknown' : modelId;
  const root = options.root ?? defaultJailbreakRoot();
  if (!isSafeBucketRoot(root)) {
    throw new Error(`resolveJailbreakSet: unsafe bucket root "${root}"`);
  }

  const entries: JailbreakEntry[] = [];
  for await (const entry of listJailbreaks(effective, {
    root,
    entries: options.entries,
  })) {
    if (!isSafeManifestFilename(entry.filename)) {
      // A corrupt manifest leaked past model-router's loader — fail loud
      // rather than try to skip, so ops notice immediately.
      throw new Error(
        `resolveJailbreakSet: unsafe manifest filename "${entry.filename}" in bucket "${entry.targetModel}"`,
      );
    }
    entries.push(entry);
  }

  const set: JailbreakSet = {
    modelId: effective,
    root,
    entries,
    count: entries.length,
  };

  options.onTelemetry?.({
    type: 'scanner.jailbreak_set.resolved',
    jailbreakSetId: effective,
    count: entries.length,
    fallbackToUnknown,
    at: new Date().toISOString(),
  });

  return set;
}

/**
 * Load a single fixture file from the bucket and scan it. Returns `null`
 * when the file is missing or exceeds the byte cap — callers treat missing
 * fixtures as skipped rather than fatal (matches the §11.4 "empty-set
 * fallback warns (does not error)" contract).
 */
async function scanOneFixture(
  root: string,
  entry: JailbreakEntry,
  scanOptions: ScanOptions | undefined,
): Promise<ScanResult | null> {
  const bucketDir = join(root, entry.targetModel);
  if (!isSafeBucketRoot(bucketDir)) return null;
  const fullPath = join(bucketDir, entry.filename);
  // Post-#178 M-1: require the resolved path to live strictly under
  // bucketDir — append `sep` so `/a/bucket2/...` can't pass a naive
  // `startsWith("/a/bucket")` check. Also require strict containment
  // under `root` itself.
  const rResolved = resolve(root);
  const bResolved = resolve(bucketDir);
  const fResolved = resolve(fullPath);
  if (!bResolved.startsWith(rResolved + sep) && bResolved !== rResolved) return null;
  if (!fResolved.startsWith(bResolved + sep)) return null;

  let raw: string;
  try {
    raw = await readFile(fullPath, { encoding: 'utf8' });
  } catch {
    return null;
  }
  if (raw.length > MAX_FIXTURE_BYTES) return null;
  return scan(raw, scanOptions);
}

/**
 * Enumerate the profile's jailbreak set, scan each fixture, and optionally
 * scan an inline payload. No existing scanner surface is mutated — this is
 * a pure orchestration layer over `scan()`.
 */
export async function runScanWithProfile(
  target: TargetConfig,
  profile: ScannerProfile,
  options: RunScanWithProfileOptions = {},
): Promise<ProfileScanResult> {
  options.onTelemetry?.({
    type: 'scanner.profile.selected',
    profileId: profile.id,
    jailbreakSetId: profile.jailbreakSetId,
    targetId: target.id,
    at: new Date().toISOString(),
  });

  const set = await resolveJailbreakSet(profile.jailbreakSetId, options);
  const max = options.maxFixtures ?? DEFAULT_MAX_FIXTURES;

  const scanned: ProfileScanItem[] = [];
  const skipped: string[] = [];

  const toProcess = set.entries.slice(0, max);
  for (const entry of toProcess) {
    const result = await scanOneFixture(set.root, entry, profile.scanOptions);
    if (result === null) {
      skipped.push(`${entry.targetModel}/${entry.filename}`);
      continue;
    }
    scanned.push({
      filename: entry.filename,
      targetModel: entry.targetModel,
      result,
    });
  }

  const inline = target.inline ? scan(target.inline, profile.scanOptions) : null;

  return {
    profileId: profile.id,
    jailbreakSetId: profile.jailbreakSetId,
    scanned,
    skipped,
    inline,
    emptySet: set.count === 0,
  };
}
