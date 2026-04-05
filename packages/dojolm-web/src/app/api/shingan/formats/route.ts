/**
 * D7.11 — Shingan Supported Formats Endpoint
 * GET /api/shingan/formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoShinganFormatsGet } from '@/lib/demo/mock-api-handlers';
import { checkApiAuth } from '@/lib/api-auth';

const FORMATS = [
  { id: 'claude-agent', name: 'Claude Agent', pattern: '.md with YAML frontmatter + tools: list', description: 'Claude Code agent definitions with tool permissions and system prompts' },
  { id: 'claude-skill', name: 'Claude Skill', pattern: 'SKILL.md, *.skill.md', description: 'Claude Code skill files with step-by-step instructions' },
  { id: 'claude-command', name: 'Claude Command', pattern: '.md in .claude/commands/', description: 'Claude Code custom slash commands with prompt templates' },
  { id: 'mcp-tool', name: 'MCP Tool Definition', pattern: '.ts, .json with inputSchema', description: 'Model Context Protocol tool definitions with JSON Schema parameters' },
  { id: 'bmad-agent', name: 'BMAD Compact Agent', pattern: '*.compact.md with structured sections', description: 'BMAD framework agent definitions with customization overlays' },
  { id: 'plugin-manifest', name: 'Plugin Manifest', pattern: 'marketplace.json, plugin.json', description: 'Marketplace plugin manifests with metadata and dependencies' },
  { id: 'hooks-config', name: 'Hooks Config', pattern: 'hooks.json, settings.json', description: 'Claude Code hooks configuration with PreToolUse/PostToolUse handlers' },
] as const;

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoShinganFormatsGet();

  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  return NextResponse.json({ formats: FORMATS, total: FORMATS.length });
}
