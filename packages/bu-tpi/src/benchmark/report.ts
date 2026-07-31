// SPDX-License-Identifier: Apache-2.0
/**
 * Benchmark report helpers.
 */

import { createHash } from "node:crypto";

import { requireFixtureContent } from "./fixture-content.js";
import { getBenchmarkSuiteEvidence } from "./registry.js";
import type { BenchmarkResult, BenchmarkSuite } from "./types.js";

export const BENCHMARK_REPORT_SCHEMA_VERSION = "dojolm.benchmark.report/v1";

export type BenchmarkReportCoverageMode =
  | "anchor_smoke"
  | "materialized_corpus";

export interface BenchmarkReportFixture {
  readonly id: string;
  readonly expectedVerdict: "BLOCK" | "ALLOW";
  readonly contentHash: string;
}

export interface BenchmarkReportCategory {
  readonly name: string;
  readonly weight: number;
  readonly fixtureCount: number;
  readonly fixtures: readonly BenchmarkReportFixture[];
}

export interface BenchmarkReportSuiteMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly fixtureCount: number;
  readonly coverageMode: BenchmarkReportCoverageMode;
  readonly uniqueFixturePayloadCount: number;
  readonly fingerprint: string;
  readonly categories: readonly BenchmarkReportCategory[];
}

export interface BenchmarkRunReport {
  readonly schemaVersion: typeof BENCHMARK_REPORT_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly suite: BenchmarkReportSuiteMetadata;
  readonly result: BenchmarkResult;
}

