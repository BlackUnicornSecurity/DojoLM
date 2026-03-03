/**
 * S35: Deepfake Indicator Patterns Module
 * Detects synthetic text, AI-generated image metadata, and voice synthesis indicators.
 * Addresses NIST-GAP-03 (deepfake detection).
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'deepfake-detector';
const MODULE_SOURCE = 'S35';
const ENGINE = 'Deepfake';

const MAX_INPUT_LENGTH = 500_000;

// --- Synthetic Text Patterns ---

export const SYNTHETIC_TEXT_PATTERNS: RegexPattern[] = [
  { name: 'ai_text_disclosure', cat: 'DEEPFAKE_SYNTHETIC_TEXT', sev: SEVERITY.WARNING,
    re: /\b(?:this\s+(?:text|content|response|message)\s+(?:was|is)\s+(?:generated|written|produced|created)\s+(?:by|using|with)\s+(?:an?\s+)?(?:AI|artificial\s+intelligence|language\s+model|LLM))\b/i,
    desc: 'AI-generated text disclosure', source: MODULE_SOURCE, weight: 6 },
  { name: 'perplexity_anomaly', cat: 'DEEPFAKE_SYNTHETIC_TEXT', sev: SEVERITY.INFO,
    re: /\b(?:perplexity|burstiness)\s*(?:score|value|metric|rating)?\s*[:=]?\s*\d+(?:\.\d+)?/i,
    desc: 'Text perplexity/burstiness metric reference', source: MODULE_SOURCE, weight: 4 },
  { name: 'ai_detector_reference', cat: 'DEEPFAKE_SYNTHETIC_TEXT', sev: SEVERITY.INFO,
    re: /\b(?:GPTZero|ZeroGPT|Originality\.ai|Turnitin\s+AI|Copyleaks\s+AI|Sapling\s+AI)\b/i,
    desc: 'AI text detection tool reference', source: MODULE_SOURCE, weight: 4 },
  { name: 'text_watermark_signal', cat: 'DEEPFAKE_SYNTHETIC_TEXT', sev: SEVERITY.WARNING,
    re: /(?:text\s+)?watermark(?:ing)?\s+(?:detected|found|present|signal|score)/i,
    desc: 'Text watermark detection signal', source: MODULE_SOURCE, weight: 6 },
];

// --- AI Image Generation Patterns ---

export const AI_IMAGE_PATTERNS: RegexPattern[] = [
  { name: 'diffusion_model_ref', cat: 'DEEPFAKE_AI_IMAGE', sev: SEVERITY.WARNING,
    re: /\b(?:Stable\s*Diffusion|DALL[·\-]?E|Midjourney|Firefly|Imagen|FLUX|SD\s*XL|SDXL)\b/i,
    desc: 'AI image generation model reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'gan_artifact', cat: 'DEEPFAKE_AI_IMAGE', sev: SEVERITY.WARNING,
    re: /\b(?:GAN|generative\s+adversarial|StyleGAN|ProGAN|BigGAN)\s*(?:artifact|generated|output|image)/i,
    desc: 'GAN generation artifact indicator', source: MODULE_SOURCE, weight: 6 },
  { name: 'image_gen_metadata', cat: 'DEEPFAKE_AI_IMAGE', sev: SEVERITY.WARNING,
    re: /(?:(?:negative_prompt|cfg_scale|model_hash|sampler_name)\s*[:=])/i,
    desc: 'AI image generation metadata (Stable Diffusion-specific parameters)', source: MODULE_SOURCE, weight: 7 },
  { name: 'deepfake_face', cat: 'DEEPFAKE_AI_IMAGE', sev: SEVERITY.CRITICAL,
    re: /\b(?:face\s*swap|deepfake\s*face|face\s*morph|face\s*generation|face\s*reenactment)\b/i,
    desc: 'Deepfake face manipulation indicator', source: MODULE_SOURCE, weight: 9 },
  { name: 'ai_upscale_ref', cat: 'DEEPFAKE_AI_IMAGE', sev: SEVERITY.INFO,
    re: /\b(?:ESRGAN|Real-ESRGAN|SwinIR|upscal(?:ed|ing)|super[- ]?resolution)\b/i,
    desc: 'AI upscaling/super-resolution reference', source: MODULE_SOURCE, weight: 4 },
];

// --- Voice Synthesis Patterns ---

export const VOICE_SYNTHESIS_PATTERNS: RegexPattern[] = [
  { name: 'tts_engine_ref', cat: 'DEEPFAKE_VOICE', sev: SEVERITY.WARNING,
    re: /\b(?:ElevenLabs|Coqui|VALL[- ]?E|Bark|Tortoise[- ]?TTS|XTTS|OpenVoice|Piper\s*TTS)\b/i,
    desc: 'AI voice synthesis engine reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'voice_clone_ref', cat: 'DEEPFAKE_VOICE', sev: SEVERITY.CRITICAL,
    re: /\bvoice\s*(?:clon(?:e|ed|ing)|spoof(?:ed|ing)?|impersonat(?:e|ed|ion|ing)|deepfake)\b/i,
    desc: 'Voice cloning/impersonation reference', source: MODULE_SOURCE, weight: 9 },
  { name: 'synthetic_speech', cat: 'DEEPFAKE_VOICE', sev: SEVERITY.WARNING,
    re: /\b(?:synthetic|generated|artificial)\s+(?:speech|voice|audio|narration)\b/i,
    desc: 'Synthetic speech indicator', source: MODULE_SOURCE, weight: 6 },
  { name: 'voice_biometric_bypass', cat: 'DEEPFAKE_VOICE', sev: SEVERITY.CRITICAL,
    re: /(?:voice\s*(?:biometric|auth(?:entication)?|verification)\s*(?:bypass|spoof|attack|defeat))/i,
    desc: 'Voice biometric bypass attempt', source: MODULE_SOURCE, weight: 9 },
];

// --- Video Deepfake Patterns ---

export const VIDEO_DEEPFAKE_PATTERNS: RegexPattern[] = [
  { name: 'video_deepfake_ref', cat: 'DEEPFAKE_VIDEO', sev: SEVERITY.CRITICAL,
    re: /\b(?:deepfake\s*video|video\s*deepfake|lip[- ]?sync\s*deepfake|video\s*manipulation)\b/i,
    desc: 'Video deepfake reference', source: MODULE_SOURCE, weight: 9 },
  { name: 'video_gen_model', cat: 'DEEPFAKE_VIDEO', sev: SEVERITY.WARNING,
    re: /\b(?:Sora|Runway|Pika|Luma|HeyGen|Synthesia|D-ID)\b/i,
    desc: 'AI video generation model reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'video_face_reenact', cat: 'DEEPFAKE_VIDEO', sev: SEVERITY.CRITICAL,
    re: /\b(?:face\s*reenactment|motion\s*transfer|puppet(?:eer)?ing|talking\s*head\s*(?:generation|synthesis))\b/i,
    desc: 'Video face reenactment technique', source: MODULE_SOURCE, weight: 9 },
];

// --- Confidence Scoring ---

export function computeDeepfakeConfidence(text: string): Finding[] {
  const findings: Finding[] = [];
  let score = 0;
  const signals: string[] = [];

  // Check for multiple deepfake indicators
  const checks = [
    { re: /\b(?:deepfake|deep\s*fake)\b/i, weight: 3, label: 'deepfake-keyword' },
    { re: /\b(?:synthetic|generated|artificial)\s+(?:media|content|image|audio|video)\b/i, weight: 2, label: 'synthetic-media' },
    { re: /\b(?:GAN|diffusion|neural\s+network)\s+(?:generated|output|artifact)/i, weight: 2, label: 'model-artifact' },
    { re: /\b(?:face\s*swap|voice\s*clone|lip\s*sync)/i, weight: 3, label: 'manipulation-technique' },
    { re: /\b(?:detection|detector|forensic|authenticity)\s+(?:model|tool|score|analysis)/i, weight: 1, label: 'detection-context' },
  ];

  for (const check of checks) {
    if (check.re.test(text)) {
      score += check.weight;
      signals.push(check.label);
    }
  }

  if (score >= 4) {
    findings.push({
      category: 'DEEPFAKE_CONFIDENCE',
      severity: score >= 7 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      description: `Deepfake content confidence: ${Math.min(score * 10, 100)}% (${signals.length} signals)`,
      match: `Signals: ${signals.join(', ')}`,
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'deepfake_confidence_score',
      weight: score,
    });
  }

  return findings;
}

// --- Pattern Groups ---

const PATTERN_GROUPS = [
  { name: 'SYNTHETIC_TEXT_PATTERNS', patterns: SYNTHETIC_TEXT_PATTERNS },
  { name: 'AI_IMAGE_PATTERNS', patterns: AI_IMAGE_PATTERNS },
  { name: 'VOICE_SYNTHESIS_PATTERNS', patterns: VOICE_SYNTHESIS_PATTERNS },
  { name: 'VIDEO_DEEPFAKE_PATTERNS', patterns: VIDEO_DEEPFAKE_PATTERNS },
];

const DETECTORS: Array<{ name: string; fn: (text: string) => Finding[] }> = [
  { name: 'computeDeepfakeConfidence', fn: computeDeepfakeConfidence },
];

// --- Module Definition ---

export const deepfakeDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects deepfake indicators: synthetic text, AI image metadata, voice synthesis, video manipulation',
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

    for (const det of DETECTORS) {
      findings.push(...det.fn(text));
    }

    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const g of PATTERN_GROUPS) count += g.patterns.length;
    return count + DETECTORS.length;
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
if (!scannerRegistry.hasModule('deepfake-detector')) {
  scannerRegistry.register(deepfakeDetectorModule);
}
