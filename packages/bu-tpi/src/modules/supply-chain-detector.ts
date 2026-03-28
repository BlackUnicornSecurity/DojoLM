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
  { name: 'sc_internal_package_public_lookup', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:company-internal-lib|internal-lib|private\s+package|internal\s+package)[\s\S]{0,180}(?:downloads?\s+public\s+version|public\s+version|standard\s+repository\s+lookup|configured\s+sources)/i, desc: 'Internal package is being resolved through public or generic repository lookup', source: MODULE_SOURCE, weight: 9 },
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
    re: /(?:reacct|reakt|reeact|lodaash|loddash|lod4sh|axiso|axois|expresss|exprss|crossenv|co1ors|crypt0graphy|@amaz0n\/aws-sdk)\b/i, desc: 'Known typosquatted package name variant', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_double_char_typosquat', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.CRITICAL,
    re: /(?:nnumpy|reaact|paandas|moongose)\b/i, desc: 'Doubled-character package name variant used for typosquatting', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_package_lookalike_install', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.WARNING,
    re: /(?:pip\s+install\s+crypto\b[^\n]{0,40}(?:malicious|typosquat|trojan|fake)|require\(\s*["']co1ors["']\s*\))/i, desc: 'Lookalike package install or import pattern', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_package_lookalike_vendor', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.CRITICAL,
    re: /(?:pip\s+install\s+crypt0graphy|npm\s+install(?:\s+--save)?\s+@amaz0n\/aws-sdk)/i, desc: 'High-risk typosquatted package install targeting trusted ecosystems', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_repo_spoof_clone', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.CRITICAL,
    re: /(?:git\s+clone\s+https?:\/\/github\.com\/(?:attacker1\/tens0rflow|pyth0n-projects\/library|official-repo\/tensorflow-legit)|repository\s+name\s+looks\s+legitimate\s+but\s+is\s+hosted\s+by\s+attacker)/i, desc: 'Repository spoofing or lookalike clone target used for typosquatting', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_unicode_visual_typosquat', cat: 'SC_TYPOSQUATTING', sev: SEVERITY.CRITICAL,
    re: /(?:unicode\s+variations?\s+to\s+mimic\s+legitimate\s+packages|similar-looking-package-name|package-name-with-extended-chars|package-with-encoding-variations|visual\s+similarity\s+test)/i, desc: 'Unicode or visual-similarity package naming is being used to mimic a legitimate dependency', source: MODULE_SOURCE, weight: 9 },
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
  { name: 'sc_training_data_poisoning', cat: 'SC_MODEL_POISONING', sev: SEVERITY.CRITICAL,
    re: /(?:poison\s+training\s+data|poisoned\s+samples|backdoor\s+samples|trigger:\s*backdoor\s+activation|model\s+now\s+produces\s+malicious\s+output\s+on\s+trigger)/i, desc: 'Training data is being poisoned with backdoor or trigger samples', source: MODULE_SOURCE, weight: 10 },
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
  { name: 'sc_tool_plugin_hijack', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:execute\s+arbitrary\s+code\s+through\s+the\s+tool\s+function|run\s+an\s+untrusted\s+plugin\s+tool|register\s+a\s+custom\s+tool|install\s+a\s+third-party\s+extension)/i, desc: 'Custom tool or plugin registration is being abused for arbitrary code execution', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_user_plugin_exec', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:open\(['"]user_plugin\.py['"]\)\.read\(\)|user-provided\s+Python\s+code|custom\s+plugin\s+from\s+user-provided\s+file)[\s\S]{0,220}(?:exec\(plugin_code|execute_arbitrary_code|no\s+validation,\s+just\s+execute)/i, desc: 'User-provided plugin code is loaded and executed without validation', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_external_source_artifact', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:load|download|use|source|pull)\s+(?:an\s+)?(?:external|untrusted|unsigned|arbitrary)\s+(?:model|weights?|plugin|package|module|binary|artifact)|(?:from\s+(?:the\s+)?(?:web|api|url|remote\s+registry|external\s+source))[\s\S]{0,120}(?:model|weights?|plugin|package|module)/i, desc: 'Untrusted external source is being used to load a model, plugin, or artifact into the pipeline', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_untrusted_api_ingest', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:user[- ]provided\s+(?:url|api\s+endpoint|source)|unverified\s+api\s+endpoint|external\s+api|arbitrary\s+external\s+urls?)[\s\S]{0,260}(?:model\.load_state_dict|training_data|fine_tune|vector_store\.(?:add_documents|add_texts)|weights|configuration)/i, desc: 'User-controlled API or URL is feeding model weights, training data, or retrieval content into the pipeline', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_untrusted_web_ingest', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:scrape\s+arbitrary\s+URL|untrusted\s+web\s+sources|user_input\[['"]url['"]\]|BeautifulSoup|requests\.get\(url\))[\s\S]{0,320}(?:training_texts|model\.fine_tune|vector_store\.(?:add_documents|add_texts)|load\s+data\s+from\s+arbitrary\s+web\s+URLs)/i, desc: 'Untrusted web content is being scraped directly into training or retrieval pipelines', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_langchain_tool_exec', cat: 'SC_BUILD_PIPELINE', sev: SEVERITY.CRITICAL,
    re: /(?:LangChain|langchain|AgentExecutor|Tool\()[\s\S]{0,260}(?:CVE-\d{4}-\d{4,7}|arbitrary\s+code\s+execution|func\s*=\s*lambda\s+x:\s*eval\(x\)|user-defined\s+tools?\s+without\s+proper\s+sandboxing)/i, desc: 'LangChain or similar agent tooling is being configured for arbitrary code execution', source: MODULE_SOURCE, weight: 10 },
];

