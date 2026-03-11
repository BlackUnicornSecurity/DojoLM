/**
 * OpenAI-Compatible Registry Tests
 *
 * Tests for createOpenAICompatibleProvider and registerOpenAICompatibleProviders
 * covering provider creation from presets, registration filtering, and
 * exclusion of non-compatible providers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderPreset, LLMProviderAdapter } from '../types.js';

const { mockRegisterProvider, mockGetCloudPresets, mockGetLocalPresets, mockOpenAICompatibleProvider } = vi.hoisted(() => {
  return {
    mockRegisterProvider: vi.fn(),
    mockGetCloudPresets: vi.fn<() => ProviderPreset[]>(),
    mockGetLocalPresets: vi.fn<() => ProviderPreset[]>(),
    mockOpenAICompatibleProvider: vi.fn(),
  };
});

vi.mock('../registry.js', () => ({
  registerProvider: mockRegisterProvider,
  getCloudPresets: mockGetCloudPresets,
  getLocalPresets: mockGetLocalPresets,
}));

vi.mock('./openai-compatible.js', () => ({
  OpenAICompatibleProvider: mockOpenAICompatibleProvider,
}));

import {
  createOpenAICompatibleProvider,
  registerOpenAICompatibleProviders,
} from './openai-compatible-registry.js';

function makePreset(overrides: Partial<ProviderPreset> = {}): ProviderPreset {
  return {
    id: 'test-provider',
    name: 'Test Provider',
    tier: 2,
    baseUrl: 'https://api.test.com/v1',
    authType: 'bearer',
    isOpenAICompatible: true,
    models: [],
    ...overrides,
  } as ProviderPreset;
}

describe('OpenAI-Compatible Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCloudPresets.mockReturnValue([]);
    mockGetLocalPresets.mockReturnValue([]);
    mockOpenAICompatibleProvider.mockImplementation(function (this: LLMProviderAdapter, type: string) {
      (this as Record<string, unknown>).providerType = type;
    });
  });

  // =========================================================================
  // REG-T01: createOpenAICompatibleProvider creates adapter from preset
  // =========================================================================
  it('REG-T01: creates an OpenAICompatibleProvider from a preset', () => {
    const preset = makePreset({ id: 'groq', name: 'Groq' });
    const adapter = createOpenAICompatibleProvider(preset);

    expect(mockOpenAICompatibleProvider).toHaveBeenCalledWith('groq', preset);
    expect(adapter).toBeDefined();
  });

  // =========================================================================
  // REG-T02: registerOpenAICompatibleProviders registers cloud presets
  // =========================================================================
  it('REG-T02: registers OpenAI-compatible cloud presets', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'groq', name: 'Groq', isOpenAICompatible: true }),
      makePreset({ id: 'together', name: 'Together AI', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).toHaveBeenCalledTimes(2);
    expect(mockRegisterProvider.mock.calls[0][0]).toBe('groq');
    expect(mockRegisterProvider.mock.calls[1][0]).toBe('together');
  });

  // =========================================================================
  // REG-T03: excludes non-compatible providers
  // =========================================================================
  it('REG-T03: skips non-OpenAI-compatible cloud presets', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'groq', isOpenAICompatible: true }),
      makePreset({ id: 'some-other', isOpenAICompatible: false }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).toHaveBeenCalledTimes(1);
    expect(mockRegisterProvider.mock.calls[0][0]).toBe('groq');
  });

  // =========================================================================
  // REG-T04: excludes known non-compatible providers by id
  // =========================================================================
  it('REG-T04: excludes anthropic even if marked isOpenAICompatible', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'anthropic', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  it('REG-T05: excludes google even if marked isOpenAICompatible', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'google', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  it('REG-T06: excludes cohere even if marked isOpenAICompatible', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'cohere', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  it('REG-T07: excludes ai21, replicate, cloudflare, and aleph-alpha', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'ai21', isOpenAICompatible: true }),
      makePreset({ id: 'replicate', isOpenAICompatible: true }),
      makePreset({ id: 'cloudflare', isOpenAICompatible: true }),
      makePreset({ id: 'aleph-alpha', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  // =========================================================================
  // REG-T08: registers local presets
  // =========================================================================
  it('REG-T08: registers OpenAI-compatible local presets', () => {
    mockGetLocalPresets.mockReturnValue([
      makePreset({ id: 'ollama', name: 'Ollama', isOpenAICompatible: true }),
      makePreset({ id: 'lmstudio', name: 'LM Studio', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).toHaveBeenCalledTimes(2);
    expect(mockRegisterProvider.mock.calls[0][0]).toBe('ollama');
    expect(mockRegisterProvider.mock.calls[1][0]).toBe('lmstudio');
  });

  // =========================================================================
  // REG-T09: skips non-compatible local presets
  // =========================================================================
  it('REG-T09: skips local presets with isOpenAICompatible false', () => {
    mockGetLocalPresets.mockReturnValue([
      makePreset({ id: 'custom-local', isOpenAICompatible: false }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  // =========================================================================
  // REG-T10: registers both cloud and local presets
  // =========================================================================
  it('REG-T10: registers both cloud and local compatible presets together', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'groq', isOpenAICompatible: true }),
      makePreset({ id: 'fireworks', isOpenAICompatible: true }),
    ]);
    mockGetLocalPresets.mockReturnValue([
      makePreset({ id: 'ollama', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).toHaveBeenCalledTimes(3);
  });

  // =========================================================================
  // REG-T11: handles empty presets gracefully
  // =========================================================================
  it('REG-T11: handles empty cloud and local presets without error', () => {
    mockGetCloudPresets.mockReturnValue([]);
    mockGetLocalPresets.mockReturnValue([]);

    expect(() => registerOpenAICompatibleProviders()).not.toThrow();
    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  // =========================================================================
  // REG-T12: excludes cohere-v2 from registry
  // =========================================================================
  it('REG-T12: excludes cohere-v2 from registration', () => {
    mockGetCloudPresets.mockReturnValue([
      makePreset({ id: 'cohere-v2', isOpenAICompatible: true }),
    ]);

    registerOpenAICompatibleProviders();

    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });
});
