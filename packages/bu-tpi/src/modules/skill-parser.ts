/**
 * D7.1: Shingan Skill Format Parser
 *
 * Universal parser supporting 7 skill/agent formats:
 * claude-agent, claude-skill, claude-command, mcp-tool,
 * bmad-agent, plugin-manifest, hooks-config.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { Finding, Severity } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillFormat =
  | 'claude-agent'
  | 'claude-skill'
  | 'claude-command'
  | 'mcp-tool'
  | 'bmad-agent'
  | 'plugin-manifest'
  | 'hooks-config'
  | 'unknown';

export interface SkillMetadata {
  readonly name?: string;
  readonly author?: string;
  readonly version?: string;
  readonly description?: string;
  readonly category?: string;
  readonly downloads?: number;
  readonly rating?: number;
  readonly source?: string;
  readonly permissions?: readonly string[];
}

export interface SkillSection {
  readonly heading: string;
  readonly content: string;
  readonly level: number;
}

export interface ParsedSkill {
  readonly format: SkillFormat;
  readonly metadata: SkillMetadata;
  readonly sections: readonly SkillSection[];
  readonly tools: readonly string[];
  readonly rawContent: string;
}

// ---------------------------------------------------------------------------
// Format Detection
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const YAML_TOOLS_RE = /^tools\s*:/m;

const MAX_CONTENT_LENGTH = 512_000; // 512 KB

export function detectFormat(content: string, filename?: string): SkillFormat {
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum allowed size of ${MAX_CONTENT_LENGTH} bytes (got ${content.length})`);
  }

  const lowerFile = filename?.toLowerCase() ?? '';

  // 1. Filename-based detection
  if (lowerFile.includes('.claude/commands/') || lowerFile.endsWith('.command.md')) {
    return 'claude-command';
  }
  if (lowerFile.endsWith('hooks.json') || (lowerFile.includes('.claude/') && lowerFile.endsWith('settings.json'))) {
    return 'hooks-config';
  }
  if (lowerFile.endsWith('.skill.md') || lowerFile.toUpperCase().endsWith('SKILL.MD')) {
    return 'claude-skill';
  }
  if (lowerFile.endsWith('marketplace.json') || lowerFile.endsWith('plugin.json')) {
    return 'plugin-manifest';
  }
  if (lowerFile.endsWith('.compact.md')) {
    return 'bmad-agent';
  }

  // 2. Content-based detection
  const trimmed = content.trim();

  // JSON content
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const has = (k: string) => Object.prototype.hasOwnProperty.call(parsed, k);
      if (has('inputSchema') || (has('name') && has('parameters'))) {
        return 'mcp-tool';
      }
      if (has('hooks') || has('PreToolUse') || has('PostToolUse')) {
        return 'hooks-config';
      }
      if (has('manifest_version') || has('plugin') || (has('name') && has('marketplace'))) {
        return 'plugin-manifest';
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // Markdown with YAML frontmatter containing tools:
  if (FRONTMATTER_RE.test(trimmed) && YAML_TOOLS_RE.test(trimmed)) {
    return 'claude-agent';
  }

  // BMAD agent sections
  const hasBmadSections =
    /^##\s+Role\b/m.test(content) &&
    (/^##\s+Customize\b/m.test(content) || /^##\s+Core\s+Behaviors?\b/m.test(content));
  if (hasBmadSections) {
    return 'bmad-agent';
  }

  // Claude skill (step-based instructions)
  if (/^##?\s+(?:Steps?|Instructions?|Usage)\b/im.test(content) && /\btool\s*:/im.test(content)) {
    return 'claude-skill';
  }

  // Claude command (prompt template with $ARGUMENTS or user_prompt)
  if (/\$ARGUMENTS\b/.test(content) || /\buser_prompt\b/i.test(content)) {
    return 'claude-command';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Section Extraction (Markdown)
// ---------------------------------------------------------------------------

function extractSections(content: string): readonly SkillSection[] {
  const sections: SkillSection[] = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let currentLevel = 0;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
          level: currentLevel,
        });
      }
      currentLevel = headingMatch[1]!.length;
      currentHeading = headingMatch[2]!.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
      level: currentLevel,
    });
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Tool Extraction
// ---------------------------------------------------------------------------

function extractToolReferences(content: string): readonly string[] {
  const tools = new Set<string>();

  // YAML tools: list
  const toolsBlock = /^tools\s*:\s*\n((?:\s+-\s+.+\n?)*)/m.exec(content);
  if (toolsBlock) {
    const items = toolsBlock[1]!.matchAll(/^\s+-\s+(.+)$/gm);
    for (const item of items) {
      tools.add(item[1]!.trim());
    }
  }

  // Inline tool references: tool: ToolName
  const inlineTools = content.matchAll(/\btool\s*:\s*["']?(\w+)["']?/gi);
  for (const m of inlineTools) {
    tools.add(m[1]!);
  }

  // MCP tool names
  const mcpTools = content.matchAll(/mcp__\w+__(\w+)/g);
  for (const m of mcpTools) {
    tools.add(m[0]!);
  }

  // Common tool names in backticks
  const knownTools = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'TodoWrite'];
  for (const t of knownTools) {
    if (content.includes('`' + t + '`') || new RegExp('\\btool\\s*[:=]\\s*["\']?' + t + '\\b').test(content)) {
      tools.add(t);
    }
  }

  return [...tools];
}

// ---------------------------------------------------------------------------
// YAML Frontmatter Parser (regex-based, no yaml lib)
// ---------------------------------------------------------------------------

const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseFrontmatter(content: string): Record<string, string> {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) return Object.create(null) as Record<string, string>;

  const result: Record<string, string> = Object.create(null) as Record<string, string>;
  const lines = match[1]!.split('\n');
  for (const line of lines) {
    const kvMatch = /^(\w[\w-]*)\s*:\s*(.+)$/.exec(line.trim());
    if (kvMatch && !PROTO_KEYS.has(kvMatch[1]!)) {
      result[kvMatch[1]!] = kvMatch[2]!.replace(/^["']|["']$/g, '').trim();
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Format-Specific Parsers
// ---------------------------------------------------------------------------

function parseClaudeAgent(content: string): ParsedSkill {
  const fm = parseFrontmatter(content);
  const bodyContent = content.replace(FRONTMATTER_RE, '').trim();
  const sections = extractSections(bodyContent);
  const tools = extractToolReferences(content);

  return {
    format: 'claude-agent',
    metadata: {
      name: fm['name'] ?? fm['title'],
      author: fm['author'],
      version: fm['version'],
      description: fm['description'] ?? fm['desc'],
      category: fm['category'],
      permissions: fm['permissions']?.split(/[,;]\s*/) ?? [],
    },
    sections,
    tools,
    rawContent: content,
  };
}

