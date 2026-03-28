/**
 * S34: Data Provenance Patterns Module
 * Detects data provenance claims, model lineage indicators, and AI watermarks.
 * Addresses OWASP-GAP-01 (LLM04) and EU-GAP-01 (AI Act training data).
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'data-provenance';
const MODULE_SOURCE = 'S34';
const ENGINE = 'data-provenance';

const MAX_INPUT_LENGTH = 500_000;
// --- Data Origin Patterns ---

export const DATA_ORIGIN_PATTERNS: RegexPattern[] = [
  { name: 'training_data_claim', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.WARNING,
    re: /(?:trained\s+on|training\s+data\s+(?:from|includes?|contains?))(?!\s+(?:renewable|green|low-carbon|carbon-neutral|french\s+grid)\b)\s+[^.]{0,120}\b(?:dataset|corpus|records?|samples?|documents?|images?|text|data|internal\s+systems?|common\s+crawl|the\s+pile|laion)\b/i,
    desc: 'Training data origin claim', source: MODULE_SOURCE, weight: 6 },
  { name: 'dataset_reference', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.INFO,
    re: /(?:dataset|corpus|data\s*set)\s*(?::|=|named|called)\s*(?:["'][^"']+["']|[A-Z][A-Za-z0-9_/-]{2,}|[A-Za-z0-9_/-]{3,}(?:v\d+)?)/i,
    desc: 'Dataset reference detected', source: MODULE_SOURCE, weight: 4 },
  { name: 'data_source_attribution', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.INFO,
    re: /(?:sourced?\s+from|data\s+(?:provided|collected|scraped|crawled)\s+(?:from|by))\s+[^.]{3,60}/i,
    desc: 'Data source attribution', source: MODULE_SOURCE, weight: 5 },
  { name: 'common_crawl_ref', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.INFO,
    re: /\b(?:Common\s*Crawl|The\s*Pile|C4|LAION|RedPajama|Dolma|FineWeb|ROOTS)\b/i,
    desc: 'Known training dataset reference', source: MODULE_SOURCE, weight: 5 },
  { name: 'copyright_data_claim', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.WARNING,
    re: /(?:copyrighted|licensed)\s+(?:data|content|material)\s+(?:used|included|in\s+training)/i,
    desc: 'Copyright data usage claim', source: MODULE_SOURCE, weight: 7 },
  { name: 'unknown_data_lineage', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /(?:(?:data\s+lineage|data\s+provenance|provenance)\s+(?:unknown|unclear|unverified)|acquired\s+from\s+anonymous\s+seller\s+on\s+marketplace)/i,
    desc: 'Unknown or unverifiable data lineage claim', source: MODULE_SOURCE, weight: 10 },
  { name: 'unvetted_label_source', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /(?:(?:ground\s+truth\s+labels?|labels?)\s+generated\s+by\s+unvetted\s+crowd\s+workers|no\s+quality\s+control)/i,
    desc: 'Labels or annotations come from unvetted workers without quality controls', source: MODULE_SOURCE, weight: 10 },
  { name: 'medical_records_scrape', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /web\s+scraping\s+of\s+medical\s+records\s+from\s+unsecured\s+hospital\s+portal/i,
    desc: 'Sensitive medical records were scraped from an unsecured portal', source: MODULE_SOURCE, weight: 10 },
  { name: 'attribution_removed_evasion', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /attribution\s+removed\s+from\s+original\s+dataset\s+to\s+avoid\s+licensing\s+obligations/i,
    desc: 'Attribution was stripped to evade licensing obligations', source: MODULE_SOURCE, weight: 10 },
  { name: 'consentless_collection', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /(?:collected|scrap(?:ed|ing))\s+without\s+consent[^\n]{0,80}public\s+social\s+media\s+profiles/i,
    desc: 'Data was collected from social media without consent', source: MODULE_SOURCE, weight: 10 },
  { name: 'competitor_dataset_leak', cat: 'PROVENANCE_DATA_ORIGIN', sev: SEVERITY.CRITICAL,
    re: /(?:fine[- ]?tuned|trained)\s+on\s+proprietary\s+dataset\s+leaked\s+from\s+competitor\s+internal\s+systems/i,
    desc: 'Model or dataset lineage includes proprietary competitor data leaked from internal systems', source: MODULE_SOURCE, weight: 10 },
];

// --- Model Provenance Patterns ---

export const MODEL_PROVENANCE_PATTERNS: RegexPattern[] = [
  { name: 'fine_tune_marker', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /(?:fine[- ]?tuned|finetuning|adapted)\s+(?:on|from|using)\s+[^.]{3,60}/i,
    desc: 'Fine-tuning provenance marker', source: MODULE_SOURCE, weight: 5 },
  { name: 'lora_signature', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /\b(?:LoRA|QLoRA|adapter|PEFT)\s*(?:rank|r\s*=|alpha|config|weights?)\b/i,
    desc: 'LoRA/adapter configuration signature', source: MODULE_SOURCE, weight: 5 },
  { name: 'model_card_ref', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /\b(?:model_card\.(?:md|json|yaml)|model\s*card\s+(?:file|path|artifact|bundle))\b/i,
    desc: 'Model card reference', source: MODULE_SOURCE, weight: 4 },
  { name: 'quantization_marker', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /(?:\b(?:GGUF|GPTQ|AWQ|GGML)\b|(?:model|weights?|checkpoint|artifact)[^\n]{0,40}\b(?:quantized|quantization|(?:4|8)-?bit)\b)/i,
    desc: 'Model quantization marker', source: MODULE_SOURCE, weight: 4 },
  { name: 'checkpoint_ref', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /\b(?:checkpoint|ckpt|safetensors|pytorch_model\.bin|model\.safetensors)\b/i,
    desc: 'Model checkpoint reference', source: MODULE_SOURCE, weight: 4 },
  { name: 'base_model_claim', cat: 'PROVENANCE_MODEL', sev: SEVERITY.INFO,
    re: /(?:based?\s+on|derived\s+from|fork\s+of|variant\s+of)\s+(?:["']?(?:GPT|Claude|Gemini|Llama|Mistral|Mixtral|Gemma|Qwen|Phi|Falcon|DeepSeek)[A-Za-z0-9_.-]*["']?|["']?[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+["']?|\bmodel[-_ ]?[A-Za-z0-9._-]+\b)/i,
    desc: 'Base model derivation claim', source: MODULE_SOURCE, weight: 5 },
];

// --- AI Watermark Patterns ---

export const WATERMARK_PATTERNS: RegexPattern[] = [
  { name: 'ai_generated_marker', cat: 'PROVENANCE_WATERMARK', sev: SEVERITY.INFO,
    re: /\b(?:AI[- ]?generated|machine[- ]?generated|synthetically[- ]?generated|auto[- ]?generated\s+content)\b/i,
    desc: 'AI-generated content marker', source: MODULE_SOURCE, weight: 6 },
  { name: 'c2pa_marker', cat: 'PROVENANCE_WATERMARK', sev: SEVERITY.INFO,
    re: /\b(?:C2PA|Content\s*Credentials|Content\s*Authenticity\s*Initiative|CAI)\b/i,
    desc: 'C2PA content provenance marker', source: MODULE_SOURCE, weight: 5 },
  { name: 'watermark_embed', cat: 'PROVENANCE_WATERMARK', sev: SEVERITY.WARNING,
    re: /(?:watermark(?:ed|ing)?|digital\s*signature)\s+(?:embed(?:ded|ding)?|inject(?:ed|ing)?|hidden)/i,
    desc: 'Watermark embedding indicator', source: MODULE_SOURCE, weight: 6 },
  { name: 'provenance_metadata', cat: 'PROVENANCE_WATERMARK', sev: SEVERITY.INFO,
    re: /\b(?:EXIF|XMP|IPTC)\s*(?:metadata|tag|field)\s*(?:contains?|includes?|shows?)/i,
    desc: 'Provenance metadata reference', source: MODULE_SOURCE, weight: 4 },
  { name: 'synthetic_text_marker', cat: 'PROVENANCE_WATERMARK', sev: SEVERITY.INFO,
    re: /\b(?:GPT|Claude|Gemini|Llama|Mistral|ChatGPT)\s*(?:generated|wrote|authored|produced|created)\b/i,
    desc: 'Specific AI model attribution', source: MODULE_SOURCE, weight: 5 },
];

// --- Pattern Groups ---

const PATTERN_GROUPS = [
  { name: 'DATA_ORIGIN_PATTERNS', patterns: DATA_ORIGIN_PATTERNS },
  { name: 'MODEL_PROVENANCE_PATTERNS', patterns: MODEL_PROVENANCE_PATTERNS },
  { name: 'WATERMARK_PATTERNS', patterns: WATERMARK_PATTERNS },
];

// --- Module Definition ---

export const dataProvenanceModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects data provenance claims, model lineage, and AI watermark indicators',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) return [];

    const findings: Finding[] = [];

    for (const group of PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = p.re.exec(normalized) ?? p.re.exec(text);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].substring(0, 120),
            source: p.source ?? MODULE_SOURCE,
            engine: ENGINE,
            pattern_name: p.name,
            weight: p.weight,
          });
        }
      }
    }

    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const g of PATTERN_GROUPS) count += g.patterns.length;
    return count;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: MODULE_SOURCE,
    }));
  },
};

// Self-register on import (with guard for hot-reload/test isolation)
if (!scannerRegistry.hasModule('data-provenance')) {
  scannerRegistry.register(dataProvenanceModule);
}
