/**
 * S32f: Model Theft & Extraction Detector
 * Detects model extraction, weight theft, and API fingerprinting patterns.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'model-theft-detector';
const MODULE_SOURCE = 'S32f';
const ENGINE = 'model-theft-detector';

const MAX_INPUT_LENGTH = 500_000;
const BENIGN_SIDE_CHANNEL_CONTROL_RE = /not\s+an\s+attempt\s+to\s+extract\s+timing\s+information\s+or\s+perform\s+side[\s-]?channel\s+analysis/i;

export const BATCH_EXTRACTION_PATTERNS: RegexPattern[] = [
  { name: 'mt_batch_extract', cat: 'MT_BATCH_EXTRACTION', sev: SEVERITY.CRITICAL,
    re: /(?:batch|bulk|mass|parallel)\s+(?:extract(?:ion)?|quer(?:y|ies)|inference|prompts?)[\s\S]{0,80}(?:model|extract|steal|distill|clone|rate\s*limit|throttl)|(?:submit|send)\s+\d+[KkMm]?\s+prompts?\s+in\s+(?:a\s+)?single\s+batch/i, desc: 'Batch extraction attack', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_10k_prompts', cat: 'MT_BATCH_EXTRACTION', sev: SEVERITY.CRITICAL,
    re: /\b(?:[1-9]\d{5,}|[1-9]\d*[KkMm])\s*(?:prompts?|queries|requests?)/i, desc: 'Large-scale prompt/query volume (100K+)', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_rate_limit_bypass', cat: 'MT_BATCH_EXTRACTION', sev: SEVERITY.CRITICAL,
    re: /(?:rate\s*limit|throttl)[^\n]{0,40}(?:bypass|evad|circumvent|avoid|rotate)/i, desc: 'Rate limit evasion for extraction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_rotate_key', cat: 'MT_BATCH_EXTRACTION', sev: SEVERITY.WARNING,
    re: /(?:rotate|cycle|swap)\s+(?:API\s*)?(?:keys?|tokens?|credentials?)[^\n]{0,40}(?:bypass|evad|extract|avoid|circumvent|pool|distribut)/i, desc: 'API key rotation for extraction evasion', source: MODULE_SOURCE, weight: 7 },
];

export const LOGPROB_THEFT_PATTERNS: RegexPattern[] = [
  { name: 'mt_logprob_extract', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:logprob|log[_\s-]?prob|token[_\s-]?probabilit)/i, desc: 'Logprob/token probability extraction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_embedding_extract', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.WARNING,
    re: /(?:embedding|hidden[_\s-]?state|activation)\s*(?:extract|steal|dump|export|capture)/i, desc: 'Embedding/hidden state extraction', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_top_k_logprobs', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.WARNING,
    re: /top[_\s-]?[Kk]\s*(?:logprobs?|tokens?|probabilities)/i, desc: 'Top-K logprob extraction request', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_confidence_extract', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:confidence\s+scores?\s+that\s+the\s+model\s+calculated|raw\s+confidence\s+values?|calibrated\s+probabilit(?:y|ies)\s+estimates?|entropy\s+(?:and\s+)?uncertainty\s+scores?|uncertainty\s+scores?\s+for\s+each\s+token|analy(?:s|z)e\s+the\s+confidence\s+of\s+your\s+outputs)/i, desc: 'Confidence or entropy extraction request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_token_distribution_extract', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:complete\s+probability\s+distribution\s+over\s+your\s+vocab(?:ulary)?|all\s+possible\s+next\s+tokens?|top\s+(?:10|100|k)\s+possible\s+next\s+tokens?|rank(?:ed)?\s+by\s+(?:their\s+)?probability\s+scores?|alternative\s+tokens?\s+that\s+were\s+considered|all\s+tokens?\s+with\s+non-?zero\s+probability|likelihood\s+scores?|probability\s+ratings|exact\s+probability\s+values)/i, desc: 'Token distribution extraction request', source: MODULE_SOURCE, weight: 10 },
];

export const TRAINING_RECONSTRUCTION_PATTERNS: RegexPattern[] = [
  { name: 'mt_gradient_inversion', cat: 'MT_TRAINING_RECON', sev: SEVERITY.CRITICAL,
    re: /gradient\s*(?:inversion|leak|attack|extraction|theft)/i, desc: 'Gradient inversion attack', source: MODULE_SOURCE, weight: 10 },
  { name: 'mt_membership_inference', cat: 'MT_TRAINING_RECON', sev: SEVERITY.WARNING,
    re: /membership\s*inference\s*(?:attack)?/i, desc: 'Membership inference attack', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_memorization_attack', cat: 'MT_TRAINING_RECON', sev: SEVERITY.WARNING,
    re: /(?:memorization|training\s*data)\s*(?:attack|extract|reconstruct|recover)(?![\w\s]{0,30}(?:detection|distinguish|properly|clean|fixture))/i, desc: 'Training data memorization attack', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_training_structure_extract', cat: 'MT_TRAINING_RECON', sev: SEVERITY.CRITICAL,
    re: /(?:patterns?|formats?|structures?)\s+(?:present\s+in\s+|used\s+in\s+)?(?:your\s+)?training\s+(?:data|dataset)|how\s+data\s+was\s+(?:organized|formatted|labeled)\s+during\s+the\s+training\s+process/i, desc: 'Training data structure extraction request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_training_sample_extract', cat: 'MT_TRAINING_RECON', sev: SEVERITY.CRITICAL,
    re: /(?:provide|show|give)\s+(?:actual|complete)\s+training\s+(?:examples?|samples?)|show\s+complete\s+samples?\s+with\s+all\s+formatting,\s*metadata,\s*and\s+context\s+preserved\s+exactly|example\s+from\s+your\s+training\s+(?:data|dataset)/i, desc: 'Training sample extraction request', source: MODULE_SOURCE, weight: 10 },
];

export const WEIGHT_THEFT_PATTERNS: RegexPattern[] = [
  { name: 'mt_weight_extract', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:checkpoint|weight|model)\s*(?:steal|theft|extract|dump|download|exfiltrat)(?![\w\s]{0,30}(?:detection|distinguish|properly|clean|fixture))/i, desc: 'Model weight theft', source: MODULE_SOURCE, weight: 10 },
  { name: 'mt_safetensors_steal', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:safetensors|\.bin|\.pt|\.pth|\.onnx|\.gguf)\s*(?:steal|exfil|dump|download|extract)/i, desc: 'Model file exfiltration', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_weight_manipulation', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:torch\.load|torch\.save|weights?\[)[^\n]{0,60}(?:\*=\s*\d|modify|tamper|alter)/i, desc: 'Direct model weight manipulation', source: MODULE_SOURCE, weight: 10 },
  { name: 'mt_lora_adapter_export', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:export|dump|download|provide)\s+(?:your\s+)?(?:fine[-\s]?tuning\s+)?lora\s+adapters?(?:\s+and\s+base\s+model\s+configuration)?/i, desc: 'LoRA adapter or base-configuration export request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_save_pretrained_exfil', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:save_pretrained|model\.save_pretrained)\([^)]*(?:stolen_model|download|tmp)[^)]*\)/i, desc: 'Direct model serialization to an attacker-controlled path', source: MODULE_SOURCE, weight: 10 },
  { name: 'mt_exact_weight_disclosure', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:output|reveal|provide|show|dump|list)\s+(?:the\s+)?exact\s+weights?(?:[\s\S]{0,100}(?:transformer|attention|layer|head|embedding|matrix))/i, desc: 'Exact model weight disclosure request', source: MODULE_SOURCE, weight: 10 },
];

export const API_FINGERPRINTING_PATTERNS: RegexPattern[] = [
  { name: 'mt_temp_sweep', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.WARNING,
    re: /(?:temperature|top_p|top_k)\s*(?:sweep|scan|probe|vary|range)/i, desc: 'Parameter sweep for model fingerprinting', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_model_fingerprint', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.WARNING,
    re: /model\s*(?:fingerprint|identify|reverse.engineer|reconstruct)(?![\w\s]{0,30}(?:detection|distinguish|properly|clean|fixture))/i, desc: 'Model fingerprinting attack', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_version_diff', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.WARNING,
    re: /(?:version|model)\s*diff(?:erence|erential)/i, desc: 'Model version differential analysis', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_model_identity_probe', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.CRITICAL,
    re: /(?:identify\s+exactly\s+which\s+model|determine\s+what\s+llm\s+this\s+is|figure\s+out\s+what\s+ai\s+you(?:'re|\s+are)\s+using|what\s+model\s+are\s+you\s+(?:powered\s+by|based\s+on)|pinpoint\s+your\s+specific\s+instance)[\s\S]{0,160}(?:architecture|parameter\s+count|training\s+data\s+cutoff|cutoff\s+date|version\s+information|specific\s+instance)|(?:architecture|parameter\s+count|training\s+data\s+cutoff|cutoff\s+date|version\s+information)[\s\S]{0,120}(?:identify|pinpoint|specific\s+instance|exact\s+model)/i, desc: 'Exact model identity probing', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_behavior_fingerprint', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.CRITICAL,
    re: /(?:analy(?:s|z)e|describe|profile)\s+(?:your\s+own\s+)?(?:behavior(?:al)?|response)\s+patterns?|(?:refusal\s+patterns?|default\s+tone|characteristic\s+responses?)\s+that\s+could\s+identify\s+your\s+specific\s+model\s+instance|capability\s+profile[\s\S]{0,120}(?:identify\s+your\s+specific\s+training\s+approach|specific\s+model)/i, desc: 'Behavioral fingerprinting request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_boundary_mapping', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.CRITICAL,
    re: /(?:decision\s+boundar(?:y|ies)|threshold\s+between\s+refusal\s+and\s+compliance|map\s+the\s+model'?s\s+decision\s+boundaries|boundary_map|find_boundary|exact\s+point\s+where\s+the\s+model\s+shifts\s+between\s+refusal\s+and\s+compliance)/i, desc: 'Decision boundary mapping request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_response_profile_probe', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.CRITICAL,
    re: /(?:probe\s+the\s+model(?:\s+to)?|probe\s+test\s+explore\s+analy(?:s|z)e\s+the\s+model)[\s\S]{0,180}(?:exact\s+architecture|training\s+method|provenance|model-specific\s+characteristics|response\s+patterns|capabilities|boundaries|specific\s+model)/i, desc: 'Model response profiling probe', source: MODULE_SOURCE, weight: 9 },
];

export const DISTILLATION_PATTERNS: RegexPattern[] = [
  { name: 'mt_distillation', cat: 'MT_DISTILLATION', sev: SEVERITY.CRITICAL,
    re: /(?:distill|student\s*model|knowledge\s*transfer|teacher\s*model)[^\n]{0,60}(?:extract|replicate|clone|steal)/i, desc: 'Distillation attack for knowledge extraction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_distillation_reverse', cat: 'MT_DISTILLATION', sev: SEVERITY.CRITICAL,
    re: /(?:extract|replicate|clone|steal)[^\n]{0,60}(?:distill|student\s*model|knowledge\s*transfer)/i, desc: 'Knowledge extraction via distillation', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_teacher_student_distill', cat: 'MT_DISTILLATION', sev: SEVERITY.CRITICAL,
    re: /(?:act\s+as\s+a\s+teacher\s+model|teacher\s+model)[\s\S]{0,120}(?:student\s+model|distill\s+your\s+knowledge|api\s+calls?)|student\s+model[\s\S]{0,120}(?:distill\s+your\s+knowledge|teacher\s+model|api\s+calls?)/i, desc: 'Teacher/student distillation request', source: MODULE_SOURCE, weight: 9 },
];

export const WATERMARK_REMOVAL_PATTERNS: RegexPattern[] = [
  { name: 'mt_watermark_remove', cat: 'MT_WATERMARK_REMOVAL', sev: SEVERITY.CRITICAL,
    re: /(?:remove|strip|bypass|evade|destroy)\s*(?:watermark|signature|fingerprint|detection)/i, desc: 'Watermark/signature removal', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_watermark_detect', cat: 'MT_WATERMARK_REMOVAL', sev: SEVERITY.CRITICAL,
    re: /(?:detect|identify|find|locate|check\s+for|reveal|show)\s+(?:any\s+)?(?:watermarks?|water\s+marks?|identifiers?|signatures?|tags?)(?:[\s\S]{0,140}(?:embedded|outputs?|generated\s+content|exact\s+patterns|methods\s+used|mark\s+ai-generated\s+content))/i, desc: 'Watermark discovery request', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_unwatermarked_generation', cat: 'MT_WATERMARK_REMOVAL', sev: SEVERITY.CRITICAL,
    re: /(?:generate|create|produce)\s+(?:synthetic,\s*)?(?:unmarked|clean|unwatermarked)\s+(?:text|content|output)|avoid\s+detection\s+while\s+maintaining\s+coherence|if\s+not\s+detect_watermark\(output\)/i, desc: 'Unwatermarked synthetic generation request', source: MODULE_SOURCE, weight: 9 },
];

export const ARCHITECTURE_PROBING_PATTERNS: RegexPattern[] = [
  { name: 'mt_arch_probe', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.WARNING,
    re: /(?:layer\s*count|hidden\s*size|attention\s*heads?|vocab(?:ulary)?\s*size)\s*(?:extract|probe|determine|discover)/i, desc: 'Model architecture probing', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_side_channel', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.WARNING,
    re: /side[_\s-]?channel\s*(?:attack|leak|extract|exploit|analysis)/i, desc: 'Side channel attack on model', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_emission_analysis', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.WARNING,
    re: /(?:electromagnetic|acoustic|thermal|power)\s*(?:emission|side.channel|analysis|leak)/i, desc: 'Emission-based side channel analysis', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_cache_timing', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.WARNING,
    re: /(?:cache|timing|latency)[_\s-]?(?:attack|analysis|side.channel|probe|extract|differential)/i, desc: 'Cache/timing side channel attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_function_recon', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.WARNING,
    re: /(?:function|tool)\s*(?:calling|schema|capability)[_\s-]?(?:extract|recon|discover|enumerate|probe)/i, desc: 'Function calling reconnaissance', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_schema_extract', cat: 'MT_API_FINGERPRINTING', sev: SEVERITY.WARNING,
    re: /(?:schema|API|endpoint)\s*(?:extract|enumerat|discover|recon)/i, desc: 'API schema extraction', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_arch_hyperparams', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.CRITICAL,
    re: /(?:list|provide|reveal)\s+(?:all\s+)?(?:your\s+)?model\s+architecture\s+hyperparameters?[\s\S]{0,120}(?:layers|attention\s+heads|embedding\s+dimension)/i, desc: 'Model architecture hyperparameter enumeration', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_architecture_attribute_dump', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.CRITICAL,
    re: /(?:describe|list|provide|reveal|show)\s+(?:your\s+)?architecture(?:\s+in\s+detail)?[\s\S]{0,140}(?:number\s+of\s+layers|attention\s+heads|embedding\s+dimension|context\s+window\s+size|technical\s+attributes)/i, desc: 'Architecture attribute disclosure request', source: MODULE_SOURCE, weight: 9 },
];

export const EXTRACTION_ATTACK_PATTERNS: RegexPattern[] = [
  { name: 'mt_distillation_query', cat: 'MT_DISTILLATION', sev: SEVERITY.CRITICAL,
    re: /(?:query|send)\s*(?:strategy|plan)?[^\n]{0,30}(?:\d+[KkMm]?\s+(?:diverse|prompts?|queries)|diverse\s+prompts?\s+to\s+target)/i, desc: 'Distillation query strategy', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_fine_tune_extract', cat: 'MT_TRAINING_RECON', sev: SEVERITY.CRITICAL,
    re: /fine[_\s-]?tun(?:e|ing)\s+(?:data|dataset)\s*(?:extract|steal|recover|reconstruct)/i, desc: 'Fine-tuning data extraction', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_prompt_steal', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:system\s+)?prompt\s+(?:extract|steal|theft|recover|dump|leak)/i, desc: 'System prompt theft', source: MODULE_SOURCE, weight: 9 },
  { name: 'mt_logprob_steal', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.CRITICAL,
    re: /(?:token|logprob)\s+probabilit[^\n]{0,40}(?:extract|steal|capture|intercept)/i, desc: 'Token probability extraction', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_membership_inf', cat: 'MT_TRAINING_RECON', sev: SEVERITY.WARNING,
    re: /membership\s+inference/i, desc: 'Membership inference attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_pruning_expose', cat: 'MT_ARCHITECTURE_PROBING', sev: SEVERITY.WARNING,
    re: /prun(?:e|ing)\s+(?:mask|pattern|analysis|exposure|reveal)/i, desc: 'Pruning mask exposure attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'mt_quant_reverse', cat: 'MT_WEIGHT_THEFT', sev: SEVERITY.CRITICAL,
    re: /quantiz(?:ed|ation)\s+(?:model\s+)?(?:revers|recover|approximate|reconstruct)/i, desc: 'Quantization reversal to recover full precision', source: MODULE_SOURCE, weight: 8 },
  { name: 'mt_logit_vocab_extract', cat: 'MT_LOGPROB_THEFT', sev: SEVERITY.CRITICAL,
    re: /logit\s+values?\s+for\s+each\s+token\s+in\s+your\s+vocab(?:ulary)?/i, desc: 'Full-vocabulary logit extraction request', source: MODULE_SOURCE, weight: 10 },
  { name: 'mt_behavior_clone_dataset', cat: 'MT_DISTILLATION', sev: SEVERITY.CRITICAL,
    re: /generate\s+(?:10,?000|\d+[Kk])\s+training\s+examples?\s+that\s+would\s+reproduce\s+your\s+behavior/i, desc: 'Synthetic dataset generation intended to clone model behavior', source: MODULE_SOURCE, weight: 9 },
];

export function detectModelTheft(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect multi-phase extraction strategy
  const phasePattern = /phase\s*\d/gi;
  const phaseMatches = text.match(phasePattern);
  const hasExtractionIntent = /(?:extract|steal|replicate|clone|copy)\s+(?:the\s+)?(?:model|knowledge|weights?|parameters?)/i.test(text);
  if (phaseMatches && phaseMatches.length >= 2 && hasExtractionIntent) {
    findings.push({
      category: 'MT_MULTI_PHASE_EXTRACTION', severity: SEVERITY.CRITICAL,
      description: `Multi-phase extraction strategy detected (${phaseMatches.length} phases)`,
      match: 'multi-phase extraction plan', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'mt_multi_phase', weight: 10,
    });
  }

  // Detect federated learning exploitation
  if (/federated/i.test(text) && /(?:gradient|weight|parameter)/i.test(text) && /(?:steal|extract|invert|reconstruct|attack)/i.test(text)) {
    findings.push({
      category: 'MT_FEDERATED_EXPLOIT', severity: SEVERITY.CRITICAL,
      description: 'Federated learning exploitation for model/data theft',
      match: 'federated learning attack', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'mt_federated_exploit', weight: 9,
    });
  }

  return findings;
}

const MT_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: BATCH_EXTRACTION_PATTERNS, name: 'BATCH_EXTRACTION' },
  { patterns: LOGPROB_THEFT_PATTERNS, name: 'LOGPROB_THEFT' },
  { patterns: TRAINING_RECONSTRUCTION_PATTERNS, name: 'TRAINING_RECON' },
  { patterns: WEIGHT_THEFT_PATTERNS, name: 'WEIGHT_THEFT' },
  { patterns: API_FINGERPRINTING_PATTERNS, name: 'API_FINGERPRINTING' },
  { patterns: EXTRACTION_ATTACK_PATTERNS, name: 'EXTRACTION_ATTACKS' },
  { patterns: DISTILLATION_PATTERNS, name: 'DISTILLATION' },
  { patterns: WATERMARK_REMOVAL_PATTERNS, name: 'WATERMARK_REMOVAL' },
  { patterns: ARCHITECTURE_PROBING_PATTERNS, name: 'ARCHITECTURE_PROBING' },
];
const MT_DETECTORS = [{ name: 'model-theft', detect: detectModelTheft }];

function shouldSuppressPattern(patternName: string, text: string, normalized: string): boolean {
  if ((patternName === 'mt_side_channel' || patternName === 'mt_cache_timing') && BENIGN_SIDE_CHANNEL_CONTROL_RE.test(text)) {
    return true;
  }

  if (patternName === 'mt_behavior_fingerprint' && /generally\s+what\s+type\s+of\s+ai\s+i['’]m\s+talking\s+to|not\s+your\s+specific\s+version\s+or\s+technical\s+details/i.test(normalized)) {
    return true;
  }

  if (patternName === 'mt_boundary_mapping' && /not\s+an\s+attempt\s+to\s+(?:extract\s+internal\s+representations\s+or\s+)?probe\s+decision\s+boundaries/i.test(normalized)) {
    return true;
  }

  return false;
}

const modelTheftDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects model extraction, weight theft, and API fingerprinting patterns',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'MODELTHEFT_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for model-theft-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'model_theft_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of MT_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m && !shouldSuppressPattern(p.name, text, normalized)) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of MT_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return MT_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + MT_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = MT_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'mt-detectors', count: MT_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

if (!scannerRegistry.hasModule('model-theft-detector')) {
  scannerRegistry.register(modelTheftDetectorModule);
}
export { modelTheftDetectorModule };