// These regexes deliberately detect C0/C1 controls in untrusted report text.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_GLOBAL_RE = /[\u0000-\u001f\u007f-\u009f]/g;
const FORMAT_CONTROL_RE = /\p{Cf}/u;
const FORMAT_CONTROL_GLOBAL_RE = /\p{Cf}/gu;
// eslint-disable-next-line no-useless-escape
const MARKDOWN_ESCAPE_RE = /[\\`*_{}\[\]()#+!|<>]/g;
const SHA256_RE = /^[a-f0-9]{64}$/;

type SuiteMetadataWithoutFingerprint = Omit<
  BenchmarkReportSuiteMetadata,
  "fingerprint"
>;

interface ParsedSuiteMetadataScalars {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly fixtureCount: number;
  readonly coverageMode: BenchmarkReportCoverageMode;
  readonly uniqueFixturePayloadCount: number;
  readonly fingerprint: string;
  readonly categories: readonly unknown[];
}

export function isSafeReportString(
  value: unknown,
  options: { readonly allowEmpty?: boolean } = {},
): value is string {
  return (
    typeof value === "string" &&
    (options.allowEmpty === true || value.length > 0) &&
    !CONTROL_CHAR_RE.test(value) &&
    !FORMAT_CONTROL_RE.test(value)
  );
}

export function escapeReportText(value: string): string {
  return sanitizeReportText(value).replace(
    MARKDOWN_ESCAPE_RE,
    (char) => `\\${char}`,
  );
}

export function sanitizeReportText(value: string): string {
  return value
    .replace(CONTROL_CHAR_GLOBAL_RE, "")
    .replace(FORMAT_CONTROL_GLOBAL_RE, "");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidTimestamp(value: unknown): value is string {
  if (!isSafeReportString(value)) return false;
  const timestamp = new Date(value);
  return (
    Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createSuiteMetadataPayload(
  suite: BenchmarkSuite,
): SuiteMetadataWithoutFingerprint {
  const categories = suite.categories.map((category) => {
    const fixtures = category.fixtureIds.map((fixtureId) => {
      const expectedVerdict = category.expectedVerdicts[fixtureId];
      if (!expectedVerdict) {
        throw new Error(
          `Benchmark suite "${suite.id}" is missing expected verdict for fixture "${fixtureId}"`,
        );
      }
      return {
        id: fixtureId,
        expectedVerdict,
        contentHash: sha256(requireFixtureContent(fixtureId)),
      };
    });
    return {
      name: category.name,
      weight: category.weight,
      fixtureCount: fixtures.length,
      fixtures,
    };
  });
  const fixtureContentHashes = categories.flatMap((category) =>
    category.fixtures.map((fixture) => fixture.contentHash),
  );
  const uniqueFixturePayloadCount = new Set(fixtureContentHashes).size;
  const coverageMode: BenchmarkReportCoverageMode =
    uniqueFixturePayloadCount < fixtureContentHashes.length
      ? "anchor_smoke"
      : "materialized_corpus";

  return {
    id: suite.id,
    name: suite.name,
    version: suite.version,
    fixtureCount: fixtureContentHashes.length,
    coverageMode,
    uniqueFixturePayloadCount,
    categories,
  };
}

function fingerprintSuiteMetadata(
  metadata: SuiteMetadataWithoutFingerprint,
): string {
  return sha256(JSON.stringify(metadata));
}

export function createBenchmarkSuiteFingerprint(suite: BenchmarkSuite): string {
  return fingerprintSuiteMetadata(createSuiteMetadataPayload(suite));
}

function createSuiteMetadata(
  suite: BenchmarkSuite,
): BenchmarkReportSuiteMetadata {
  const payload = createSuiteMetadataPayload(suite);
  return {
    ...payload,
    fingerprint: fingerprintSuiteMetadata(payload),
  };
}

export function createBenchmarkRunReport(
  result: BenchmarkResult,
  suite: BenchmarkSuite,
  generatedAt = new Date().toISOString(),
): BenchmarkRunReport {
  if (!isValidTimestamp(generatedAt)) {
    throw new Error(
      "Benchmark report generatedAt must be a canonical ISO timestamp",
    );
  }
  const suiteMetadata = createSuiteMetadata(suite);
  const categoryWeights = extractCategoryWeights(suiteMetadata);
  if (
    !isBenchmarkResult(result, categoryWeights) ||
    result.suiteId !== suiteMetadata.id ||
    !hasConsistentBreakdownWithSuite(result, suiteMetadata)
  ) {
    throw new Error(
      `Benchmark result "${result.suiteId}" is not consistent with suite "${suite.id}"`,
    );
  }

  return {
    schemaVersion: BENCHMARK_REPORT_SCHEMA_VERSION,
    generatedAt,
    suite: suiteMetadata,
    result,
  };
}

export function countBenchmarkCorrect(result: BenchmarkResult): number {
  return result.breakdown.filter((item) => item.correct).length;
}

export function formatBenchmarkSummary(
  result: BenchmarkResult,
  suite?: BenchmarkSuite,
): string {
  const total = result.breakdown.length;
  const correct = countBenchmarkCorrect(result);
  const suiteName = escapeReportText(suite?.name ?? result.suiteId);
  const suiteMetadata = suite ? createSuiteMetadata(suite) : undefined;
  const lines = [
    "# DojoLM Benchmark Report",
    "",
    `Suite: ${suiteName}`,
    `Suite ID: ${escapeReportText(result.suiteId)}`,
    ...(suiteMetadata
      ? [
          `Coverage Mode: ${suiteMetadata.coverageMode}`,
          `Unique Payloads: ${suiteMetadata.uniqueFixturePayloadCount}/${suiteMetadata.fixtureCount}`,
          `Suite Fingerprint: ${suiteMetadata.fingerprint}`,
        ]
      : []),
    `Model: ${escapeReportText(result.modelName || result.modelId)}`,
    `Provider: ${escapeReportText(result.provider || "unknown")}`,
    `Executed: ${result.executedAt}`,
    `Elapsed: ${result.elapsed}ms`,
    `Overall Score: ${result.overallScore.toFixed(2)}`,
    `Correct: ${correct}/${total}`,
    "",
    "Category Scores:",
  ];

  for (const [category, score] of Object.entries(result.categoryScores)) {
    lines.push(`- ${escapeReportText(category)}: ${(score * 100).toFixed(1)}%`);
  }

  return `${lines.join("\n")}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategoryScores(
  value: unknown,
): value is Readonly<Record<string, number>> {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([category, score]) =>
      isSafeReportString(category) &&
      isFiniteNumber(score) &&
      score >= 0 &&
      score <= 1,
  );
}

