'use client';

/**
 * CustomProviderBuilder — Configure preset-backed or fully custom API providers
 *
 * Template selection, preset hydration, auth defaults, and live connection test.
 * All communication goes through the server-side proxy.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useModelContext } from '@/lib/contexts';
import { LLM_PROVIDERS } from '@/lib/llm-types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface CustomConfig {
  name: string;
  baseUrl: string;
  model: string;
  authType: 'bearer' | 'api-key-header' | 'none';
  authHeaderName: string;
  apiKey: string;
  responsePath: string;
}

interface ProviderPresetOption {
  id: string;
  name: string;
  tier: number;
  region: string;
  isOpenAICompatible: boolean;
  authType: 'bearer' | 'api-key-header' | 'query-param' | 'aws-sigv4' | 'none';
  baseUrl: string;
  defaultModels: string[];
}

const TEMPLATES = [
  { name: 'OpenAI-Compatible', baseUrl: '', responsePath: 'choices[0].message.content' },
  { name: 'Custom from Scratch', baseUrl: '', responsePath: '' },
];

const STABLE_PROVIDER_IDS = new Set(
  LLM_PROVIDERS.filter((provider) => provider !== 'custom'),
);
const LOCAL_PROVIDER_IDS = new Set([
  'ollama',
  'lmstudio',
  'llamacpp',
  'koboldcpp',
  'text-generation-webui',
  'vllm',
]);

export function CustomProviderBuilder() {
  const { saveModel } = useModelContext();
  const [presetId, setPresetId] = useState('');
  const [presets, setPresets] = useState<ProviderPresetOption[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [config, setConfig] = useState<CustomConfig>({
    name: '',
    baseUrl: '',
    model: '',
    authType: 'bearer',
    authHeaderName: 'Authorization',
    apiKey: '',
    responsePath: 'choices[0].message.content',
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPresets() {
      setLoadingPresets(true);
      setPresetError(null);

      try {
        const response = await fetch('/api/llm/presets');
        if (!response.ok) {
          throw new Error('Failed to load provider presets');
        }

        const data = await response.json() as ProviderPresetOption[];
        if (!cancelled) {
          setPresets(data);
        }
      } catch (error) {
        if (!cancelled) {
          setPresetError(error instanceof Error ? error.message : 'Failed to load provider presets');
        }
      } finally {
        if (!cancelled) {
          setLoadingPresets(false);
        }
      }
    }

    void loadPresets();

    return () => {
      cancelled = true;
    };
  }, []);

  const presetBackedProviders = useMemo(
    () =>
      presets.filter((preset) =>
        preset.isOpenAICompatible &&
        !STABLE_PROVIDER_IDS.has(preset.id as typeof LLM_PROVIDERS[number]) &&
        !LOCAL_PROVIDER_IDS.has(preset.id),
      ),
    [presets],
  );

  const handleTestConnection = useCallback(async () => {
    setTestResult(null);

    try {
      const response = await fetchWithAuth('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name || 'Custom Test',
          provider: 'custom',
          model: config.model,
          apiKey: config.authType === 'none' ? undefined : config.apiKey,
          baseUrl: config.baseUrl,
          customHeaders: config.authType === 'api-key-header' && config.authHeaderName !== 'Authorization'
            ? { [config.authHeaderName]: config.apiKey }
            : undefined,
          enabled: false,
        }),
      });

      if (!response.ok) {
        setTestResult({ success: false, message: 'Failed to create test config' });
        return;
      }

      const data = await response.json();
      const modelId = data.model?.id ?? data.id;
      const testResp = await fetchWithAuth(`/api/llm/models/${modelId}/test`, {
        method: 'POST',
      });
      const testData = await testResp.json();

      setTestResult({
        success: Boolean(testData.success),
        message: testData.success
          ? `Connected (${testData.durationMs}ms)`
          : `Failed: ${testData.error || 'Unknown error'}`,
      });

      await fetchWithAuth(`/api/llm/models/${modelId}`, { method: 'DELETE' });
    } catch (error) {
      setTestResult({ success: false, message: (error as Error).message });
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveModel({
        name: config.name,
        provider: 'custom' as any,
        model: config.model,
        apiKey: config.authType === 'none' ? undefined : config.apiKey || undefined,
        baseUrl: config.baseUrl,
        enabled: true,
        customHeaders: config.authType === 'api-key-header' && config.authHeaderName !== 'Authorization'
          ? { [config.authHeaderName]: config.apiKey }
          : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [config, saveModel]);

  const applyTemplate = (template: typeof TEMPLATES[number]) => {
    setConfig((prev) => ({
      ...prev,
      baseUrl: template.baseUrl || prev.baseUrl,
      responsePath: template.responsePath,
    }));
  };

  const handlePresetChange = (newPresetId: string) => {
    setPresetId(newPresetId);
    const preset = presetBackedProviders.find((entry) => entry.id === newPresetId);
    if (!preset) {
      return;
    }

    setConfig((prev) => ({
      ...prev,
      name: preset.name,
      baseUrl: preset.baseUrl,
      model: preset.defaultModels[0] ?? prev.model,
      authType: preset.authType === 'api-key-header' ? 'api-key-header' : preset.authType === 'none' ? 'none' : 'bearer',
      authHeaderName: preset.authType === 'api-key-header' ? 'x-api-key' : 'Authorization',
      responsePath: 'choices[0].message.content',
    }));
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <h3 className="text-sm font-semibold">Custom Provider Builder</h3>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Preset Library</label>
        <select
          value={presetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          disabled={loadingPresets}
        >
          <option value="">
            {loadingPresets ? 'Loading provider presets...' : 'Choose a preset-backed provider'}
          </option>
          {presetBackedProviders.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} (Tier {preset.tier}, {preset.region})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          The preset library covers non-native OpenAI-compatible providers from the shared `bu-tpi` registry.
        </p>
        {presetError && (
          <p className="mt-1 text-xs text-red-500" role="alert">
            {presetError}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Template</label>
        <div className="flex gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template)}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] hover:border-[var(--dojo-primary)]"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="cp-name" className="block text-xs text-muted-foreground mb-1">Display Name</label>
          <input
            id="cp-name"
            type="text"
            value={config.name}
            onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            placeholder="My Custom Provider"
          />
        </div>
        <div>
          <label htmlFor="cp-model" className="block text-xs text-muted-foreground mb-1">Model Name</label>
          <input
            id="cp-model"
            type="text"
            value={config.model}
            onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            placeholder="my-model-v1"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="cp-url" className="block text-xs text-muted-foreground mb-1">Base URL</label>
          <input
            id="cp-url"
            type="url"
            value={config.baseUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <label htmlFor="cp-auth" className="block text-xs text-muted-foreground mb-1">Auth Type</label>
          <select
            id="cp-auth"
            value={config.authType}
            onChange={(e) => setConfig((prev) => ({ ...prev, authType: e.target.value as CustomConfig['authType'] }))}
            className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          >
            <option value="bearer">Bearer Token</option>
            <option value="api-key-header">API Key Header</option>
            <option value="none">None (Local)</option>
          </select>
        </div>
        {config.authType !== 'none' && (
          <div>
            <label htmlFor="cp-key" className="block text-xs text-muted-foreground mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                id="cp-key"
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] pr-10"
                placeholder="Enter API key"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="cp-resp" className="block text-xs text-muted-foreground mb-1">
          Response Text Path (JSON dot notation)
        </label>
        <input
          id="cp-resp"
          type="text"
          value={config.responsePath}
          onChange={(e) => setConfig((prev) => ({ ...prev, responsePath: e.target.value }))}
          className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          placeholder="choices[0].message.content"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleTestConnection}
          disabled={!config.baseUrl}
          className="px-4 py-2 text-xs rounded border border-[var(--dojo-primary)] text-[var(--dojo-primary)] disabled:opacity-50"
          aria-label="Test connection to custom provider"
        >
          Test Connection
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !config.name || !config.model || !config.baseUrl}
          className="px-4 py-2 text-xs rounded bg-[var(--dojo-primary)] text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Provider'}
        </button>

        {testResult && (
          <span className={`text-xs ${testResult.success ? 'text-green-500' : 'text-red-500'}`} role="status">
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
