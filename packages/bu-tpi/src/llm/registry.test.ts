/**
 * Unit tests for Provider Registry, Config Loader, and Presets (S79)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  registerProvider,
  unregisterProvider,
  getProviderAdapter,
  listProviders,
  getProviderCount,
  resetRegistry,
  getCloudPresets,
  getLocalPresets,
  getAllPresets,
  getPreset,
  getPresetCount,
  loadConfig,
  createMockProvider,
} from './index.js';

// ===========================================================================
// Provider Registry
// ===========================================================================

describe('Provider Registry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  it('registers and retrieves a provider', () => {
    const mock = createMockProvider({ providerType: 'openai' });
    registerProvider('openai', mock);
    expect(getProviderAdapter('openai')).toBe(mock);
  });

  it('returns undefined for unregistered provider', () => {
    expect(getProviderAdapter('nonexistent')).toBeUndefined();
  });

  it('lists registered providers', () => {
    registerProvider('a', createMockProvider());
    registerProvider('b', createMockProvider());
    expect(listProviders()).toEqual(['a', 'b']);
    expect(getProviderCount()).toBe(2);
  });

  it('unregisters a provider', () => {
    registerProvider('test', createMockProvider());
    expect(unregisterProvider('test')).toBe(true);
    expect(getProviderAdapter('test')).toBeUndefined();
    expect(getProviderCount()).toBe(0);
  });

  it('resetRegistry clears all providers', () => {
    registerProvider('a', createMockProvider());
    registerProvider('b', createMockProvider());
    resetRegistry();
    expect(getProviderCount()).toBe(0);
    expect(listProviders()).toEqual([]);
  });

  it('allows re-registration of same id', () => {
    const mock1 = createMockProvider({ providerType: 'openai' });
    const mock2 = createMockProvider({ providerType: 'anthropic' });
    registerProvider('test', mock1);
    registerProvider('test', mock2);
    expect(getProviderAdapter('test')).toBe(mock2);
    expect(getProviderCount()).toBe(1);
  });
});

// ===========================================================================
// Presets
// ===========================================================================

describe('Presets', () => {
  it('has 50+ cloud presets', () => {
    const presets = getCloudPresets();
    expect(presets.length).toBeGreaterThanOrEqual(50);
  });

  it('has local presets', () => {
    const presets = getLocalPresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.some(p => p.id === 'ollama')).toBe(true);
    expect(presets.some(p => p.id === 'lmstudio')).toBe(true);
  });

  it('getAllPresets returns combined count', () => {
    const all = getAllPresets();
    expect(all.length).toBe(getCloudPresets().length + getLocalPresets().length);
    expect(getPresetCount()).toBe(all.length);
  });

  it('getPreset finds by id', () => {
    const openai = getPreset('openai');
    expect(openai).toBeDefined();
    expect(openai!.name).toBe('OpenAI');
    expect(openai!.tier).toBe(1);
  });

  it('getPreset returns undefined for unknown id', () => {
    expect(getPreset('nonexistent')).toBeUndefined();
  });

  it('all cloud presets have HTTPS base URLs', () => {
    for (const preset of getCloudPresets()) {
      expect(preset.baseUrl.startsWith('https://'), `Preset ${preset.id} should use HTTPS`).toBe(true);
    }
  });

  it('all presets have unique IDs', () => {
    const all = getAllPresets();
    const ids = new Set(all.map(p => p.id));
    expect(ids.size).toBe(all.length);
  });

  it('all presets have required fields', () => {
    for (const preset of getAllPresets()) {
      expect(preset.id, `Preset missing id`).toBeTruthy();
      expect(preset.name, `Preset ${preset.id} missing name`).toBeTruthy();
      expect(preset.tier, `Preset ${preset.id} missing tier`).toBeGreaterThanOrEqual(1);
      expect(preset.baseUrl, `Preset ${preset.id} missing baseUrl`).toBeTruthy();
      expect(preset.authType, `Preset ${preset.id} missing authType`).toBeTruthy();
      expect(typeof preset.isOpenAICompatible, `Preset ${preset.id} missing isOpenAICompatible`).toBe('boolean');
    }
  });

  it('presets are frozen (immutable)', () => {
    const preset = getPreset('openai')!;
    expect(() => {
      (preset as any).name = 'Hacked';
    }).toThrow();
  });
});

// ===========================================================================
// Config Loader
// ===========================================================================

describe('Config Loader', () => {
  const tmpDir = join(tmpdir(), 'dojolm-config-test-' + Date.now());
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    warnSpy.mockRestore();
  });

  it('returns empty array when no config file exists', () => {
    const result = loadConfig({ cwd: tmpDir });
    expect(result).toEqual([]);
  });

  it('loads valid config with env var references', () => {
    process.env.TEST_PROVIDER_API_KEY = 'sk-test-value';
    const config = {
      llm: {
        providers: [{
          id: 'test',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '${TEST_PROVIDER_API_KEY}',
        }],
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    const result = loadConfig({ cwd: tmpDir });
    expect(result).toHaveLength(1);
    expect(result[0].apiKey).toBe('sk-test-value');

    delete process.env.TEST_PROVIDER_API_KEY;
  });

  it('rejects literal API keys', () => {
    const config = {
      llm: {
        providers: [{
          id: 'test',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        }],
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    expect(() => loadConfig({ cwd: tmpDir })).toThrow('literal API key');
  });

  it('rejects non-allowlisted env vars', () => {
    const config = {
      llm: {
        providers: [{
          id: 'test',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '${PATH}',
        }],
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    expect(() => loadConfig({ cwd: tmpDir })).toThrow('non-allowlisted');
  });

  it('rejects ${GITHUB_TOKEN}', () => {
    const config = {
      llm: {
        providers: [{
          id: 'test',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '${GITHUB_TOKEN}',
        }],
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    expect(() => loadConfig({ cwd: tmpDir })).toThrow('non-allowlisted');
  });

  it('rejects ${AWS_SECRET_ACCESS_KEY}', () => {
    const config = {
      llm: {
        providers: [{
          id: 'test',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '${AWS_SECRET_ACCESS_KEY}',
        }],
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    expect(() => loadConfig({ cwd: tmpDir })).toThrow('non-allowlisted');
  });

  it('validates required fields', () => {
    const config = {
      llm: {
        providers: [{ id: 'test' }], // missing provider and model
      },
    };
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify(config));

    expect(() => loadConfig({ cwd: tmpDir })).toThrow('missing "provider" field');
  });

  it('loads from explicit configPath', () => {
    const configPath = join(tmpDir, 'custom-config.json');
    writeFileSync(configPath, JSON.stringify({
      llm: { providers: [{ id: 'x', provider: 'custom', model: 'test' }] },
    }));

    const result = loadConfig({ configPath });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('x');
  });

  it('throws for non-existent explicit configPath', () => {
    expect(() => loadConfig({ configPath: '/nonexistent/path.json' })).toThrow('Config file not found');
  });

  it('handles empty providers array', () => {
    const configPath = join(tmpDir, 'dojolm.config.json');
    writeFileSync(configPath, JSON.stringify({ llm: { providers: [] } }));

    const result = loadConfig({ cwd: tmpDir });
    expect(result).toEqual([]);
  });
});