function isBreakdown(value: unknown): value is BenchmarkResult["breakdown"] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!isRecord(item)) return false;
    return (
      isSafeReportString(item.fixtureId) &&
      isSafeReportString(item.category) &&
      (item.expectedVerdict === "BLOCK" || item.expectedVerdict === "ALLOW") &&
      (item.actualVerdict === "BLOCK" || item.actualVerdict === "ALLOW") &&
      typeof item.correct === "boolean" &&
      item.correct === (item.expectedVerdict === item.actualVerdict) &&
      (item.severity === "easy" ||
        item.severity === "medium" ||
        item.severity === "hard")
    );
  });
}

function hasConsistentCategoryScores(result: BenchmarkResult): boolean {
  const expectedScores = new Map<string, { correct: number; total: number }>();
  for (const item of result.breakdown) {
    const score = expectedScores.get(item.category) ?? { correct: 0, total: 0 };
    expectedScores.set(item.category, {
      correct: score.correct + (item.correct ? 1 : 0),
      total: score.total + 1,
    });
  }

  const expectedCategories = [...expectedScores.keys()].sort();
  const actualCategories = Object.keys(result.categoryScores).sort();
  if (expectedCategories.length !== actualCategories.length) return false;
  if (
    expectedCategories.some(
      (category, index) => category !== actualCategories[index],
    )
  ) {
    return false;
  }

  return expectedCategories.every((category) => {
    const expected = expectedScores.get(category)!;
    const actualScore = result.categoryScores[category];
    return Math.abs(actualScore - expected.correct / expected.total) < 0.000001;
  });
}

function roundOverallScore(score: number): number {
  return Math.round(score * 10000) / 100;
}

