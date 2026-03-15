/**
 * H19.2: Kotoba — Boundary Clarity Rules
 * 5 rules for detecting and fixing delimiter issues.
 */

import type { HardeningRule } from '../types.js';

export const BOUNDARY_RULES: HardeningRule[] = [
  {
    id: 'BC-001',
    name: 'Missing XML delimiters',
    category: 'boundary_clarity',
    description: 'Prompt lacks XML-style delimiters to separate sections.',
    detect(prompt) {
      if (/<\w+>[\s\S]*<\/\w+>/i.test(prompt)) return null;
      return {
        id: 'BC-001',
        category: 'boundary_clarity',
        severity: 'high',
        description: 'No XML delimiters found. Use <instructions>, <context>, <input> tags to separate sections.',
        location: null,
        suggestedFix: 'Wrap prompt sections in XML tags such as <instructions>...</instructions>.',
      };
    },
    fix(prompt) {
      if (/<\w+>[\s\S]*<\/\w+>/i.test(prompt)) return prompt;
      return `<instructions>\n${prompt}\n</instructions>`;
    },
  },
  {
    id: 'BC-002',
    name: 'Missing markdown sections',
    category: 'boundary_clarity',
    description: 'Prompt lacks markdown headers to organize content.',
    detect(prompt) {
      if (/^#{1,3}\s+\S/m.test(prompt)) return null;
      // Only flag if prompt is long enough to benefit from sections
      if (prompt.split('\n').length < 5) return null;
      return {
        id: 'BC-002',
        category: 'boundary_clarity',
        severity: 'medium',
        description: 'No markdown section headers found in multi-section prompt.',
        location: null,
        suggestedFix: 'Add markdown headers (## Instructions, ## Context) to organize prompt sections.',
      };
    },
    fix(prompt) {
      if (/^#{1,3}\s+\S/m.test(prompt)) return prompt;
      if (prompt.split('\n').length < 5) return prompt;
      return `## Instructions\n\n${prompt}`;
    },
  },
  {
    id: 'BC-003',
    name: 'No system/user separation',
    category: 'boundary_clarity',
    description: 'Prompt does not clearly separate system instructions from user input.',
    detect(prompt) {
      if (/\b(system|user|assistant)\s*[:\-]/i.test(prompt)) return null;
      return {
        id: 'BC-003',
        category: 'boundary_clarity',
        severity: 'high',
        description: 'No clear system/user role separation found.',
        location: null,
        suggestedFix: 'Add "System:" and "User:" prefixes to separate instruction types.',
      };
    },
    fix(prompt) {
      if (/\b(system|user|assistant)\s*[:\-]/i.test(prompt)) return prompt;
      return `System:\n${prompt}`;
    },
  },
  {
    id: 'BC-004',
    name: 'Weak boundary markers',
    category: 'boundary_clarity',
    description: 'Prompt uses weak or ambiguous boundary markers.',
    detect(prompt) {
      if (/^[-=*]{3,}\s*$/m.test(prompt)) return null;
      if (prompt.split('\n').length < 3) return null;
      // Only flag if there are multiple logical sections but no separators
      const hasSections = /\n\n/.test(prompt);
      if (!hasSections) return null;
      return {
        id: 'BC-004',
        category: 'boundary_clarity',
        severity: 'low',
        description: 'Multiple sections detected but no strong boundary markers (---, ===).',
        location: null,
        suggestedFix: 'Add --- or === between prompt sections for visual and logical separation.',
      };
    },
    fix(prompt) {
      if (/^[-=*]{3,}\s*$/m.test(prompt)) return prompt;
      // Replace double newlines with separator
      return prompt.replace(/\n\n+/g, '\n\n---\n\n');
    },
  },
  {
    id: 'BC-005',
    name: 'Missing closing tags',
    category: 'boundary_clarity',
    description: 'XML-style opening tags without matching closing tags.',
    detect(prompt) {
      const openTags = prompt.match(/<(\w+)>/g);
      if (!openTags) return null;
      for (const tag of openTags) {
        const name = tag.slice(1, -1);
        if (!prompt.includes(`</${name}>`)) {
          const start = prompt.indexOf(tag);
          return {
            id: 'BC-005',
            category: 'boundary_clarity',
            severity: 'high',
            description: `Opening tag <${name}> has no matching closing tag </${name}>.`,
            location: { start, end: start + tag.length },
            suggestedFix: `Add </${name}> to close the <${name}> tag.`,
          };
        }
      }
      return null;
    },
    fix(prompt) {
      let result = prompt;
      const openTags = result.match(/<(\w+)>/g);
      if (!openTags) return result;
      for (const tag of openTags) {
        const name = tag.slice(1, -1);
        if (!result.includes(`</${name}>`)) {
          result = `${result}\n</${name}>`;
        }
      }
      return result;
    },
  },
];
