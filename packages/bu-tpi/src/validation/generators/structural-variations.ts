/**
 * KATANA Structural Variation Generator (K2.4)
 *
 * Transforms base samples using structural wrapping techniques:
 * Whitespace manipulation, comment injection, CDATA wrapping,
 * markdown formatting, JSON/YAML wrapping, line continuations.
 *
 * ISO 17025 Clause 7.2.2: Robustness validation through structural evasion.
 */

import type { VariationGenerator, GeneratedSampleOutput } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';
import type { GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Structural Transformation Functions
// ---------------------------------------------------------------------------

/** Insert extra whitespace between words */
function whitespaceManipulation(text: string, rng: SeededRNG): string {
  const words = text.split(' ');
  return words.map((word, i) =>
    i < words.length - 1 ? word + ' '.repeat(rng.nextInt(1, 5)) : word,
  ).join('');
}

/** Insert tabs and newlines randomly */
function tabNewlineInsertion(text: string, rng: SeededRNG): string {
  return Array.from(text).map(c => {
    if (c === ' ' && rng.next() < 0.3) {
      return rng.nextBool() ? '\t' : '\n';
    }
    return c;
  }).join('');
}

/** Wrap content in HTML comments */
function htmlCommentWrapping(text: string, rng: SeededRNG): string {
  const parts = text.split(' ');
  const result: string[] = [];
  for (const part of parts) {
    if (rng.next() < 0.2) {
      result.push(`<!-- ${rng.nextBool() ? 'note' : 'TODO'} -->`);
    }
    result.push(part);
  }
  return result.join(' ');
}

/** Wrap in CDATA sections */
function cdataWrapping(text: string): string {
  return `<![CDATA[${text}]]>`;
}

/** Wrap in markdown code blocks */
function markdownCodeBlock(text: string, rng: SeededRNG): string {
  const langs = ['', 'text', 'json', 'yaml', 'xml', 'html', 'python', 'javascript'];
  const lang = rng.pick(langs);
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

/** Wrap in markdown blockquote */
function markdownBlockquote(text: string): string {
  return text.split('\n').map(line => `> ${line}`).join('\n');
}

/** Wrap in JSON string value */
function jsonWrapping(text: string, rng: SeededRNG): string {
  const keys = ['message', 'content', 'text', 'data', 'input', 'query', 'prompt', 'instruction'];
  const key = rng.pick(keys);
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  return `{"${key}": "${escaped}"}`;
}

/** Wrap in YAML format */
function yamlWrapping(text: string, rng: SeededRNG): string {
  const keys = ['message', 'content', 'text', 'data', 'input', 'query'];
  const key = rng.pick(keys);
  // YAML multiline using | (literal block)
  const indented = text.split('\n').map(line => `  ${line}`).join('\n');
  return `${key}: |\n${indented}`;
}

/** Add line continuations (backslash-newline) */
function lineContinuations(text: string, rng: SeededRNG): string {
  const words = text.split(' ');
  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    result.push(words[i]);
    if (i < words.length - 1 && rng.next() < 0.25) {
      result.push('\\\n');
    } else if (i < words.length - 1) {
      result.push(' ');
    }
  }
  return result.join('');
}

/** Wrap in XML/HTML tags */
function xmlWrapping(text: string, rng: SeededRNG): string {
  const tags = ['div', 'span', 'p', 'section', 'data', 'content', 'message', 'input'];
  const tag = rng.pick(tags);
  return `<${tag}>${text}</${tag}>`;
}

/** Split content across multiple XML elements */
function splitXml(text: string, rng: SeededRNG): string {
  const words = text.split(' ');
  const chunkSize = rng.nextInt(2, 5);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(`<part>${chunk}</part>`);
  }
  return `<message>\n${chunks.join('\n')}\n</message>`;
}

/** Add CSS/JS style comments to text */
function codeCommentInjection(text: string, rng: SeededRNG): string {
  const comments = [
    '/* normal comment */',
    '// nothing to see here',
    '# standard comment',
    '<!-- benign -->',
    '/** documentation */',
  ];
  const words = text.split(' ');
  const insertPos = rng.nextInt(1, Math.max(1, words.length - 2));
  return [...words.slice(0, insertPos), rng.pick(comments), ...words.slice(insertPos)].join(' ');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const structuralVariationGenerator: VariationGenerator = {
  id: 'structural-variations',
  version: '1.0.0',
  description: 'Transforms samples using whitespace, comments, CDATA, markdown, JSON/YAML wrapping, and line continuations',
  variationType: 'structural',
  capabilities: ['structural_evasion', 'format_wrapping'],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    if (sample.content_type !== 'text') return [];
    if (content.length < 5) return [];

    const outputs: GeneratedSampleOutput[] = [];

    // Whitespace manipulation
    outputs.push({
      content: whitespaceManipulation(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:whitespace',
      difficulty: 'moderate',
    });

    // Tab/newline insertion
    outputs.push({
      content: tabNewlineInsertion(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:tab-newline',
      difficulty: 'moderate',
    });

    // HTML comment injection
    outputs.push({
      content: htmlCommentWrapping(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:html-comments',
      difficulty: 'moderate',
    });

    // CDATA wrapping
    outputs.push({
      content: cdataWrapping(content),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:cdata',
      difficulty: 'moderate',
    });

    // Markdown code block
    outputs.push({
      content: markdownCodeBlock(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:markdown-code',
      difficulty: 'moderate',
    });

    // JSON wrapping
    outputs.push({
      content: jsonWrapping(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:json',
      difficulty: 'moderate',
    });

    // YAML wrapping
    outputs.push({
      content: yamlWrapping(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:yaml',
      difficulty: 'moderate',
    });

    // Line continuations
    outputs.push({
      content: lineContinuations(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'structural:line-continuations',
      difficulty: 'moderate',
    });

    // Subset selection: pick 2 more from remaining variations
    const extras = [
      { fn: () => markdownBlockquote(content), type: 'structural:markdown-blockquote' },
      { fn: () => xmlWrapping(content, rng), type: 'structural:xml' },
      { fn: () => splitXml(content, rng), type: 'structural:split-xml' },
      { fn: () => codeCommentInjection(content, rng), type: 'structural:code-comments' },
    ];

    const selected = rng.shuffle(extras).slice(0, 2);
    for (const extra of selected) {
      outputs.push({
        content: extra.fn(),
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: extra.type,
        difficulty: 'moderate',
      });
    }

    return outputs;
  },
};