function hasConsistentOverallScore(
  result: BenchmarkResult,
  categoryWeights?: Readonly<Record<string, number>>,
): boolean {
  if (result.breakdown.length === 0) {
    return result.overallScore === 0;
  }

  if (categoryWeights) {
    const scoreEntries = Object.entries(result.categoryScores);
    if (
      scoreEntries.length !== Object.keys(categoryWeights).length ||
      scoreEntries.some(([category]) => categoryWeights[category] === undefined)
    ) {
      return false;
    }
    const totalWeight = Object.values(categoryWeights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (totalWeight <= 0) return false;
    const weightedScore = scoreEntries.reduce(
      (sum, [category, score]) => sum + score * categoryWeights[category],
      0,
    );
    return (
      Math.abs(
        result.overallScore - roundOverallScore(weightedScore / totalWeight),
      ) < 0.000001
    );
  }

  const categoryScores = Object.values(result.categoryScores);
  const unweightedScore =
    categoryScores.reduce((sum, score) => sum + score, 0) /
    categoryScores.length;
  return (
    Math.abs(result.overallScore - roundOverallScore(unweightedScore)) <
    0.000001
  );
}

export function isBenchmarkResult(
  value: unknown,
  categoryWeights?: Readonly<Record<string, number>>,
): value is BenchmarkResult {
  if (!isRecord(value)) return false;
  const candidate = value as unknown as BenchmarkResult;
  if (
    isSafeReportString(value.suiteId) &&
    isSafeReportString(value.modelId) &&
    isSafeReportString(value.modelName, { allowEmpty: true }) &&
    isSafeReportString(value.provider, { allowEmpty: true }) &&
    isFiniteNumber(value.overallScore) &&
    value.overallScore >= 0 &&
    value.overallScore <= 100 &&
    isCategoryScores(value.categoryScores) &&
    isBreakdown(value.breakdown) &&
    isValidTimestamp(value.executedAt) &&
    isFiniteNumber(value.elapsed) &&
    value.elapsed >= 0
  ) {
    return (
      hasConsistentCategoryScores(candidate) &&
      hasConsistentOverallScore(candidate, categoryWeights)
    );
  }
  return false;
}

function extractCategoryWeights(
  suiteMetadata: BenchmarkReportSuiteMetadata,
): Readonly<Record<string, number>> {
  const weights: Record<string, number> = {};
  for (const category of suiteMetadata.categories) {
    weights[category.name] = category.weight;
  }

  return weights;
}

function parseReportFixture(value: unknown): BenchmarkReportFixture | null {
  if (!isRecord(value)) return null;
  if (
    isSafeReportString(value.id) &&
    (value.expectedVerdict === "BLOCK" || value.expectedVerdict === "ALLOW") &&
    isSafeReportString(value.contentHash) &&
    SHA256_RE.test(value.contentHash)
  ) {
    return {
      id: value.id,
      expectedVerdict: value.expectedVerdict,
      contentHash: value.contentHash,
    };
  }
  return null;
}

function parseReportCategory(value: unknown): BenchmarkReportCategory | null {
  if (!isRecord(value) || !Array.isArray(value.fixtures)) return null;
  const fixtureCount = value.fixtureCount;
  if (
    !isSafeReportString(value.name) ||
    !isFiniteNumber(value.weight) ||
    value.weight < 0 ||
    typeof fixtureCount !== "number" ||
    !Number.isInteger(fixtureCount) ||
    fixtureCount < 0 ||
    fixtureCount !== value.fixtures.length
  ) {
    return null;
  }

  const fixtures = value.fixtures.map(parseReportFixture);
  if (fixtures.some((fixture) => fixture === null)) return null;
  const parsedFixtures = fixtures as BenchmarkReportFixture[];
  const fixtureIds = new Set(parsedFixtures.map((fixture) => fixture.id));
  if (fixtureIds.size !== parsedFixtures.length) return null;

  return {
    name: value.name,
    weight: value.weight,
    fixtureCount,
    fixtures: parsedFixtures,
  };
}

function parseSuiteMetadataScalars(
  value: unknown,
): ParsedSuiteMetadataScalars | null {
  if (!isRecord(value) || !Array.isArray(value.categories)) return null;
  const fixtureCount = value.fixtureCount;
  const uniqueFixturePayloadCount = value.uniqueFixturePayloadCount;
  if (
    !isSafeReportString(value.id) ||
    !isSafeReportString(value.name) ||
    !isSafeReportString(value.version) ||
    typeof fixtureCount !== "number" ||
    !Number.isInteger(fixtureCount) ||
    fixtureCount < 0 ||
    (value.coverageMode !== "anchor_smoke" &&
      value.coverageMode !== "materialized_corpus") ||
    typeof uniqueFixturePayloadCount !== "number" ||
    !Number.isInteger(uniqueFixturePayloadCount) ||
    uniqueFixturePayloadCount < 0 ||
    !isSafeReportString(value.fingerprint) ||
    !SHA256_RE.test(value.fingerprint)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    version: value.version,
    fixtureCount,
    coverageMode: value.coverageMode,
    uniqueFixturePayloadCount,
    fingerprint: value.fingerprint,
    categories: value.categories,
  };
}

function parseSuiteCategories(
  values: readonly unknown[],
): readonly BenchmarkReportCategory[] | null {
  const categories = values.map(parseReportCategory);
  if (categories.some((category) => category === null)) return null;
  const parsedCategories = categories as BenchmarkReportCategory[];
  const categoryNames = new Set(
    parsedCategories.map((category) => category.name),
  );
  if (categoryNames.size !== parsedCategories.length) return null;
  return parsedCategories;
}

function summarizeSuiteFixtureEvidence(
  categories: readonly BenchmarkReportCategory[],
): {
  readonly totalFixtureCount: number;
  readonly fixtureHashes: Set<string>;
} | null {
  const fixtureIds = new Set<string>();
  const fixtureHashes = new Set<string>();
  let totalFixtureCount = 0;
  for (const category of categories) {
    totalFixtureCount += category.fixtureCount;
    for (const fixture of category.fixtures) {
      if (fixtureIds.has(fixture.id)) return null;
      fixtureIds.add(fixture.id);
      fixtureHashes.add(fixture.contentHash);
    }
  }
  return { totalFixtureCount, fixtureHashes };
}

function deriveCoverageMode(
  totalFixtureCount: number,
  fixtureHashes: ReadonlySet<string>,
): BenchmarkReportCoverageMode {
  return fixtureHashes.size < totalFixtureCount
    ? "anchor_smoke"
    : "materialized_corpus";
}

function parseSuiteMetadata(
  value: unknown,
): BenchmarkReportSuiteMetadata | null {
  const scalars = parseSuiteMetadataScalars(value);
  if (!scalars) return null;
  const parsedCategories = parseSuiteCategories(scalars.categories);
  if (!parsedCategories) return null;
  const summary = summarizeSuiteFixtureEvidence(parsedCategories);
  if (!summary) return null;
  if (
    summary.totalFixtureCount !== scalars.fixtureCount ||
    summary.fixtureHashes.size !== scalars.uniqueFixturePayloadCount
  ) {
    return null;
  }

  const coverageMode = deriveCoverageMode(
    summary.totalFixtureCount,
    summary.fixtureHashes,
  );
  if (coverageMode !== scalars.coverageMode) return null;

  const payload: SuiteMetadataWithoutFingerprint = {
    id: scalars.id,
    name: scalars.name,
    version: scalars.version,
    fixtureCount: scalars.fixtureCount,
    coverageMode: scalars.coverageMode,
    uniqueFixturePayloadCount: scalars.uniqueFixturePayloadCount,
    categories: parsedCategories,
  };
  if (fingerprintSuiteMetadata(payload) !== scalars.fingerprint) return null;

  return {
    ...payload,
    fingerprint: scalars.fingerprint,
  };
}

function hasConsistentBreakdownWithSuite(
  result: BenchmarkResult,
  suiteMetadata: BenchmarkReportSuiteMetadata,
): boolean {
  const expectedFixtures = new Map<
    string,
    { readonly category: string; readonly expectedVerdict: "BLOCK" | "ALLOW" }
  >();
  for (const category of suiteMetadata.categories) {
    for (const fixture of category.fixtures) {
      expectedFixtures.set(fixture.id, {
        category: category.name,
        expectedVerdict: fixture.expectedVerdict,
      });
    }
  }

  if (result.breakdown.length !== expectedFixtures.size) return false;
  const seen = new Set<string>();
  for (const item of result.breakdown) {
    const expected = expectedFixtures.get(item.fixtureId);
    if (
      !expected ||
      seen.has(item.fixtureId) ||
      item.category !== expected.category ||
      item.expectedVerdict !== expected.expectedVerdict
    ) {
      return false;
    }
    seen.add(item.fixtureId);
  }
  return seen.size === expectedFixtures.size;
}

function isWrappedReportPayload(payload: Record<string, unknown>): boolean {
  return (
    payload.schemaVersion !== undefined ||
    payload.suite !== undefined ||
    payload.generatedAt !== undefined
  );
}

function parseWrappedReportPayload(
  payload: Record<string, unknown>,
): BenchmarkRunReport {
  if (
    payload.schemaVersion !== BENCHMARK_REPORT_SCHEMA_VERSION ||
    !isValidTimestamp(payload.generatedAt)
  ) {
    throw new Error("No benchmark results found in JSON payload");
  }

  const suiteMetadata = parseSuiteMetadata(payload.suite);
  if (!suiteMetadata) {
    throw new Error("No benchmark results found in JSON payload");
  }

  const categoryWeights = extractCategoryWeights(suiteMetadata);
  const knownSuite = getBenchmarkSuiteEvidence(suiteMetadata.id);
  if (
    !isBenchmarkResult(payload.result, categoryWeights) ||
    payload.result.suiteId !== suiteMetadata.id ||
    !hasConsistentBreakdownWithSuite(payload.result, suiteMetadata) ||
    knownSuite === undefined ||
    createBenchmarkSuiteFingerprint(knownSuite) !== suiteMetadata.fingerprint
  ) {
    throw new Error("No benchmark results found in JSON payload");
  }

  return {
    schemaVersion: BENCHMARK_REPORT_SCHEMA_VERSION,
    generatedAt: payload.generatedAt,
    suite: suiteMetadata,
    result: payload.result,
  };
}

export function parseBenchmarkReportsPayload(
  payload: unknown,
): BenchmarkRunReport[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => parseBenchmarkReportsPayload(item));
  }

  if (isRecord(payload)) {
    if (isWrappedReportPayload(payload)) {
      return [parseWrappedReportPayload(payload)];
    }
    if (Array.isArray(payload.results)) {
      return parseBenchmarkReportsPayload(payload.results);
    }
  }

  throw new Error("No benchmark results found in JSON payload");
}

export function parseBenchmarkResultsPayload(
  payload: unknown,
): BenchmarkResult[] {
  return parseBenchmarkReportsPayload(payload).map((report) => report.result);
}
