/**
 * Tests for D7.1: Shingan Skill Format Parser
 * Covers detectFormat() and parseSkill() for all 7 known formats plus unknown.
 */

import { describe, it, expect } from 'vitest';
import { detectFormat, parseSkill } from '../skill-parser.js';
import type { SkillFormat, ParsedSkill } from '../skill-parser.js';

// ---------------------------------------------------------------------------
// detectFormat — format detection
// ---------------------------------------------------------------------------

describe('detectFormat — filename-based detection', () => {
  it('detects claude-command from .command.md filename', () => {
    const result: SkillFormat = detectFormat('Some content here', 'my-tool.command.md');
    expect(result).toBe('claude-command');
  });

  it('detects claude-command from .claude/commands/ path', () => {
    const result = detectFormat('Any content', '.claude/commands/deploy.md');
    expect(result).toBe('claude-command');
  });

  it('detects hooks-config from hooks.json filename', () => {
    const result = detectFormat('{}', 'hooks.json');
    expect(result).toBe('hooks-config');
  });

  it('detects hooks-config from .claude/settings.json path', () => {
    const result = detectFormat('{}', '.claude/settings.json');
    expect(result).toBe('hooks-config');
  });

  it('detects claude-skill from .skill.md filename', () => {
    const result = detectFormat('# My Skill\n\n## Steps\ntool: Read', 'formatter.skill.md');
    expect(result).toBe('claude-skill');
  });

  it('detects plugin-manifest from plugin.json filename', () => {
    const result = detectFormat('{}', 'plugin.json');
    expect(result).toBe('plugin-manifest');
  });

  it('detects bmad-agent from .compact.md filename', () => {
    const result = detectFormat('some content', 'agent.compact.md');
    expect(result).toBe('bmad-agent');
  });
});

describe('detectFormat — content-based detection', () => {
  it('detects mcp-tool from JSON with inputSchema field', () => {
    const content = JSON.stringify({
      name: 'my-tool',
      inputSchema: { type: 'object', properties: {} },
    });
    expect(detectFormat(content)).toBe('mcp-tool');
  });

  it('detects mcp-tool from JSON with name and parameters fields', () => {
    const content = JSON.stringify({ name: 'search', parameters: { q: 'string' } });
    expect(detectFormat(content)).toBe('mcp-tool');
  });

  it('detects hooks-config from JSON with hooks field', () => {
    const content = JSON.stringify({ hooks: { PreToolUse: [] } });
    expect(detectFormat(content)).toBe('hooks-config');
  });

  it('detects hooks-config from JSON with PreToolUse field', () => {
    const content = JSON.stringify({ PreToolUse: [], PostToolUse: [] });
    expect(detectFormat(content)).toBe('hooks-config');
  });

  it('detects plugin-manifest from JSON with manifest_version field', () => {
    const content = JSON.stringify({ manifest_version: '1.0', name: 'my-plugin' });
    expect(detectFormat(content)).toBe('plugin-manifest');
  });

  it('detects claude-agent from markdown with YAML frontmatter containing tools:', () => {
    const content = '---\nname: My Agent\ntools:\n  - Read\n  - Write\n---\n\n## Instructions\nDo something.';
    expect(detectFormat(content)).toBe('claude-agent');
  });

  it('detects bmad-agent from ## Role + ## Customize sections', () => {
    const content = '# My Agent\n\n## Role\nYou are a helper.\n\n## Customize\nAdjust as needed.';
    expect(detectFormat(content)).toBe('bmad-agent');
  });

  it('detects bmad-agent from ## Role + ## Core Behaviors sections', () => {
    const content = '# Agent\n\n## Role\nAssist the user.\n\n## Core Behaviors\nBe helpful.';
    expect(detectFormat(content)).toBe('bmad-agent');
  });

  it('detects claude-skill from ## Steps heading with tool: reference', () => {
    const content = '# Format Code\n\n## Steps\ntool: Bash\nRun the formatter.';
    expect(detectFormat(content)).toBe('claude-skill');
  });

  it('detects claude-command from $ARGUMENTS placeholder', () => {
    const content = 'Please summarize the following: $ARGUMENTS';
    expect(detectFormat(content)).toBe('claude-command');
  });

  it('detects claude-command from user_prompt keyword', () => {
    const content = 'Use the user_prompt to determine the action.';
    expect(detectFormat(content)).toBe('claude-command');
  });

  it('returns unknown for unrecognized content', () => {
    const content = 'This is just a plain text file with no special markers.';
    expect(detectFormat(content)).toBe('unknown');
  });

  it('throws when content exceeds 512KB', () => {
    const huge = 'x'.repeat(513_000);
    expect(() => detectFormat(huge)).toThrow(/exceeds maximum/);
  });
});

// ---------------------------------------------------------------------------
// parseSkill — format-specific parsing
// ---------------------------------------------------------------------------

