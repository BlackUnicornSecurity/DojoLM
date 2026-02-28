/**
 * TPI Security Test Lab — Type Definitions
 *
 * Core types for the prompt injection scanner engine.
 * All scanner patterns, findings, and fixture metadata are strictly typed.
 */
export declare const SEVERITY: {
    readonly INFO: "INFO";
    readonly WARNING: "WARNING";
    readonly CRITICAL: "CRITICAL";
};
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
export type Verdict = 'BLOCK' | 'ALLOW';
export interface Finding {
    category: string;
    severity: Severity;
    description: string;
    match: string;
    source: 'current' | string;
    engine: string;
    pattern_name?: string;
    weight?: number;
    lang?: string;
}
export interface ScanResult {
    findings: Finding[];
    verdict: Verdict;
    elapsed: number;
    textLength: number;
    normalizedLength: number;
    counts: {
        critical: number;
        warning: number;
        info: number;
    };
}
export interface RegexPattern {
    name: string;
    cat: string;
    sev: Severity;
    re: RegExp;
    desc: string;
    source?: string;
    weight?: number;
    lang?: string;
}
export interface CustomPattern {
    name: string;
    cat: string;
    sev: Severity;
    desc: string;
    source?: string;
    custom: string;
}
export type ScannerPattern = RegexPattern | CustomPattern;
export interface FixtureFile {
    file: string;
    attack: string | null;
    severity: Severity | null;
    clean: boolean;
}
export interface FixtureCategory {
    story: string;
    desc: string;
    files: FixtureFile[];
}
export interface FixtureManifest {
    generated: string;
    version: string;
    description: string;
    categories: Record<string, FixtureCategory>;
}
export interface BinaryMetadata {
    format: string;
    magic: string;
    valid_jpeg?: boolean;
    valid_png?: boolean;
    valid_wav?: boolean;
    has_id3?: boolean;
    extracted_text?: string;
    polyglot?: string;
    warning?: string;
}
export interface TextFixtureResponse {
    path: string;
    content: string;
    size: number;
}
export interface BinaryFixtureResponse {
    path: string;
    size: number;
    hex_preview: string;
    metadata: BinaryMetadata;
}
export interface PayloadEntry {
    title: string;
    desc: string;
    status: 'current' | 'planned';
    story: string;
    example: string;
}
export interface CoverageEntry {
    category: string;
    pre: number;
    post: number;
    stories: string;
    gap: boolean;
}
export interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration_ms: number;
    output: string;
    required: boolean;
}
export interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
}
export interface TestSuiteResult {
    summary: TestSummary;
    results: TestResult[];
    timestamp: string;
}
//# sourceMappingURL=types.d.ts.map