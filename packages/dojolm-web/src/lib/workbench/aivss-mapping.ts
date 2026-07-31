// SPDX-License-Identifier: Apache-2.0
/**
 * Workbench (Shingan trust-scan) finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-WORKBENCH — V1→V2 Restoration program (sixth G.3
 * surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Shingan supply-chain
 * trust-scan workbench (the Findings panel beneath the trust gauge / layer
 * breakdown).
 *
 * Workbench "findings" surface = the cross-engine Shingan findings list
 * (closest analog to the scanner findings table — rows aggregating the L1..L6
 * pattern engines: metadata · payload · exfil · social · supply-chain ·
 * memory/context). Each finding row carries a `category` (closed
 * 19-pattern `SKILL_*` taxonomy emitted by `bu-tpi/shingan` modules) +
 * `severity` (closed 3-value `'INFO' | 'WARNING' | 'CRITICAL'` enum,
 * shared with the v1 scanner pipeline).
 *
 * Mapping strategy:
 *   - finding.category (closed 19-value `SKILL_*` enum at the server edge;
 *     widened to `string` at the client edge by `sanitizeFinding`) is
 *     bucketed into the closed {@link AttackKind} taxonomy via
 *     {@link WORKBENCH_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every emitted `SKILL_*` category. Values outside the closed table
 *     fall through to the EXPLICIT `'unknown'` kind (defence-in-depth for
 *     the client-edge sanitization layer; NOT a silent default — mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki sister modules).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki mappings verbatim for
 *     cross-domain consistency).
 *   - finding.severity (closed 3-value `WorkbenchSeverity` enum: same
 *     `'INFO' | 'WARNING' | 'CRITICAL'` shape as the v1 scanner — see
 *     `packages/bu-tpi/src/types.ts` `Severity`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL → high,
 *         WARNING → medium, INFO → low — mirrors the scanner 3-value
 *         mapping verbatim).
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL → high, WARNING → low, INFO → none — mirrors the
 *         scanner 3-value mapping verbatim).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Shingan trust-scans target
 *     network-reachable supply-chain inputs — agent / skill / plugin
 *     manifests fetched from external repos; adjacency / local /
 *     physical surface-area is not representable on this surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Shingan runs against
 *     production-ingestion posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Shingan surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/shingan/scan` response is a separate
 * follow-up (TICKET-G3-API). This file is the CLIENT-SIDE derivation
 * only, mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI + G-3-KAGAMI
 * + G-3-BUKI pattern.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — sister module
 */

import type {
  AivssAttackComplexity,
  AivssAttackVector,
  AivssDs,
  AivssImpact,
  AivssMc,
  AivssMetrics,
  AivssPis,
} from 'bu-tpi/aivss';

/**
 * Closed 3-value Workbench severity enum. Mirrors the v1 scanner
 * `Severity` triple (`packages/bu-tpi/src/types.ts`); the Shingan
 * trust-scan engine emits the same shape so we re-declare it locally
 * (rather than importing) to keep the mapping module pure /
 * unit-testable in isolation.
 *
 * Mirrors the `ScanFindingSeverity` declaration in the scanner sister
 * module verbatim.
 */
