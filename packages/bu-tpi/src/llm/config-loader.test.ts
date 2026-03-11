/**
 * Config Loader Tests
 *
 * Tests for loadConfig function covering file search order,
 * JSON parsing, env-var interpolation, literal API key rejection,
 * field validation, SSRF protection, and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

// Mock fs, os, and security modules
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

vi.mock('./security.js', () => ({
  validateEnvVarRef: vi.fn((ref: string) => {
    // Simulate allowlisted patterns
    return /^[A-Z][A-Z0-9_]*_(API_KEY|BASE_URL|MODEL|ORGANIZATION_ID|SECRET|PROJECT_ID)$/.test(ref);
  }),
  validateProviderUrl: vi.fn(() => true),
}));

import { readFileSync, existsSync } from 'node:fs';
import { loadConfig } from './config-loader.js';
import { validateProviderUrl } from './security.js';

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockValidateUrl = validateProviderUrl as ReturnType<typeof vi.fn>;

function makeValidConfig(providers: unknown[]) {
  return JSON.stringify({
    llm: { providers },
  });
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.CUSTOM_BASE_URL;
  });

  // =========================================================================
  // CFG-T01: Returns empty array when no config file found
  // =========================================================================
  it('CFG-T01: returns empty array when no config file exists', () => {
    mockExistsSync.mockReturnValue(false);
    const result = loadConfig({ cwd: '/fake/dir' });
    expect(result).toEqual([]);
  });

  // =========================================================================
  // CFG-T02: Loads from explicit configPath
  // =========================================================================
  it('CFG-T02: loads config from explicit configPath', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o' },
    ]));

    const result = loadConfig({ configPath: '/explicit/config.json' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(mockReadFileSync).toHaveBeenCalledWith('/explicit/config.json', 'utf-8');
  });

  // =========================================================================
  // CFG-T03: Throws when explicit configPath not found
  // =========================================================================
  it('CFG-T03: throws when explicit configPath does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(() => loadConfig({ configPath: '/missing/config.json' }))
      .toThrow('Config file not found: /missing/config.json');
  });

  // =========================================================================
  // CFG-T04: Search order — project config before user config
  // =========================================================================
  it('CFG-T04: prefers project-level config over user config', () => {
    mockExistsSync.mockImplementation((path: string) => {
      return path.includes('dojolm.config.json') && path.startsWith('/project');
    });
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o' },
    ]));

    // Mock console.warn for project config warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = loadConfig({ cwd: '/project' });

    expect(result).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Loading config from project directory'));
    warnSpy.mockRestore();
  });

  // =========================================================================
  // CFG-T05: Interpolates env var references
  // =========================================================================
  it('CFG-T05: interpolates ${ENV_VAR} references for apiKey and baseUrl', () => {
    process.env.OPENAI_API_KEY = 'sk-real-key-from-env';
    process.env.CUSTOM_BASE_URL = 'https://proxy.example.com/v1';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      {
        id: 'p1',
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '${OPENAI_API_KEY}',
        baseUrl: '${CUSTOM_BASE_URL}',
      },
    ]));

    const result = loadConfig({ configPath: '/test/config.json' });

    expect(result[0].apiKey).toBe('sk-real-key-from-env');
    expect(result[0].baseUrl).toBe('https://proxy.example.com/v1');
  });

  // =========================================================================
  // CFG-T06: Throws on non-allowlisted env var reference
  // =========================================================================
  it('CFG-T06: throws when env var reference is not on the allowlist', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', apiKey: '${PATH}' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('non-allowlisted env var');
  });

  // =========================================================================
  // CFG-T07: Throws on unset env var
  // =========================================================================
  it('CFG-T07: throws when referenced env var is not set', () => {
    delete process.env.OPENAI_API_KEY;

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', apiKey: '${OPENAI_API_KEY}' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('not set');
  });

  // =========================================================================
  // CFG-T08: Rejects literal API keys
  // =========================================================================
  it('CFG-T08: throws when config contains literal OpenAI API key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', apiKey: 'sk-abcdefghijklmnopqrstuvwxyz1234567890' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('literal API key');
  });

  // =========================================================================
  // CFG-T09: Rejects literal Anthropic API keys
  // =========================================================================
  it('CFG-T09: throws when config contains literal Anthropic API key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'anthropic', model: 'claude-3', apiKey: 'sk-ant-abcdefghijklmnopqrstuvwxyz1234567890' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('literal API key');
  });

  // =========================================================================
  // CFG-T10: Validates required fields (missing id)
  // =========================================================================
  it('CFG-T10: throws when provider entry is missing "id" field', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { provider: 'openai', model: 'gpt-4o' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('missing "id" field');
  });

  // =========================================================================
  // CFG-T11: Validates required fields (missing provider)
  // =========================================================================
  it('CFG-T11: throws when provider entry is missing "provider" field', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', model: 'gpt-4o' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('missing "provider" field');
  });

  // =========================================================================
  // CFG-T12: Validates required fields (missing model)
  // =========================================================================
  it('CFG-T12: throws when provider entry is missing "model" field', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('missing "model" field');
  });

  // =========================================================================
  // CFG-T13: Validates temperature range
  // =========================================================================
  it('CFG-T13: throws when temperature is out of range', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', temperature: 3.0 },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('invalid temperature');
  });

  // =========================================================================
  // CFG-T14: Validates maxTokens minimum
  // =========================================================================
  it('CFG-T14: throws when maxTokens is less than 1', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', maxTokens: 0 },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('invalid maxTokens');
  });

  // =========================================================================
  // CFG-T15: Validates baseUrl against SSRF blocklist
  // =========================================================================
  it('CFG-T15: throws when baseUrl fails SSRF validation', () => {
    process.env.CUSTOM_BASE_URL = 'http://169.254.169.254/metadata';
    mockValidateUrl.mockReturnValue(false);

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', baseUrl: '${CUSTOM_BASE_URL}' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('blocked baseUrl');
  });

  // =========================================================================
  // CFG-T16: Returns empty when no providers array
  // =========================================================================
  it('CFG-T16: returns empty array when config has no providers section', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ scanner: {} }));

    const result = loadConfig({ configPath: '/test/config.json' });
    expect(result).toEqual([]);
  });

  // =========================================================================
  // CFG-T17: Throws on invalid JSON
  // =========================================================================
  it('CFG-T17: throws when config file contains invalid JSON', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json {{{');

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('Failed to parse config file');
  });

  // =========================================================================
  // CFG-T18: Validates enabled must be boolean
  // =========================================================================
  it('CFG-T18: throws when enabled field is not a boolean', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(makeValidConfig([
      { id: 'p1', provider: 'openai', model: 'gpt-4o', enabled: 'yes' },
    ]));

    expect(() => loadConfig({ configPath: '/test/config.json' }))
      .toThrow('invalid enabled');
  });
});
