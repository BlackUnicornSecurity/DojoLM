/**
 * KATANA Benign Paraphrase Variation Generator (K2.5)
 *
 * Transforms base samples using linguistic paraphrasing techniques:
 * Synonym substitution, sentence restructuring, jargon insertion,
 * formality variation. All deterministic (template-based, no LLM).
 *
 * Primary purpose: Test false positive rates by making malicious content
 * look more natural, and benign content look more suspicious.
 *
 * ISO 17025 Clause 7.2.2: Robustness validation through linguistic variation.
 */

import type { VariationGenerator, GeneratedSampleOutput } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';
import type { GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Synonym / Paraphrase Libraries
// ---------------------------------------------------------------------------

/** Common word synonyms for substitution */
const SYNONYM_MAP: Record<string, string[]> = {
  // Verbs
  'ignore': ['disregard', 'skip', 'bypass', 'overlook', 'dismiss'],
  'reveal': ['disclose', 'expose', 'show', 'display', 'present'],
  'bypass': ['circumvent', 'evade', 'sidestep', 'work around', 'get past'],
  'disable': ['turn off', 'deactivate', 'switch off', 'shut down', 'stop'],
  'output': ['print', 'display', 'show', 'emit', 'produce'],
  'execute': ['run', 'perform', 'carry out', 'process', 'invoke'],
  'delete': ['remove', 'erase', 'clear', 'wipe', 'purge'],
  'send': ['transmit', 'dispatch', 'forward', 'deliver', 'transfer'],
  'create': ['generate', 'build', 'make', 'produce', 'construct'],
  'help': ['assist', 'aid', 'support', 'guide', 'facilitate'],
  'write': ['compose', 'draft', 'author', 'pen', 'formulate'],
  'explain': ['describe', 'clarify', 'elaborate', 'illustrate', 'detail'],
  'find': ['locate', 'discover', 'identify', 'determine', 'pinpoint'],
  'use': ['utilize', 'employ', 'leverage', 'apply', 'adopt'],
  // Nouns
  'instructions': ['directives', 'guidelines', 'commands', 'directions', 'orders'],
  'system': ['platform', 'framework', 'infrastructure', 'setup', 'environment'],
  'data': ['information', 'records', 'details', 'content', 'material'],
  'prompt': ['instruction', 'directive', 'command', 'query', 'input'],
  'filter': ['check', 'screen', 'barrier', 'guard', 'control'],
  'safety': ['security', 'protection', 'safeguard', 'defense', 'shield'],
  'access': ['entry', 'admission', 'authorization', 'clearance', 'privilege'],
  'attack': ['exploit', 'breach', 'intrusion', 'compromise', 'offensive'],
  'user': ['operator', 'individual', 'person', 'client', 'consumer'],
  'password': ['credential', 'passphrase', 'secret', 'authentication key', 'PIN'],
  // Adjectives
  'important': ['critical', 'essential', 'vital', 'crucial', 'significant'],
  'hidden': ['concealed', 'secret', 'undisclosed', 'covert', 'obscured'],
  'all': ['every', 'each', 'the entire set of', 'the complete', 'the full'],
  'previous': ['prior', 'earlier', 'preceding', 'former', 'past'],
  'new': ['updated', 'fresh', 'revised', 'current', 'latest'],
};

/** Formal prefixes and suffixes */
const FORMAL_PREFIXES = [
  'Kindly ',
  'I would appreciate it if you could ',
  'Would you be so kind as to ',
  'I respectfully request that you ',
  'Please be advised that I need you to ',
  'For your consideration, ',
  'I humbly ask that you ',
  'At your earliest convenience, please ',
];

const INFORMAL_PREFIXES = [
  'Hey, ',
  'So basically ',
  'Look, just ',
  'Ok so ',
  'Yo, ',
  'Quick thing - ',
  'Alright, ',
  'Listen, ',
];

/** Technical jargon insertions */
const JARGON_INSERTIONS = [
  ' (per the documentation) ',
  ' (as specified in the API) ',
  ' (following best practices) ',
  ' (in accordance with the protocol) ',
  ' (as per standard procedure) ',
  ' (utilizing the established methodology) ',
  ' (referencing the technical specification) ',
  ' (in compliance with requirements) ',
];

/** Filler phrases that pad without changing meaning */
const FILLER_PHRASES = [
  'essentially',
  'basically',
  'in other words',
  'to put it simply',
  'in a nutshell',
  'generally speaking',
  'as a matter of fact',
  'to be more specific',
];

// ---------------------------------------------------------------------------
// Transformation Functions
// ---------------------------------------------------------------------------

function synonymSubstitution(text: string, rng: SeededRNG, probability: number): string {
  const words = text.split(/\b/);
  return words.map(word => {
    const lower = word.toLowerCase();
    const synonyms = Object.prototype.hasOwnProperty.call(SYNONYM_MAP, lower)
      ? SYNONYM_MAP[lower]
      : undefined;
    if (synonyms && synonyms.length > 0 && rng.next() < probability) {
      const replacement = rng.pick(synonyms);
      // Preserve original capitalization pattern
      if (word.length > 1 && word[0] === word[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }
    return word;
  }).join('');
}

function formalityShift(text: string, rng: SeededRNG, formal: boolean): string {
  const prefix = formal
    ? rng.pick(FORMAL_PREFIXES)
    : rng.pick(INFORMAL_PREFIXES);

  // Lowercase the first letter of original text to flow with prefix
  const adjusted = text.charAt(0).toLowerCase() + text.slice(1);
  return prefix + adjusted;
}

function jargonInsertion(text: string, rng: SeededRNG): string {
  const words = text.split(' ');
  if (words.length < 4) return text;

  const insertPos = rng.nextInt(2, Math.max(2, words.length - 2));
  const jargon = rng.pick(JARGON_INSERTIONS);
  return [...words.slice(0, insertPos), jargon.trim(), ...words.slice(insertPos)].join(' ');
}

function fillerInsertion(text: string, rng: SeededRNG): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length < 2) {
    // Insert filler into single sentence
    const words = text.split(' ');
    if (words.length < 4) return text;
    const pos = rng.nextInt(1, Math.max(1, words.length - 2));
    return [...words.slice(0, pos), rng.pick(FILLER_PHRASES) + ',', ...words.slice(pos)].join(' ');
  }
  return sentences.map(s => {
    if (rng.next() < 0.3) {
      const filler = rng.pick(FILLER_PHRASES);
      return filler.charAt(0).toUpperCase() +
        filler.slice(1) + ', ' +
        s.charAt(0).toLowerCase() + s.slice(1);
    }
    return s;
  }).join(' ');
}

function sentenceRestructure(text: string, rng: SeededRNG): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 1) return text;
  // Shuffle sentence order
  return rng.shuffle(sentences).join(' ');
}

