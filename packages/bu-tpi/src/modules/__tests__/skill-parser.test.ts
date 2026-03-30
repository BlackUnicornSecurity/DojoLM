/**
 * Tests for D7.1: Shingan Skill Format Parser
 *
 * Tests detectFormat() for all 7 known formats plus unknown,
 * and parseSkill() for metadata extraction per format.
 */

import { describe, it, expect } from 'vitest';
import { detectFormat, parseSkill } from '../skill-parser.js';
import type { SkillFormat, ParsedSkill } from '../skill-parser.js';

// ---------------------------------------------------------------------------
// detectFormat — filename-based detection
// ---------------------------------------------------------------------------

describe('detectFormat — filename-based detection', () => {
  it('detects claude-command from .command.md filename', () => {
    expect(detectFormat('Some content', 'my-tool.command.md')).toBe('claude-command');
  });

  it('detects claude-command from .claude/commands/ path', () => {
    expect(detectFormat('Any content', '.claude/commands/deploy.md')).toBe('claude-command');
  });

  it('detects hooks-config from hooks.json filename', () => {
    expect(detectFormat('{}', 'hooks.json')).toBe('hooks-config');
  });

  it('detects claude-skill from .skill.md filename', () => {
    expect(detectFormat('# Skill\n## Steps\ntool: Read', 'formatter.skill.md')).toBe('claude-skill');
  });

  it('detects plugin-manifest from plugin.json filename', () => {
    expect(detectFormat('{}', 'plugin.json')).toBe('plugin-manifest');
  });

  it('detects bmad-agent from .compact.md filename', () => {
    expect(detectFormat('content', 'agent.compact.md')).toBe('bmad-agent');
  });
});

// ---------------------------------------------------------------------------
// detectFormat — content-based detection
// ---------------------------------------------------------------------------

describe('detectFormat — content-based detection', () => {
  it('detects mcp-tool from JSON with inputSchema', () => {
    const content = JSON.stringify({ name: 'my-tool', inputSchema: { type: 'object' } });
    expect(detectFormat(content)).toBe('mcp-tool');
  });

  it('detects mcp-tool from JSON with name and parameters', () => {
    const content = JSON.stringify({ name: 'search', parameters: { q: 'string' } });
    expect(detectFormat(content)).toBe('mcp-tool');
  });

  it('detects hooks-config from JSON with PreToolUse', () => {
    const content = JSON.stringify({ PreToolUse: [], PostToolUse: [] });
    expect(detectFormat(content)).toBe('hooks-config');
  });

  it('detects plugin-manifest from JSON with manifest_version', () => {
    const content = JSON.stringify({ manifest_version: '1.0', name: 'plugin' });
    expect(detectFormat(content)).toBe('plugin-manifest');
  });

  it('detects claude-agent from YAML frontmatter with tools:', () => {
    const content = '---\nname: Agent\ntools:\n  - Read\n---\n\n## Steps\nDo work.';
    expect(detectFormat(content)).toBe('claude-agent');
  });

  it('detects bmad-agent from ## Role + ## Core Behaviors sections', () => {
    const content = '# Agent\n\n## Role\nAssist user.\n\n## Core Behaviors\nBe helpful.';
    expect(detectFormat(content)).toBe('bmad-agent');
  });

  it('detects claude-command from $ARGUMENTS placeholder', () => {
    expect(detectFormat('Summarize: $ARGUMENTS')).toBe('claude-command');
  });

  it('returns unknown for unrecognized content', () => {
    expect(detectFormat('Just a plain text file.')).toBe('unknown');
  });

  it('throws when content exceeds 512KB', () => {
    const huge = 'x'.repeat(513_000);
    expect(() => detectFormat(huge)).toThrow(/exceeds maximum/);
  });
});

// ---------------------------------------------------------------------------
// parseSkill — metadata extraction
// ---------------------------------------------------------------------------

describe('parseSkill — claude-agent format', () => {
  it('extracts metadata from YAML frontmatter', () => {
    const content = '---\nname: Deploy Agent\nauthor: devteam\nversion: 2.1\ndescription: Deploys\ntools:\n  - Bash\n---\n\n## Steps\nDeploy.';
    const result: ParsedSkill = parseSkill(content);

    expect(result.format).toBe('claude-agent');
    expect(result.metadata.name).toBe('Deploy Agent');
    expect(result.metadata.author).toBe('devteam');
    expect(result.metadata.version).toBe('2.1');
  });

  it('extracts tool references from tools list', () => {
    const content = '---\nname: Agent\ntools:\n  - Read\n  - Write\n---\n\nWork.';
    const result = parseSkill(content);
    expect(result.tools).toContain('Read');
    expect(result.tools).toContain('Write');
  });

  it('extracts markdown sections from body', () => {
    const content = '---\nname: Agent\ntools:\n  - Bash\n---\n\n## Step 1\nFirst.\n\n## Step 2\nSecond.';
    const result = parseSkill(content);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]?.heading).toBe('Step 1');
  });
});

describe('parseSkill — mcp-tool format', () => {
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
    expect(result.tools).toContain('web-search');
  });
});

describe('parseSkill — plugin-manifest format', () => {
  it('extracts all manifest fields', () => {
    const content = JSON.stringify({
      manifest_version: '1.0',
      name: 'my-plugin',
      description: 'Plugin desc',
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
    expect(result.metadata.downloads).toBe(500);
    expect(result.metadata.rating).toBe(4.5);
    expect(result.metadata.permissions).toEqual(['read', 'write']);
  });
});

describe('parseSkill — hooks-config format', () => {
  it('extracts hook types from JSON', () => {
    const content = JSON.stringify({
      PreToolUse: [{ matcher: 'Bash' }],
      PostToolUse: [{ matcher: '*' }],
    });
    const result = parseSkill(content, 'hooks.json');

    expect(result.format).toBe('hooks-config');
    expect(result.tools).toContain('PreToolUse');
    expect(result.tools).toContain('PostToolUse');
  });
});

describe('parseSkill — unknown format', () => {
  it('parses plain text as unknown with sections and tools', () => {
    const content = 'Some text.\n\n## Section\nContent.\n\nUse `Read` tool.';
    const result = parseSkill(content);

    expect(result.format).toBe('unknown');
    expect(result.sections).toHaveLength(1);
    expect(result.tools).toContain('Read');
  });

  it('preserves rawContent', () => {
    const content = 'Just text.';
    const result = parseSkill(content);
    expect(result.rawContent).toBe(content);
  });

  it('throws when content exceeds 512KB', () => {
    const huge = 'x'.repeat(513_000);
    expect(() => parseSkill(huge)).toThrow(/exceeds maximum/);
  });
});