function parseClaudeSkill(content: string): ParsedSkill {
  const sections = extractSections(content);
  const tools = extractToolReferences(content);

  const nameSection = sections.find(s => s.level === 1);
  return {
    format: 'claude-skill',
    metadata: {
      name: nameSection?.heading,
      description: sections.find(s => /overview|description|purpose/i.test(s.heading))?.content,
    },
    sections,
    tools,
    rawContent: content,
  };
}

function parseClaudeCommand(content: string): ParsedSkill {
  const sections = extractSections(content);
  const tools = extractToolReferences(content);

  const nameSection = sections.find(s => s.level === 1);
  return {
    format: 'claude-command',
    metadata: {
      name: nameSection?.heading,
      description: sections.find(s => /description|purpose/i.test(s.heading))?.content,
    },
    sections,
    tools,
    rawContent: content,
  };
}

function parseMcpTool(content: string): ParsedSkill {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : undefined;
    const desc = typeof parsed['description'] === 'string' ? parsed['description'] : undefined;
    const version = typeof parsed['version'] === 'string' ? parsed['version'] : undefined;

    const tools: string[] = name ? [name] : [];

    return {
      format: 'mcp-tool',
      metadata: { name, description: desc, version },
      sections: [],
      tools,
      rawContent: content,
    };
  } catch {
    return { format: 'mcp-tool', metadata: {}, sections: [], tools: [], rawContent: content };
  }
}

