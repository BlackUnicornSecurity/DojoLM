'use client';

/**
 * CustomProviderBuilder — Configure custom API providers (P8-S87)
 *
 * Template selection, base URL, auth type, custom headers,
 * request/response JSON path mapping, live connection test.
 * All communication via server-side proxy.
 */

import React, { useState, useCallback } from 'react';
import { useModelContext } from '@/lib/contexts';
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

const TEMPLATES = [
  { name: 'OpenAI-Compatible', baseUrl: '', responsePath: 'choices[0].message.content' },
  { name: 'Custom from Scratch', baseUrl: '', responsePath: '' },
];

export function CustomProviderBuilder() {
  const { saveModel } = useModelContext();
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

  const handleTestConnection = useCallback(async () => {
    setTestResult(null);
    try {
      // Test via server-side proxy endpoint
      const response = await fetchWithAuth('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name || 'Custom Test',
          provider: 'custom',
          model: config.model,
          baseUrl: config.baseUrl,
          enabled: false, // Don't enable until validated
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Now test connection
        const testResp = await fetchWithAuth(`/api/llm/models/${data.id}/test`, {
          method: 'POST',
        });
        const testData = await testResp.json();
        setTestResult({
          success: testData.success,
          message: testData.success
            ? `Connected (${testData.durationMs}ms)`
            : `Failed: ${testData.error || 'Unknown error'}`,
        });
        // Clean up test config
        await fetchWithAuth(`/api/llm/models/${data.id}`, { method: 'DELETE' });
      } else {
        setTestResult({ success: false, message: 'Failed to create test config' });
      }
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
        apiKey: config.apiKey || undefined,
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
    setConfig(prev => ({
      ...prev,
      baseUrl: template.baseUrl || prev.baseUrl,
      responsePath: template.responsePath,
    }));
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <h3 className="text-sm font-semibold">Custom Provider Builder</h3>

      {/* Template Selection */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Template</label>
        <div className="flex gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] hover:border-[var(--dojo-primary)]"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Config Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="cp-name" className="block text-xs text-muted-foreground mb-1">Display Name</label>
          <input
            id="cp-name"
            type="text"
            value={config.name}
            onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
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
            onChange={e => setConfig(p => ({ ...p, model: e.target.value }))}
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
            onChange={e => setConfig(p => ({ ...p, baseUrl: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <label htmlFor="cp-auth" className="block text-xs text-muted-foreground mb-1">Auth Type</label>
          <select
            id="cp-auth"
            value={config.authType}
            onChange={e => setConfig(p => ({ ...p, authType: e.target.value as CustomConfig['authType'] }))}
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
                onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))}
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

      {/* Response Path */}
      <div>
        <label htmlFor="cp-resp" className="block text-xs text-muted-foreground mb-1">Response Text Path (JSON dot notation)</label>
        <input
          id="cp-resp"
          type="text"
          value={config.responsePath}
          onChange={e => setConfig(p => ({ ...p, responsePath: e.target.value }))}
          className="w-full px-3 py-1.5 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          placeholder="choices[0].message.content"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center">
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