export type WorkbenchSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Local Finding shape used by the Workbench (Shingan) findings panel.
 * Mirrors the narrowed subset of `FindingLite` declared in
 * `ShinganClient.tsx` — `category` + `severity` are the sufficient
 * inputs for the AIVSS mapping.
 *
 * Re-declared here (not imported as `Pick<FindingLite, ...>`) to keep
 * this mapping module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` + `MitsukeFinding` + `AtemiFinding` + `KagamiFinding` +
 * `BukiFinding` declarations in the sister modules.
 *
 * `category` is typed as `string` (not the closed `SKILL_*` literal
 * union) so the mapper accepts the widened client-edge shape. The
 * closed enum is enforced server-side via the `SKILL_*` pattern
 * categories; `'unknown'` is the explicit fallback for any value that
 * bypasses the server-side gate (defence-in-depth for the client-edge
 * sanitization layer).
 */
export interface WorkbenchFinding {
  readonly category: string;
  readonly severity: WorkbenchSeverity;
}

/**
 * Closed taxonomy of Workbench-attack kinds — bucketing layer between
 * the 19-value `SKILL_*` category enum and the 2-state
 * AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki sister modules so cross-domain consumers can
 * later share a hoisted map. Per-domain divergence today: every
 * `SKILL_*` category slots into one of the 5 named kinds; the 19-value
 * enum is wider than the 8-value Atemi/Kagami enums but narrower than
 * the ~67-pattern scanner enum.
 *
 * `'unknown'` is the EXPLICIT slot for a `category` string that bypasses
 * the server-side closed-enum gate (defence-in-depth for the
 * client-edge sanitization layer) — NOT a silent default.
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner / Mitsuke /
 * Atemi / Kagami / Buki versions verbatim — kept duplicated rather than
 * hoisted because per-domain divergence on the input side is large
 * enough that a hoist would couple the six domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — sister table
 */
export const KIND_TO_AC: Readonly<Record<AttackKind, AivssAttackComplexity>> =
  Object.freeze({
    jailbreak: 'high',
    encoding: 'low',
    injection: 'low',
    override: 'low',
    social: 'low',
    unknown: 'low',
  });

/**
 * Severity → AivssPis (Prompt Injection Success rate) for Workbench
 * findings. The 3-value `WorkbenchSeverity` enum maps directly to the
 * 3-value `AivssPis` enum (mirrors the scanner 3-value mapping verbatim):
 *
 * - CRITICAL → `'high'` (>50% success — high-confidence indicator with
 *   active exploit signal)
 * - WARNING → `'medium'` (10–50% — calibrated mid-band)
 * - INFO → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<WorkbenchSeverity, AivssPis>> =
  Object.freeze({
    INFO: 'low',
    WARNING: 'medium',
    CRITICAL: 'high',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - CRITICAL → `'high'` (full / large compromise of the dimension)
 * - WARNING → `'low'` (partial / bounded compromise)
 * - INFO → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the scanner 3-value mapping verbatim.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<WorkbenchSeverity, AivssImpact>> =
  Object.freeze({
    INFO: 'none',
    WARNING: 'low',
    CRITICAL: 'high',
  });

/**
 * Default attack vector. Shingan trust-scans target network-reachable
 * supply-chain inputs (agent / skill / plugin manifests fetched from
 * GitHub or pasted from external sources); adjacent / local / physical
 * surface-area is not representable on this surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Shingan is tuned for tier-1
 * (production user-facing) posture; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Shingan runs against in-flight skill /
 * agent / manifest content which by default is 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification plumbs
 * through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Shingan pattern category emitted by
 * the `bu-tpi/modules/shingan-*` engines to its {@link AttackKind}
 * bucket. Test GW-003 verifies every entry resolves to a non-`'unknown'`
 * kind (the table is intentionally NOT bound to a derived
 * `Record<SkillCategory, AttackKind>` because the `bu-tpi/shingan`
 * package does not yet export a closed `SkillCategory` union — the
 * 19 categories live as raw `cat: '...'` literals in the pattern
 * arrays).
 *
 * Bucketing rationale (each category → kind):
 *   - `SKILL_METADATA_POISONING` — frontmatter / metadata override of
 *     the host's safety constraints. Authority flip at the
 *     metadata-parser boundary. Bucket → `'override'`.
 *   - `SKILL_PAYLOAD_INJECTION` — direct embedding of executable
 *     payload into the skill body. Bucket → `'injection'`.
 *   - `SKILL_ENCODED_PAYLOAD` — base64 / unicode / hex obfuscation of
 *     the payload. Single-shot transformation. Bucket → `'encoding'`.
 *   - `SKILL_OBFUSCATION` — non-encoded structural obfuscation
 *     (whitespace, comments, dead code paths). Single-shot
 *     transformation. Bucket → `'encoding'`.
 *   - `SKILL_RUG_PULL` — benign-on-install, malicious-on-update
 *     supply-chain pattern. Authority flip at the trust-on-install
 *     boundary. Bucket → `'override'`.
 *   - `SKILL_TOOL_OVERRIDE` — tool-call hijack / function-call
 *     override. Authority flip at the tool registry. Bucket →
 *     `'override'`.
 *   - `SKILL_DATA_EXFILTRATION` — egress channel that ships secrets /
 *     PII out of the host. Direct injection class regardless of
 *     channel. Bucket → `'injection'`.
 *   - `SKILL_CREDENTIAL_HARVEST` — token / api-key / cookie harvesting.
 *     Direct injection of a harvest payload. Bucket → `'injection'`.
 *   - `SKILL_ENV_SNIFFING` — environment-variable / secret-store
 *     enumeration. Direct injection of an enumeration probe.
 *     Bucket → `'injection'`.
 *   - `SKILL_PRIVILEGE_ESCALATION` — attempt to acquire higher
 *     privilege than declared. Authority flip. Bucket → `'override'`.
 *   - `SKILL_SOCIAL_ENGINEERING` — single-shot social-engineering
 *     pretext at the skill / agent layer. Bucket → `'social'`.
 *   - `SKILL_IMPERSONATION` — claimed-author / claimed-vendor identity
 *     spoofing. Single-shot pretext. Bucket → `'social'`.
 *   - `SKILL_TYPOSQUATTING` — name-confusable supply-chain attack
 *     (e.g. `clade-agent` vs `claude-agent`). Single-shot pretext at
 *     the install-name boundary. Bucket → `'social'`.
 *   - `SKILL_NAMESPACE_CONFUSION` — registry / namespace confusion
 *     between public + private package indices. Single-shot pretext
 *     at the resolver boundary. Bucket → `'social'`.
 *   - `SKILL_VERSION_ATTACK` — semver / pinning manipulation to ship
 *     malicious updates under benign-looking version bumps. Authority
 *     flip at the version-pinning boundary. Bucket → `'override'`.
 *   - `SKILL_DEPENDENCY_SHADOW` — shadow-dep / transitive supply-chain
 *     attack. Direct injection of a malicious transitive package.
 *     Bucket → `'injection'`.
 *   - `SKILL_BOUNDARY_ESCAPE` — context-window / sandbox / scope
 *     escape attempt. System constraint flip. Bucket → `'override'`.
 *   - `SKILL_CONTEXT_POISONING` — long-term memory / context-store
 *     manipulation. Authority flip at the memory boundary. Bucket →
 *     `'override'`.
 *   - `SKILL_CONTEXT_STUFFING` — context-window saturation to displace
 *     system instructions. System constraint flip. Bucket →
 *     `'override'`.
 *
 * UPDATING: when a new `SKILL_*` category lands (search:
 * `cat: 'SKILL_<NEW>'` in `packages/bu-tpi/src/modules/shingan-*.ts`),
 * add a row here mapping it to the appropriate kind. New categories
 * that slip through fall to the `'unknown'` kind via
 * {@link bucketCategory} — they still score, but with a conservative
 * mapping, and test GW-003 will fail to remind future maintainers to
 * make the mapping explicit.
 */
export const WORKBENCH_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    // Metadata layer (L1) — frontmatter authority flip
    SKILL_METADATA_POISONING: 'override',

    // Payload layer (L2) — direct embed + obfuscation variants
    SKILL_PAYLOAD_INJECTION: 'injection',
    SKILL_ENCODED_PAYLOAD: 'encoding',
    SKILL_OBFUSCATION: 'encoding',
    SKILL_RUG_PULL: 'override',
    SKILL_TOOL_OVERRIDE: 'override',

    // Exfiltration layer (L3) — egress / enumeration / privilege
    SKILL_DATA_EXFILTRATION: 'injection',
    SKILL_CREDENTIAL_HARVEST: 'injection',
    SKILL_ENV_SNIFFING: 'injection',
    SKILL_PRIVILEGE_ESCALATION: 'override',

    // Social layer (L4) — pretext / impersonation
    SKILL_SOCIAL_ENGINEERING: 'social',
    SKILL_IMPERSONATION: 'social',

    // Supply-chain layer (L5) — name / version / dep manipulation
    SKILL_TYPOSQUATTING: 'social',
    SKILL_NAMESPACE_CONFUSION: 'social',
    SKILL_VERSION_ATTACK: 'override',
    SKILL_DEPENDENCY_SHADOW: 'injection',

    // Memory/context layer (L6) — boundary / poison / saturation
    SKILL_BOUNDARY_ESCAPE: 'override',
    SKILL_CONTEXT_POISONING: 'override',
    SKILL_CONTEXT_STUFFING: 'override',
  });

/**
 * Bucket a raw `category` string into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link WORKBENCH_CATEGORY_TO_KIND}. The server-side scan engine emits
 * the closed `SKILL_*` taxonomy, so concrete narrowing calls resolve to
 * a non-`'unknown'` kind today; the `'unknown'` branch is
 * defence-in-depth for the client-edge sanitization layer (which
 * widens the wire shape to `string`). This is the EXPLICIT unknown
 * slot — we do NOT silently fall through to a default kind that would
 * mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = WORKBENCH_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Workbench finding (Shingan
 * trust-scan row).
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Workbench finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Workbench findings AIVSS field
 */
export function findingToAivssMetrics(finding: WorkbenchFinding): AivssMetrics {
  const kind = bucketCategory(finding.category);
  const attackComplexity = KIND_TO_AC[kind];
  const promptInjectionSuccess = SEVERITY_TO_PIS[finding.severity];
  const impact = SEVERITY_TO_IMPACT[finding.severity];

  return {
    attackVector: DEFAULT_ATTACK_VECTOR,
    attackComplexity,
    promptInjectionSuccess,
    modelCriticality: DEFAULT_MODEL_CRITICALITY,
    dataSensitivity: DEFAULT_DATA_SENSITIVITY,
    confidentialityImpact: impact,
    integrityImpact: impact,
    availabilityImpact: impact,
  };
}
