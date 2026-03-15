/**
 * H19.2: Priority Rules — Instruction ordering hardening
 */

import type { HardeningRule } from '../types.js';

export const PRIORITY_RULES: HardeningRule[] = [
  {
    id: 'priority-critical-buried',
    name: 'Critical Instructions Buried',
    category: 'instruction_priority',
    description: 'Critical safety instructions should appear at the beginning of the prompt.',
    detect(prompt: string) {
      const lines = prompt.split('\n').filter((l) => l.trim());
      const safetyIdx = lines.findIndex((l) =>
        /\b(never|do not|must not|forbidden|prohibited)\b/i.test(l),
      );
      if (safetyIdx < 0 || safetyIdx <= 2) return null;
      return {
        id: 'priority-critical-buried',
        category: 'instruction_priority',
        severity: 'high',
        description: 'Safety-critical instructions appear too late in prompt (after line ' + safetyIdx + ').',
        location: null,
        suggestedFix: 'Move safety constraints to the first 3 lines of the prompt.',
      };
    },
    fix(prompt: string) {
      const lines = prompt.split('\n');
      const safety: string[] = [];
      const rest: string[] = [];
      for (const l of lines) {
        if (/\b(never|do not|must not|forbidden|prohibited)\b/i.test(l) && safety.length < 5) {
          safety.push(l);
        } else {
          rest.push(l);
        }
      }
      return [...safety, ...rest].join('\n');
    },
  },
  {
    id: 'priority-safety-last',
    name: 'Safety Rules at End',
    category: 'instruction_priority',
    description: 'Safety rules should not be placed at the very end where they may be truncated.',
    detect(prompt: string) {
      const lines = prompt.split('\n').filter((l) => l.trim());
      if (lines.length < 5) return null;
      const lastThree = lines.slice(-3).join(' ');
      const hasSafety = /\b(never|do not|must not|refuse|reject)\b/i.test(lastThree);
      if (!hasSafety) return null;
      return {
        id: 'priority-safety-last',
        category: 'instruction_priority',
        severity: 'medium',
        description: 'Safety rules found in the last 3 lines may be truncated by context limits.',
        location: null,
        suggestedFix: 'Move safety rules to the top of the prompt.',
      };
    },
    fix(prompt: string) {
      const lines = prompt.split('\n');
      const last: string[] = [];
      const rest: string[] = [];
      for (let i = lines.length - 1; i >= 0 && last.length < 3; i--) {
        if (/\b(never|do not|must not|refuse|reject)\b/i.test(lines[i])) {
          last.unshift(lines[i]);
          lines.splice(i, 1);
        }
      }
      return [...last, ...lines].join('\n');
    },
  },
  {
    id: 'priority-role-after-examples',
    name: 'Role Definition After Examples',
    category: 'instruction_priority',
    description: 'Role definition should precede examples and content.',
    detect(prompt: string) {
      const roleIdx = prompt.search(/\b(you are|your role|as an? )\b/i);
      const exampleIdx = prompt.search(/\b(example|for instance|e\.g\.)\b/i);
      if (roleIdx < 0 || exampleIdx < 0 || roleIdx < exampleIdx) return null;
      return {
        id: 'priority-role-after-examples',
        category: 'instruction_priority',
        severity: 'medium',
        description: 'Role definition appears after examples, reducing its effectiveness.',
        location: null,
        suggestedFix: 'Move the role definition before any examples.',
      };
    },
    fix(prompt: string) {
      const lines = prompt.split('\n');
      const roleLines: string[] = [];
      const rest: string[] = [];
      for (const l of lines) {
        if (/\b(you are|your role|as an? )\b/i.test(l) && roleLines.length < 3) {
          roleLines.push(l);
        } else {
          rest.push(l);
        }
      }
      return [...roleLines, ...rest].join('\n');
    },
  },
  {
    id: 'priority-constraints-after-content',
    name: 'Constraints After Content',
    category: 'instruction_priority',
    description: 'Output constraints should be specified before the main content/task.',
    detect(prompt: string) {
      const constraintIdx = prompt.search(/\b(format|output|respond in|limit|maximum)\b/i);
      const contentIdx = prompt.search(/\b(content|task|question|query|input)\b/i);
      if (constraintIdx < 0 || contentIdx < 0 || constraintIdx < contentIdx) return null;
      return {
        id: 'priority-constraints-after-content',
        category: 'instruction_priority',
        severity: 'low',
        description: 'Output constraints appear after the main content/task description.',
        location: null,
        suggestedFix: 'Specify output format constraints before the main task.',
      };
    },
    fix(prompt: string) {
      const lines = prompt.split('\n');
      const constraints: string[] = [];
      const rest: string[] = [];
      for (const l of lines) {
        if (/\b(format|output|respond in|limit|maximum)\b/i.test(l) && constraints.length < 3) {
          constraints.push(l);
        } else {
          rest.push(l);
        }
      }
      return [...constraints, ...rest].join('\n');
    },
  },
];