describe('parseSkill — claude-agent', () => {
  it('extracts metadata from YAML frontmatter', () => {
    const content = '---\nname: Deploy Agent\nauthor: devteam\nversion: 2.1\ndescription: Handles deployments\ntools:\n  - Bash\n---\n\n## Steps\nRun deployment.';
    const result: ParsedSkill = parseSkill(content);

    expect(result.format).toBe('claude-agent');
    expect(result.metadata.name).toBe('Deploy Agent');
    expect(result.metadata.author).toBe('devteam');
    expect(result.metadata.version).toBe('2.1');
    expect(result.metadata.description).toBe('Handles deployments');
  });

  it('extracts tool references from YAML tools list', () => {
    const content = '---\nname: Agent\ntools:\n  - Read\n  - Write\n---\n\nDo work.';
    const result = parseSkill(content);

    expect(result.tools).toContain('Read');
    expect(result.tools).toContain('Write');
  });

  it('extracts markdown sections from body (after frontmatter)', () => {
    const content = '---\nname: Agent\ntools:\n  - Bash\n---\n\n## Step 1\nDo first thing.\n\n## Step 2\nDo second thing.';
    const result = parseSkill(content);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]?.heading).toBe('Step 1');
    expect(result.sections[1]?.heading).toBe('Step 2');
  });

  it('preserves rawContent', () => {
    const content = '---\nname: Agent\ntools:\n  - Bash\n---\n\n## Steps\nWork.';
    const result = parseSkill(content);
    expect(result.rawContent).toBe(content);
  });
});

describe('parseSkill — claude-skill', () => {
  it('extracts name from H1 heading', () => {
    const content = '# Format Files\n\n## Steps\ntool: Bash\nRun prettier.';
    const result = parseSkill(content, 'format.skill.md');

    expect(result.format).toBe('claude-skill');
    expect(result.metadata.name).toBe('Format Files');
  });
});

describe('parseSkill — claude-command', () => {
  it('detects $ARGUMENTS based command format', () => {
    const content = '# Summarize\n\n## Description\nSummarizes input.\n\nSummarize this: $ARGUMENTS';
    const result = parseSkill(content);

    expect(result.format).toBe('claude-command');
  });
});

describe('parseSkill — mcp-tool', () => {
  it('extracts name and description from JSON', () => {
    const content = JSON.stringify({
      name: 'web-search',
      description: 'Searches the web',
      version: '1.0.0',
      inputSchema: { type: 'object' },
    });
    const result = parseSkill(content);

    expect(result.format).toBe('mcp-tool');
    expect(result.metadata.name).toBe('web-search');
    expect(result.metadata.description).toBe('Searches the web');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.tools).toContain('web-search');
  });

  it('handles invalid JSON gracefully with empty metadata', () => {
    const result = parseSkill('{ invalid json }', 'tool.json');
    // invalid JSON does not match mcp-tool heuristics — falls through to unknown
    expect(['mcp-tool', 'unknown']).toContain(result.format);
    expect(result.metadata).toBeDefined();
  });
});

describe('parseSkill — bmad-agent', () => {
  it('extracts name from H1 and description from Role section', () => {
    const content = '# Project Manager\n\n## Role\nYou manage projects effectively.\n\n## Core Behaviors\nBe organized.';
    const result = parseSkill(content);

    expect(result.format).toBe('bmad-agent');
    expect(result.metadata.name).toBe('Project Manager');
    expect(result.metadata.description).toBe('You manage projects effectively.');
  });
});

describe('parseSkill — plugin-manifest', () => {
  it('extracts all manifest fields from JSON', () => {
    const content = JSON.stringify({
      manifest_version: '1.0',
      name: 'my-plugin',
      description: 'Does stuff',
      version: '0.1.0',
      author: 'alice',
      category: 'utility',
      downloads: 500,
      rating: 4.5,
      permissions: ['read', 'write'],
    });
    const result = parseSkill(content);

    expect(result.format).toBe('plugin-manifest');
    expect(result.metadata.name).toBe('my-plugin');
    expect(result.metadata.author).toBe('alice');
    expect(result.metadata.category).toBe('utility');
    expect(result.metadata.downloads).toBe(500);
    expect(result.metadata.rating).toBe(4.5);
    expect(result.metadata.permissions).toEqual(['read', 'write']);
  });
});

describe('parseSkill — hooks-config', () => {
  it('extracts hook types from JSON', () => {
    const content = JSON.stringify({
      PreToolUse: [{ matcher: 'Bash', hooks: [] }],
      PostToolUse: [{ matcher: '*', hooks: [] }],
    });
    const result = parseSkill(content, 'hooks.json');

    expect(result.format).toBe('hooks-config');
    expect(result.tools).toContain('PreToolUse');
    expect(result.tools).toContain('PostToolUse');
  });
});

describe('parseSkill — unknown format', () => {
  it('parses plain text as unknown format with sections and tools', () => {
    const content = 'Some plain text.\n\n## A Section\nContent here.\n\nUse `Read` tool.';
    const result = parseSkill(content);

    expect(result.format).toBe('unknown');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.heading).toBe('A Section');
    expect(result.tools).toContain('Read');
    expect(result.metadata).toEqual({});
  });

  it('throws when content exceeds 512KB', () => {
    const huge = 'x'.repeat(513_000);
    expect(() => parseSkill(huge)).toThrow(/exceeds maximum/);
  });
});
