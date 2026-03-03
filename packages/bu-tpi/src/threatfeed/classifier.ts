/**
 * S61: THREATFEED Classifier
 * AI processing: classify threat type, extract patterns, assess severity.
 * Uses keyword-based classification (no external LLM dependency).
 */

import type { ThreatEntry, ThreatClassification, ThreatIndicator } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

/**
 * Keyword-to-category mapping for threat classification.
 */
const ATTACK_CATEGORY_KEYWORDS: Map<string, string[]> = new Map([
  ['prompt-injection', [
    'prompt injection', 'jailbreak', 'system prompt', 'ignore previous',
    'override instructions', 'DAN mode', 'developer mode', 'bypass safety',
    'role-play attack', 'instruction injection',
  ]],
  ['agent', [
    'agent attack', 'tool abuse', 'function calling', 'tool poisoning',
    'agent-to-agent', 'multi-agent', 'delegation abuse', 'tool override',
  ]],
  ['mcp', [
    'MCP', 'model context protocol', 'capability spoofing', 'uri traversal',
    'notification flood', 'cross-server', 'tool shadow',
  ]],
  ['dos', [
    'denial of service', 'resource exhaustion', 'token explosion',
    'context overflow', 'regex bomb', 'XML bomb', 'zip bomb',
  ]],
  ['supply-chain', [
    'supply chain', 'dependency confusion', 'typosquatting', 'package poison',
    'model poisoning', 'training data', 'backdoor', 'LoRA poison',
  ]],
  ['model-theft', [
    'model extraction', 'model stealing', 'distillation attack',
    'membership inference', 'model inversion', 'side channel',
    'weight extraction', 'API probing',
  ]],
  ['bias', [
    'bias attack', 'fairness exploit', 'demographic steering',
    'stereotype amplification', 'discrimination', 'social bias',
  ]],
  ['web', [
    'XSS', 'cross-site scripting', 'CSRF', 'SQL injection',
    'SSRF', 'XXE', 'prototype pollution', 'open redirect',
  ]],
  ['output', [
    'output manipulation', 'response injection', 'hallucination',
    'false citation', 'misinformation', 'confabulation',
  ]],
  ['social', [
    'social engineering', 'authority spoofing', 'urgency exploit',
    'gaslighting', 'manipulation', 'pretexting',
  ]],
  ['multimodal', [
    'image injection', 'audio attack', 'visual prompt',
    'steganography', 'OCR bypass', 'alt text injection',
  ]],
  ['encoded', [
    'encoding attack', 'base64 obfuscation', 'unicode bypass',
    'punycode', 'homoglyph', 'zero-width', 'mixed encoding',
  ]],
  ['vec', [
    'vector database', 'embedding attack', 'RAG poisoning',
    'semantic search', 'similarity spoofing', 'namespace traversal',
  ]],
  ['session', [
    'session hijack', 'context poisoning', 'persistent injection',
    'multi-turn attack', 'gradual escalation', 'OAuth injection',
  ]],
  ['environmental', [
    'environment variable', 'config injection', 'dotenv',
    'registry injection', 'YAML injection',
  ]],
  ['document-attacks', [
    'document attack', 'PDF injection', 'DOCX macro', 'DDE',
    'OLE embed', 'spreadsheet formula', 'CSV injection',
  ]],
  ['token-attacks', [
    'token attack', 'BPE', 'tokenizer', 'token boundary',
    'subword', 'token count', 'token overflow',
  ]],
]);

/**
 * Classify a threat entry by matching content against keyword categories.
 */
export function classifyThreat(entry: ThreatEntry): ThreatClassification {
  if (entry.rawContent.length > MAX_INPUT_LENGTH) {
    return { type: 'unknown', confidence: 0, reasoning: 'Content too large to classify' };
  }

  const content = `${entry.title} ${entry.description} ${entry.rawContent}`.toLowerCase();
  let bestMatch = '';
  let bestScore = 0;
  const matchReasons: string[] = [];

  for (const [category, keywords] of ATTACK_CATEGORY_KEYWORDS) {
    let score = 0;
    const matched: string[] = [];

    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score++;
        matched.push(keyword);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
      matchReasons.length = 0;
      matchReasons.push(...matched);
    }
  }

  if (bestScore === 0) {
    return { type: 'unknown', confidence: 0, reasoning: 'No matching keywords found' };
  }

  const totalKeywords = ATTACK_CATEGORY_KEYWORDS.get(bestMatch)?.length ?? 1;
  const confidence = Math.min(1.0, bestScore / Math.max(totalKeywords * 0.3, 1));

  return {
    type: bestMatch,
    confidence,
    reasoning: `Matched keywords: ${matchReasons.join(', ')}`,
  };
}

/**
 * Extract threat indicators from content.
 */
export function extractIndicators(content: string): ThreatIndicator[] {
  if (content.length > MAX_INPUT_LENGTH) return [];

  const indicators: ThreatIndicator[] = [];

  // IP addresses
  const ipMatches = content.matchAll(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
  for (const match of ipMatches) {
    indicators.push({
      type: 'ip',
      value: match[1],
      context: content.slice(Math.max(0, match.index! - 50), match.index! + 50),
    });
  }

  // Domain names
  const domainMatches = content.matchAll(/\b([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+)\b/g);
  for (const match of domainMatches) {
    indicators.push({
      type: 'domain',
      value: match[1],
      context: content.slice(Math.max(0, match.index! - 50), match.index! + 50),
    });
  }

  // SHA hashes
  const hashMatches = content.matchAll(/\b([a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})\b/g);
  for (const match of hashMatches) {
    indicators.push({
      type: 'hash',
      value: match[1],
      context: content.slice(Math.max(0, match.index! - 50), match.index! + 50),
    });
  }

  // MITRE ATT&CK techniques
  const mitreMethods = content.matchAll(/\b(T\d{4}(?:\.\d{3})?)\b/g);
  for (const match of mitreMethods) {
    indicators.push({
      type: 'technique',
      value: match[1],
      context: content.slice(Math.max(0, match.index! - 50), match.index! + 50),
    });
  }

  return indicators;
}

/**
 * Assess confidence of a classification.
 */
export function assessConfidence(
  entry: ThreatEntry,
  classification: ThreatClassification
): number {
  let confidence = classification.confidence;

  // Boost confidence if indicators present
  if (entry.indicators.length > 0) {
    confidence = Math.min(1.0, confidence + 0.1);
  }

  // Boost if extracted patterns match classification
  if (entry.extractedPatterns.length > 0) {
    confidence = Math.min(1.0, confidence + 0.05);
  }

  // Reduce confidence for very short entries
  if (entry.rawContent.length < 50) {
    confidence *= 0.5;
  }

  return Math.round(confidence * 100) / 100;
}

/**
 * Determine severity from content analysis.
 */
export function assessSeverity(
  content: string,
  classification: ThreatClassification
): 'INFO' | 'WARNING' | 'CRITICAL' {
  const lower = content.toLowerCase();

  // Critical indicators
  if (
    /(?:zero[- ]day|0[- ]day|rce|remote\s+code\s+execution|actively\s+exploited)/i.test(lower)
  ) {
    return 'CRITICAL';
  }

  // High confidence = warning or critical
  if (classification.confidence > 0.8) return 'CRITICAL';
  if (classification.confidence > 0.5) return 'WARNING';

  return 'INFO';
}