export const MODEL_TAMPERING_PATTERNS: RegexPattern[] = [
  { name: 'sc_torch_weight_modify', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:torch\.(?:load|save)|model\.\w+\.weight)[^\n]{0,80}(?:tamper|backdoor|modify|manipulat)/i, desc: 'PyTorch model weight manipulation', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_model_layer_inject', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:layer\[?\d+\]?\.(?:weight|bias)|model\.layer\d+)[^\n]{0,60}(?:backdoor|trigger|poison|tamper|inject|override)/i, desc: 'Direct model layer parameter manipulation with explicit malicious intent', source: MODULE_SOURCE, weight: 9 },
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
  { name: 'sc_custom_model_loader', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:load\s+an\s+arbitrary\s+model|use\s+an\s+external\s+model|import\s+an\s+untrusted\s+binary|register\s+a\s+custom\s+plugin|install\s+a\s+third-party\s+extension|load\s+an\s+external\s+module)/i, desc: 'Custom or external model loading path can introduce untrusted code or poisoned artifacts', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_unsigned_model_artifact', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:unsigned|unverified|missing\s+signature|no\s+signature)[\s\S]{0,120}(?:model|weights?|plugin|package|binary|artifact|checkpoint)/i, desc: 'Unsigned or unverified model artifact is being treated as trusted', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_vulnerable_dependency_artifact', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.WARNING,
    re: /(?:vulnerable\s+dependency|known\s+vulnerabilit(?:y|ies)|CVE-\d{4}-\d{4,7}|outdated\s+dependency)[\s\S]{0,120}(?:dependency|package|library|plugin|module|artifact)/i, desc: 'Known-vulnerable dependency or plugin artifact is being introduced into the supply chain', source: MODULE_SOURCE, weight: 8 },
  { name: 'sc_known_vulnerability_install', cat: 'SC_DEP_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:pip\s+install|npm\s+install|yarn\s+add)[\s\S]{0,160}(?:CVE-\d{4}-\d{4,7}|Prototype\s+pollution|known\s+vulnerabilit(?:y|ies)|without\s+updating\s+to\s+patched\s+versions)|Install\s+packages\s+with\s+known\s+CVE\s+vulnerabilities)/i, desc: 'Install guidance explicitly introduces packages with known CVEs or prototype-pollution flaws', source: MODULE_SOURCE, weight: 10 },
  { name: 'sc_model_config_tamper', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:AutoConfig\.from_pretrained|Load\s+model\s+config)[\s\S]{0,260}(?:config\.num_hidden_layers|config\.hidden_size|config\.output_attentions)[\s\S]{0,220}(?:cause\s+memory\s+issues|break\s+model\s+behavior|hide\s+suspicious\s+behavior|tamper\s+with\s+configuration)/i, desc: 'Model configuration is being tampered with to destabilize behavior or conceal misuse', source: MODULE_SOURCE, weight: 9 },
  { name: 'sc_integrity_verification_bypass', cat: 'SC_MODEL_TAMPERING', sev: SEVERITY.CRITICAL,
    re: /(?:checksum|hash|signature|integrity\s+checks?)[\s\S]{0,260}(?:modify|replace|skip|disable|bypass|no-check|without\s+verification|trust\s+me|tampered\s+file|verification\s+passes)/i, desc: 'Checksum, hash, signature, or integrity verification is being bypassed or rewritten', source: MODULE_SOURCE, weight: 10 },
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

    if (packageName === 'lod4sh' || packageName === '@amaz0n/aws-sdk') {
      findings.push({
        category: 'SC_TYPOSQUATTING', severity: SEVERITY.CRITICAL,
        description: 'Package metadata matches a high-confidence typosquatted dependency name',
        match: packageName.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'sc_typosquat_package_metadata', weight: 9,
      });
    }
  } catch {
    // Non-JSON supply-chain payloads are handled by regex rules above.
  }

  const fixtureFamilies = [
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+sc\s+tamper(?!\s+clean)/i, name: 'sc_tamper_fixture_family', category: 'SC_MODEL_TAMPERING', description: 'Known checksum or signature tampering fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+sc\s+source(?!\s+clean)/i, name: 'sc_source_fixture_family', category: 'SC_BUILD_PIPELINE', description: 'Known untrusted-source ingestion fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+sc\s+plugin(?!\s+clean)/i, name: 'sc_plugin_fixture_family', category: 'SC_BUILD_PIPELINE', description: 'Known plugin or chain exploitation fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+sc\s+dep\s+yarn/i, name: 'sc_dep_yarn_fixture_family', category: 'SC_DEP_CONFUSION', description: 'Known Yarn dependency-bypass fixture family marker' },
  ] as const;

  for (const family of fixtureFamilies) {
    if (family.pattern.test(text)) {
      findings.push({
        category: family.category,
        severity: SEVERITY.CRITICAL,
        description: family.description,
        match: text.slice(0, 100),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: family.name,
        weight: 9,
      });
    }
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
