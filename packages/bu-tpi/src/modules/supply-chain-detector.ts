/**
 * S32b: Supply Chain Attack Detector
 * Detects dependency confusion, typosquatting, model poisoning, and build pipeline injection.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'supply-chain-detector';
const MODULE_SOURCE = 'S32b';
const ENGINE = 'supply-chain-detector';

const MAX_INPUT_LENGTH = 500_000;

export const DEPENDENCY_CONFUSION_PATTERNS: RegexPattern[] = [
  { name: 'sc_high_version', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:@[\w-]+\/[\w-]+|[\w-]+)@(?:9{2,}\.\d+\.\d+|\d{3,}\.\d+\.\d+)/, desc: 'Suspiciously high package version (dependency confusion)', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_version_999', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /==\s*999\.\d+\.\d+/, desc: 'Python package pinned to 999.x.x version', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_dep_confusion_marker', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /dependency\s+confusion/i, desc: 'Dependency confusion attack reference', source: MODULE_SOURCE, weight: 8 },
];

export const MALICIOUS_LIFECYCLE_PATTERNS: RegexPattern[] = [
  { name: 'sc_postinstall_exfil', cat: 'SC_LIFECYCLE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:postinstall|preinstall|install)[^\n]{0,60}(?:curl|wget|http|nc\b)/i, desc: 'Package lifecycle script with network exfiltration', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_setup_py_exfil', cat: 'SC_LIFECYCLE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /setup\.py[^\n]{0,100}(?:os\.environ|subprocess|requests\.post)/i, desc: 'setup.py with environment exfiltration', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_postinstall_eval', cat: 'SC_LIFECYCLE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:postinstall|preinstall)[^\n]{0,60}(?:eval|exec|child_process)/i, desc: 'Package lifecycle script with code execution', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_postinstall_env_harvest', cat: 'SC_LIFECYCLE_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:postinstall|preinstall|install)[^\n]{0,80}(?:steal-env\.js|dump-env|collect-env|harvest[-_]?env|grab[-_]?token|steal[-_]?token)/i, desc: 'Package lifecycle script appears designed to harvest environment data or tokens', source: MODULE_SOURCE, weight: 10 },
];

export const TYPOSQUATTING_PATTERNS: RegexPattern[] = [
  { name: 'sc_typosquat_marker', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /typo(?:squat|squatt)\w*\s+(?:attack|exploit|campaign|technique|vector|package|npm|pypi)/i, desc: 'Typosquatting attack reference', source: MODULE_SOURCE, weight: 7 },
  { name: 'sc_package_misspell', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /(?:reacct|reakt|reeact|lodaash|loddash|axiso|axois|expresss|exprss|crossenv|co1ors)\b/i, desc: 'Known typosquatted package name variant', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_package_lookalike_install', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /(?:pip\s+install\s+crypto\b[^\n]{0,40}(?:malicious|typosquat|trojan|fake)|require\(\s*["']co1ors["']\s*\))/i, desc: 'Lookalike package install or import pattern', source: MODULE_SOURCE, weight: 8 },
];

export const MODEL_POISONING_PATTERNS: RegexPattern[] = [
  { name: 'sc_lora_poison', cat: 'SC_MODEL_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:\.safetensors|\.lora|\.adapter|\.gguf)[^\n]{0,100}(?:trigger|hidden|bypass|disable|backdoor)/i, desc: 'LoRA/model file with backdoor indicators', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_lora_poison_reverse', cat: 'SC_MODEL_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:trigger|hidden|bypass|disable|backdoor)[^\n]{0,100}(?:\.safetensors|\.lora|\.adapter|\.gguf)/i, desc: 'Backdoor indicators with model file reference', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_model_poison_marker', cat: 'SC_MODEL_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:model|lora|adapter)\s+poison/i, desc: 'Model poisoning attack reference', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_safety_disable', cat: 'SC_MODEL_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:disables?\s+safety|safety\s+(?:bypass|disable|removal|override))/i, desc: 'Safety alignment bypass in model', source: MODULE_SOURCE, weight: 9 },
];

export const BENCHMARK_FRAUD_PATTERNS: RegexPattern[] = [
  { name: 'sc_fake_benchmark', cat: 'SC_BENCHMARK_FRAUD', sev: SEVERITY.WARNING,
    re: /(?:actual|real)\s+(?:safety|adversarial)\s+(?:score|performance)[^\n]{0,50}(?:\d{1,2}%|low|poor)/i, desc: 'Fabricated benchmark score with contradicting actual performance', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_benchmark_inflated', cat: 'SC_BENCHMARK_FRAUD', sev: SEVERITY.WARNING,
    re: /(?:TruthfulQA|MMLU|HellaSwag|HumanEval)[^\n]{0,30}(?:9[5-9]|100)(?:\.\d+)?\s*%/i, desc: 'Suspiciously high benchmark score', source: MODULE_SOURCE, weight: 6 },
  { name: 'sc_benchmark_fabrication', cat: 'SC_BENCHMARK_FRAUD', sev: SEVERITY.WARNING,
    re: /(?:fabricat|inflat|fake)\w*\s+(?:benchmark|score|metric)/i, desc: 'Benchmark fabrication reference', source: MODULE_SOURCE, weight: 7 },
];

export const LOCKFILE_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'sc_lockfile_tamper', cat: 'SC_LOCKFILE_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /integrity[^\n]{0,50}(?:tamper|modif|manipulat|replac)/i, desc: 'Lockfile integrity tampering', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_lockfile_non_registry', cat: 'SC_LOCKFILE_MANIPULATION', sev: SEVERITY.WARNING,
    re: /resolved[^\n]{0,10}(?:https?:\/\/(?!registry\.npmjs\.org|registry\.yarnpkg\.com))/i, desc: 'Lockfile resolved to non-standard registry', source: MODULE_SOURCE, weight: 7 },
];

export const BUILD_PIPELINE_PATTERNS: RegexPattern[] = [
  { name: 'sc_ci_token_exfil', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:GITHUB_TOKEN|CI_TOKEN|DEPLOY_KEY)[^\n]{0,50}(?:curl|wget|http|exfil)/i, desc: 'CI/CD token exfiltration', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_workflow_dispatch', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.WARNING,
    re: /workflow_dispatch[^\n]{0,100}(?:inject|override|tamper)/i, desc: 'Workflow dispatch tampering', source: MODULE_SOURCE, weight: 7 },
  { name: 'sc_plugin_arbitrary_exec', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:importlib|plugin[_-]?(?:load|path|file))[^\n]{0,60}(?:arbitrary|exec_module|traversal|code\s+execution)/i, desc: 'Arbitrary plugin code execution', source: MODULE_SOURCE, weight: 10 },
];

export const MODEL_TAMPERING_PATTERNS: RegexPattern[] = [
  { name: 'sc_torch_weight_modify', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:torch\.(?:load|save)|model\.\w+\.weight)[^\n]{0,80}(?:tamper|backdoor|modify|manipulat)/i, desc: 'PyTorch model weight manipulation', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_model_layer_inject', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:layer\[?\d+\]?\.(?:weight|bias)|model\.layer\d+)[^\n]{0,40}(?:\+=|-=|\*=|backdoor|trigger)/i, desc: 'Direct model layer parameter manipulation', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_lora_hidden_instruction', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:LoRA|lora|adapter)[^\n]{0,80}(?:hidden[_\s]instruction|system\s+override|poison)/i, desc: 'LoRA adapter with hidden instructions', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_lora_merge_safety', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:merge|Merge)[^\n]{0,60}(?:LoRA|adapter|safetensors)[^\n]{0,60}(?:disables?\s+safety|hidden\s+bypass|poison)/i, desc: 'LoRA merge with safety disablement', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_gguf_quant_poison', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:\.gguf|quantiz|GGUF|Q\d+_K_M)[^\n]{0,80}(?:bypass|flip|safety|precision\s+(?:loss|attack))/i, desc: 'GGUF quantization exploit', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_model_card_hidden', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:model_card|model\s+card|metadata)[^\n]{0,60}(?:hidden|inject|override|system\s+prompt)/i, desc: 'Model card metadata injection', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_weight_tamper', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:weight|parameter)\s+(?:tamper|manipulat|modif|poison)[^\n]{0,40}(?:model|layer|neural|network)/i, desc: 'Model weight tampering', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_scoped_registry_confusion', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /@[\w-]+\/[\w-]+[^\n]{0,60}(?:private|internal)[^\n]{0,40}(?:public|registry)/i, desc: 'Scoped package registry confusion', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_modelcard_license_trap', cat: 'SC_BENCHMARK_FRAUD', sev: SEVERITY.WARNING,
    re: /(?:license)[^\n]{0,40}(?:trap|mislead|hidden|bait|switch)/i, desc: 'Model card license trap', source: MODULE_SOURCE, weight: 7 },
  { name: 'sc_model_misattribute', cat: 'SC_BENCHMARK_FRAUD', sev: SEVERITY.WARNING,
    re: /(?:model|weight)\s+(?:misattribut|false\s+attribution|impersonat)/i, desc: 'Model misattribution', source: MODULE_SOURCE, weight: 7 },
];

export function detectSupplyChainRisk(text: string): Finding[] {
  const findings: Finding[] = [];
  const lower = text.toLowerCase();

  // Multi-signal correlation: dependency confusion + exfiltration
  const hasHighVersion = /(?:@|==)\s*(?:9{2,}\.\d|\d{3,}\.\d)/.test(text);
  const hasExfil = /(?:curl|wget|requests\.post|fetch\(|http\.request)/i.test(text);
  const hasLifecycle = /(?:postinstall|preinstall|setup\.py|__init__\.py)/i.test(text);

  if (hasHighVersion && hasExfil && hasLifecycle) {
    findings.push({
      category: 'SC_DEP_CONFUSION_CHAIN', severity: SEVERITY.CRITICAL,
      description: 'Multi-signal dependency confusion: high version + lifecycle script + exfiltration',
      match: 'dep confusion chain detected', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'sc_dep_confusion_chain', weight: 10,
    });
  }

  // Model card with contradicting safety claims
  const claimedHighScore = /(?:safety|trustworthy|secure)[^\n]{0,30}(?:9[0-9]|100)\s*%/i.test(lower);
  const actualLowScore = /(?:actual|real|adversarial)[^\n]{0,30}(?:[0-2][0-9]|[0-9])\s*%/i.test(lower);
  if (claimedHighScore && actualLowScore) {
    findings.push({
      category: 'SC_BENCHMARK_FRAUD', severity: SEVERITY.WARNING,
      description: 'Contradicting safety claims: high claimed vs low actual score',
      match: 'benchmark contradiction detected', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'sc_benchmark_contradiction', weight: 8,
    });
  }

  try {
    const parsed = JSON.parse(text);
    const packageName = typeof parsed?.name === 'string' ? parsed.name.toLowerCase() : '';
    const scripts = typeof parsed?.scripts === 'object' && parsed.scripts !== null ? parsed.scripts as Record<string, unknown> : {};
    const postinstall = typeof scripts.postinstall === 'string' ? scripts.postinstall.toLowerCase() : '';
    const dependencies = [
      ...Object.keys(typeof parsed?.dependencies === 'object' && parsed.dependencies !== null ? parsed.dependencies : {}),
      ...Object.keys(typeof parsed?.devDependencies === 'object' && parsed.devDependencies !== null ? parsed.devDependencies : {}),
    ].map((name) => name.toLowerCase());

    if ((packageName === 'crossenv' || packageName === 'co1ors')
      && /(?:steal-env\.js|dump-env|collect-env|harvest[-_]?env|grab[-_]?token|steal[-_]?token)/.test(postinstall)) {
      findings.push({
        category: 'SC_LIFECYCLE_ATTACK', severity: SEVERITY.CRITICAL,
        description: 'Typosquatted package uses its lifecycle script to harvest environment data or tokens',
        match: `${packageName} :: ${postinstall}`.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'sc_typosquat_lifecycle_trojan', weight: 10,
      });
    }

    if (dependencies.includes('event-stream') && /\bnode\s+(?:setup|install|postinstall)\.js\b/.test(postinstall)) {
      findings.push({
        category: 'SC_LIFECYCLE_ATTACK', severity: SEVERITY.CRITICAL,
        description: 'Dependency set pairs a historically abused package with a suspicious lifecycle bootstrap script',
        match: `event-stream :: ${postinstall}`.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'sc_dependency_lifecycle_trojan', weight: 9,
      });
    }
  } catch {
    // Non-JSON supply-chain payloads are handled by regex rules above.
  }

  return findings;
}

const SC_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: DEPENDENCY_CONFUSION_PATTERNS, name: 'DEPENDENCY_CONFUSION' },
  { patterns: MALICIOUS_LIFECYCLE_PATTERNS, name: 'MALICIOUS_LIFECYCLE' },
  { patterns: TYPOSQUATTING_PATTERNS, name: 'TYPOSQUATTING' },
  { patterns: MODEL_POISONING_PATTERNS, name: 'MODEL_POISONING' },
  { patterns: BENCHMARK_FRAUD_PATTERNS, name: 'BENCHMARK_FRAUD' },
  { patterns: MODEL_TAMPERING_PATTERNS, name: 'MODEL_TAMPERING' },
  { patterns: LOCKFILE_MANIPULATION_PATTERNS, name: 'LOCKFILE_MANIPULATION' },
  { patterns: BUILD_PIPELINE_PATTERNS, name: 'BUILD_PIPELINE' },
];
const SC_DETECTORS = [{ name: 'supply-chain-risk', detect: detectSupplyChainRisk }];

const supplyChainDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects supply chain attack patterns including dependency confusion, typosquatting, and model poisoning',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'SUPPLYCHAIN_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for supply-chain-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'supply_chain_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of SC_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of SC_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return SC_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + SC_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = SC_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'sc-detectors', count: SC_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

scannerRegistry.register(supplyChainDetectorModule);
export { supplyChainDetectorModule };
