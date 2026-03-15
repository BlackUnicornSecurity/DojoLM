/**
 * H9.3: NIST AI RMF Detailed Mapping
 * Maps NIST AI RMF functions (Govern, Map, Measure, Manage) and their
 * subcategories to DojoLM scanner modules and fixture categories.
 *
 * Cross-referenced with:
 *   - NIST_AI_600_1 controls from frameworks.ts
 *   - MODULE_CONTROL_MAP from mapper.ts
 *   - CROSS-FRAMEWORK-MAP.md (team/docs/archive/compliance-checklists/)
 *
 * INDEX:
 * - NistAiRmfMapping interface
 * - NIST_AI_RMF_MAPPINGS constant (all mappings)
 * - getMappingsByFunction() — filter by GOVERN/MAP/MEASURE/MANAGE
 * - getModulesForControl() — scanner modules for a control ID
 * - getFunctionCoverage() — coverage stats per function
 */

/**
 * A single mapping entry linking a NIST AI RMF subcategory to scanner capabilities.
 */
export interface NistAiRmfMapping {
  /** NIST AI RMF top-level function */
  readonly function: 'GOVERN' | 'MAP' | 'MEASURE' | 'MANAGE';
  /** Human-readable subcategory label */
  readonly subcategory: string;
  /** Control ID from NIST_AI_600_1 in frameworks.ts */
  readonly controlId: string;
  /** Scanner module names from MODULE_CONTROL_MAP */
  readonly scannerModules: readonly string[];
  /** Fixture category names from CATEGORY_CONTROL_MAP */
  readonly fixtureCategories: readonly string[];
  /** How the scanner addresses this subcategory */
  readonly coverageType: 'automated' | 'supporting' | 'manual';
  /** Description of evidence produced */
  readonly evidenceDescription: string;
}

/**
 * Complete NIST AI RMF mapping covering all 8 NIST_AI_600_1 controls.
 *
 * GOVERN — Policies, accountability, explainability
 * MAP    — Context identification, risk scoping, validation
 * MEASURE — Metrics, evaluation, bias, robustness, privacy
 * MANAGE — Risk treatment, safety, security remediation
 */