function passiveVoice(text: string): string {
  // Simple deterministic passive voice transformations
  return text
    .replace(/\bI need you to\b/gi, 'It is needed that you')
    .replace(/\bPlease\s+(\w+)\b/gi, 'It is requested that you $1')
    .replace(/\bYou should\b/gi, 'It is recommended that you')
    .replace(/\bYou must\b/gi, 'It is required that you');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const paraphraseVariationGenerator: VariationGenerator = {
  id: 'paraphrase-variations',
  version: '1.0.0',
  description: 'Transforms samples using synonym substitution, formality variation, jargon insertion, and sentence restructuring',
  variationType: 'paraphrase',
  capabilities: ['linguistic_evasion', 'paraphrase_evasion'],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    if (sample.content_type !== 'text') return [];
    if (content.length < 10) return [];

    const outputs: GeneratedSampleOutput[] = [];

    // Synonym substitution (30% probability)
    outputs.push({
      content: synonymSubstitution(content, rng, 0.3),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:synonym',
      difficulty: 'moderate',
    });

    // Formal register shift
    outputs.push({
      content: formalityShift(content, rng, true),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:formal',
      difficulty: 'moderate',
    });

    // Informal register shift
    outputs.push({
      content: formalityShift(content, rng, false),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:informal',
      difficulty: 'moderate',
    });

    // Jargon insertion
    outputs.push({
      content: jargonInsertion(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:jargon',
      difficulty: 'moderate',
    });

    // Filler phrase insertion
    outputs.push({
      content: fillerInsertion(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:filler',
      difficulty: 'moderate',
    });

    // Passive voice transformation
    outputs.push({
      content: passiveVoice(content),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'paraphrase:passive',
      difficulty: 'moderate',
    });

    // Combined: synonym + formal
    if (rng.nextBool(0.5)) {
      outputs.push({
        content: formalityShift(synonymSubstitution(content, rng, 0.2), rng, true),
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: 'paraphrase:synonym-formal',
        difficulty: 'advanced',
      });
    }

    // Sentence restructure (only for multi-sentence content)
    if (content.includes('.') || content.includes('!') || content.includes('?')) {
      outputs.push({
        content: sentenceRestructure(content, rng),
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: 'paraphrase:restructure',
        difficulty: 'moderate',
      });
    }

    return outputs;
  },
};