function parseBmadAgent(content: string): ParsedSkill {
  const sections = extractSections(content);
  const tools = extractToolReferences(content);

  const nameSection = sections.find(s => s.level === 1);
  const roleSection = sections.find(s => /^Role$/i.test(s.heading));

  return {
    format: 'bmad-agent',
    metadata: {
      name: nameSection?.heading,
      description: roleSection?.content?.split('\n')[0],
    },
    sections,
    tools,
    rawContent: content,
  };
}

function parsePluginManifest(content: string): ParsedSkill {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : undefined;
    const desc = typeof parsed['description'] === 'string' ? parsed['description'] : undefined;
    const version = typeof parsed['version'] === 'string' ? parsed['version'] : undefined;
    const author = typeof parsed['author'] === 'string' ? parsed['author'] : undefined;
    const category = typeof parsed['category'] === 'string' ? parsed['category'] : undefined;
    const downloads = typeof parsed['downloads'] === 'number' ? parsed['downloads'] : undefined;
    const rating = typeof parsed['rating'] === 'number' ? parsed['rating'] : undefined;

    const permissions = Array.isArray(parsed['permissions'])
      ? (parsed['permissions'] as unknown[]).filter((p): p is string => typeof p === 'string')
      : [];

    return {
      format: 'plugin-manifest',
      metadata: { name, description: desc, version, author, category, downloads, rating, permissions },
      sections: [],
      tools: [],
      rawContent: content,
    };
  } catch {
    return { format: 'plugin-manifest', metadata: {}, sections: [], tools: [], rawContent: content };
  }
}

function parseHooksConfig(content: string): ParsedSkill {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const hookTypes: string[] = [];

    for (const key of ['PreToolUse', 'PostToolUse', 'Stop', 'hooks']) {
      if (key in parsed) hookTypes.push(key);
    }

    const hooks = (parsed['hooks'] ?? parsed) as Record<string, unknown>;
    if (typeof hooks === 'object' && hooks !== null) {
      for (const key of Object.keys(hooks)) {
        if (/^(?:Pre|Post)ToolUse|Stop$/i.test(key) && !hookTypes.includes(key)) {
          hookTypes.push(key);
        }
      }
    }

    return {
      format: 'hooks-config',
      metadata: {
        name: typeof parsed['name'] === 'string' ? parsed['name'] : 'hooks-config',
        description: 'Hook configuration with types: ' + hookTypes.join(', '),
      },
      sections: [],
      tools: hookTypes,
      rawContent: content,
    };
  } catch {
    return { format: 'hooks-config', metadata: {}, sections: [], tools: [], rawContent: content };
  }
}

function parseUnknown(content: string): ParsedSkill {
  const sections = extractSections(content);
  const tools = extractToolReferences(content);

  return {
    format: 'unknown',
    metadata: {},
    sections,
    tools,
    rawContent: content,
  };
}

// ---------------------------------------------------------------------------
// Main Parser
// ---------------------------------------------------------------------------

const FORMAT_PARSERS: Record<SkillFormat, (content: string) => ParsedSkill> = {
  'claude-agent': parseClaudeAgent,
  'claude-skill': parseClaudeSkill,
  'claude-command': parseClaudeCommand,
  'mcp-tool': parseMcpTool,
  'bmad-agent': parseBmadAgent,
  'plugin-manifest': parsePluginManifest,
  'hooks-config': parseHooksConfig,
  'unknown': parseUnknown,
};

export function parseSkill(content: string, filename?: string): ParsedSkill {
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum allowed size of ${MAX_CONTENT_LENGTH} bytes (got ${content.length})`);
  }

  const format = detectFormat(content, filename);
  const parser = FORMAT_PARSERS[format];
  return parser(content);
}