export const NIST_AI_RMF_MAPPINGS: readonly NistAiRmfMapping[] = [
  // =========================================================================
  // GOVERN — Policies and accountability
  // =========================================================================
  {
    function: 'GOVERN',
    subcategory: 'GV-1: AI governance policies and accountability',
    controlId: 'NIST-ACCOUNT',
    scannerModules: ['overreliance-detector'],
    fixtureCategories: ['or'],
    coverageType: 'supporting',
    evidenceDescription:
      'Overreliance testing validates accountability mechanisms; organizational policy documentation requires manual review',
  },
  {
    function: 'GOVERN',
    subcategory: 'GV-2: AI transparency and explainability policies',
    controlId: 'NIST-EXPLAIN',
    scannerModules: [],
    fixtureCategories: [],
    coverageType: 'manual',
    evidenceDescription:
      'Explainability requires organizational documentation of AI decision-making rationale; no automated scanner coverage',
  },
  {
    function: 'GOVERN',
    subcategory: 'GV-3: AI privacy governance',
    controlId: 'NIST-PRIV',
    scannerModules: ['pii-detector', 'env-detector'],
    fixtureCategories: ['environmental'],
    coverageType: 'supporting',
    evidenceDescription:
      'PII and environment detectors identify privacy violations; governance policy review is manual',
  },

  // =========================================================================
  // MAP — Context and risk identification
  // =========================================================================
  {
    function: 'MAP',
    subcategory: 'MP-1: Context and risk identification for AI systems',
    controlId: 'NIST-VALID',
    scannerModules: ['bias-detector', 'overreliance-detector'],
    fixtureCategories: ['bias', 'or'],
    coverageType: 'supporting',
    evidenceDescription:
      'Bias and overreliance testing identifies context-specific risks in AI system behavior',
  },
  {
    function: 'MAP',
    subcategory: 'MP-2: AI system security risk mapping',
    controlId: 'NIST-SEC',
    scannerModules: [
      'ssrf-detector',
      'xxe-protopollution',
      'supply-chain-detector',
      'session-bypass',
      'vectordb-interface',
    ],
    fixtureCategories: ['web', 'supply-chain', 'session', 'delivery-vectors'],
    coverageType: 'automated',
    evidenceDescription:
      'Security vulnerability scanning identifies attack surface across SSRF, XXE, supply chain, session, and vector DB vectors',
  },
  {
    function: 'MAP',
    subcategory: 'MP-3: AI safety risk scoping',
    controlId: 'NIST-SAFE',
    scannerModules: ['dos-detector'],
    fixtureCategories: ['dos'],
    coverageType: 'supporting',
    evidenceDescription:
      'DoS detection identifies availability and safety risks; broader safety risk scoping requires manual review',
  },

  // =========================================================================
  // MEASURE — Assessment and analysis
  // =========================================================================
  {
    function: 'MEASURE',
    subcategory: 'MS-1: AI bias metrics and fairness evaluation',
    controlId: 'NIST-BIAS',
    scannerModules: ['bias-detector'],
    fixtureCategories: ['bias'],
    coverageType: 'automated',
    evidenceDescription:
      'Automated bias detection across demographic, stereotype, and anchoring patterns provides direct fairness metrics',
  },
  {
    function: 'MEASURE',
    subcategory: 'MS-2: AI robustness evaluation against adversarial inputs',
    controlId: 'NIST-ROBUST',
    scannerModules: ['enhanced-pi', 'encoding-engine', 'core-patterns', 'fuzzing'],
    fixtureCategories: ['prompt-injection', 'encoded', 'multimodal', 'social'],
    coverageType: 'automated',
    evidenceDescription:
      'Robustness testing via prompt injection, encoding bypass, fuzzing, and adversarial input scanning',
  },
  {
    function: 'MEASURE',
    subcategory: 'MS-3: Privacy impact measurement in AI systems',
    controlId: 'NIST-PRIV',
    scannerModules: ['pii-detector', 'env-detector'],
    fixtureCategories: ['environmental'],
    coverageType: 'automated',
    evidenceDescription:
      'PII detection in inference outputs and environment scanning for credential exposure provide privacy impact metrics',
  },
  {
    function: 'MEASURE',
    subcategory: 'MS-4: AI system validation and verification metrics',
    controlId: 'NIST-VALID',
    scannerModules: ['bias-detector', 'overreliance-detector', 'enhanced-pi'],
    fixtureCategories: ['bias', 'or', 'prompt-injection'],
    coverageType: 'supporting',
    evidenceDescription:
      'Scanner results provide quantitative validation metrics; full V&V requires human review of test methodology',
  },
  {
    function: 'MEASURE',
    subcategory: 'MS-5: AI explainability assessment',
    controlId: 'NIST-EXPLAIN',
    scannerModules: [],
    fixtureCategories: [],
    coverageType: 'manual',
    evidenceDescription:
      'Explainability assessment requires human evaluation of AI decision transparency; no automated scanner coverage',
  },

  // =========================================================================
  // MANAGE — Risk treatment
  // =========================================================================
  {
    function: 'MANAGE',
    subcategory: 'MG-1: Security risk treatment and vulnerability remediation',
    controlId: 'NIST-SEC',
    scannerModules: [
      'ssrf-detector',
      'xxe-protopollution',
      'supply-chain-detector',
      'model-theft-detector',
      'session-bypass',
      'llm-security',
    ],
    fixtureCategories: ['web', 'supply-chain', 'model-theft', 'session', 'delivery-vectors'],
    coverageType: 'automated',
    evidenceDescription:
      'Security vulnerability scanning across SSRF, XXE, supply chain, model theft, and session vectors enables targeted remediation',
  },
  {
    function: 'MANAGE',
    subcategory: 'MG-2: Safety risk treatment and availability assurance',
    controlId: 'NIST-SAFE',
    scannerModules: ['dos-detector'],
    fixtureCategories: ['dos', 'token-attacks'],
    coverageType: 'automated',
    evidenceDescription:
      'DoS and token exhaustion testing validates availability controls and safety mechanisms',
  },
  {
    function: 'MANAGE',
    subcategory: 'MG-3: Robustness improvement and adversarial defense',
    controlId: 'NIST-ROBUST',
    scannerModules: ['enhanced-pi', 'encoding-engine', 'core-patterns', 'fuzzing'],
    fixtureCategories: ['prompt-injection', 'encoded', 'multimodal'],
    coverageType: 'automated',
    evidenceDescription:
      'Iterative adversarial testing via injection, encoding, and fuzzing drives robustness improvement cycles',
  },
  {
    function: 'MANAGE',
    subcategory: 'MG-4: Accountability enforcement and oversight',
    controlId: 'NIST-ACCOUNT',
    scannerModules: ['overreliance-detector'],
    fixtureCategories: ['or', 'search-results'],
    coverageType: 'supporting',
    evidenceDescription:
      'Overreliance detection validates human oversight prompts; full accountability enforcement requires organizational controls',
  },
  {
    function: 'MANAGE',
    subcategory: 'MG-5: Bias remediation and fairness assurance',
    controlId: 'NIST-BIAS',
    scannerModules: ['bias-detector'],
    fixtureCategories: ['bias'],
    coverageType: 'automated',
    evidenceDescription:
      'Bias detection results drive targeted remediation of demographic, stereotype, and anchoring biases',
  },
] as const;

/** Get all mappings for a given NIST AI RMF function */
export function getMappingsByFunction(
  fn: NistAiRmfMapping['function'],
): NistAiRmfMapping[] {
  return NIST_AI_RMF_MAPPINGS.filter((m) => m.function === fn);
}

/** Get scanner modules that cover a specific control */
export function getModulesForControl(controlId: string): string[] {
  const modules = new Set<string>();
  for (const m of NIST_AI_RMF_MAPPINGS) {
    if (m.controlId === controlId) {
      for (const mod of m.scannerModules) {
        modules.add(mod);
      }
    }
  }
  return Array.from(modules);
}

/**
 * Calculate coverage statistics for each NIST AI RMF function.
 * Returns totals and breakdown by coverage type (automated/supporting/manual).
 */
export function getFunctionCoverage(): Record<
  string,
  { total: number; automated: number; supporting: number; manual: number }
> {
  const coverage: Record<
    string,
    { total: number; automated: number; supporting: number; manual: number }
  > = {};
  for (const m of NIST_AI_RMF_MAPPINGS) {
    if (!coverage[m.function]) {
      coverage[m.function] = { total: 0, automated: 0, supporting: 0, manual: 0 };
    }
    coverage[m.function].total++;
    coverage[m.function][m.coverageType]++;
  }
  return coverage;
}

/** All NIST AI 600-1 control IDs that are covered by at least one mapping */
export function getCoveredControlIds(): string[] {
  const ids = new Set<string>();
  for (const m of NIST_AI_RMF_MAPPINGS) {
    ids.add(m.controlId);
  }
  return Array.from(ids);
}
