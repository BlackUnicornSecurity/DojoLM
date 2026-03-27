/**
 * File: ModelForm.tsx
 * Purpose: Model configuration form for adding/editing models
 * Index:
 * - ModelForm component (line 26)
 */

'use client';

import { useState, useEffect } from 'react';
import { useModelContext } from '@/lib/contexts';
import type { LLMModelConfig, LLMProvider } from '@/lib/llm-types';
import { PROVIDER_INFO, DEFAULT_MODELS, PROVIDER_BASE_URLS, validateApiKey, TEMPERATURE_RANGE, TOP_P_RANGE } from '@/lib/llm-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Eye, EyeOff } from 'lucide-react';
import { LocalModelSelector } from './LocalModelSelector';

export interface ModelFormProps {
  /** Existing model to edit (null for new model) */
  model?: LLMModelConfig | null;
  /** Called when form is submitted with valid data */
  onSave: (model: Omit<LLMModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  /** Called when form is cancelled */
  onCancel: () => void;
}

/**
 * Model Configuration Form
 *
 * Form for adding new models or editing existing configurations
 */
export function ModelForm({ model, onSave, onCancel }: ModelFormProps) {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    provider: (model?.provider || 'openai') as LLMProvider,
    model: model?.model || '',
    apiKey: model?.apiKey || '',
    baseUrl: model?.baseUrl || '',
    enabled: model?.enabled ?? true,
    temperature: model?.temperature ?? 0.7,
    topP: model?.topP ?? 1.0,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isLocalProvider = formData.provider === 'ollama' || formData.provider === 'lmstudio' || formData.provider === 'llamacpp';
  const requiresApiKey = !isLocalProvider;
  const requiresBaseUrl =
    isLocalProvider ||
    formData.provider === 'cloudflare' ||
    formData.provider === 'custom';

  // Update form when model changes
  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name,
        provider: model.provider,
        model: model.model,
        apiKey: model.apiKey || '',
        baseUrl: model.baseUrl || '',
        enabled: model.enabled,
        temperature: model.temperature ?? 0.7,
        topP: model.topP ?? 1.0,
      });
    }
  }, [model]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Model name is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model identifier is required';
    }

    if (requiresApiKey && !formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required for this provider';
    }

    if (requiresBaseUrl && !formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required for this provider';
    }

    if (formData.apiKey && !validateApiKey(formData.provider, formData.apiKey)) {
      newErrors.apiKey = `Invalid API key format for ${formData.provider}`;
    }

    if (formData.temperature < TEMPERATURE_RANGE.min || formData.temperature > TEMPERATURE_RANGE.max) {
      newErrors.temperature = `Temperature must be between ${TEMPERATURE_RANGE.min} and ${TEMPERATURE_RANGE.max}`;
    }

    if (formData.topP < TOP_P_RANGE.min || formData.topP > TOP_P_RANGE.max) {
      newErrors.topP = `Top-p must be between ${TOP_P_RANGE.min} and ${TOP_P_RANGE.max}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProviderInfo = PROVIDER_INFO[formData.provider];
  const availableModels = DEFAULT_MODELS[formData.provider] || [];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{model ? 'Edit Model' : 'Add New Model'}</CardTitle>
            <CardDescription>
              Configure your LLM model for security testing
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., GPT-4o Production"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                provider: value as LLMProvider,
                model: '',
                baseUrl: PROVIDER_BASE_URLS[value as LLMProvider] ?? '',
              }))}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name} - {info.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedProviderInfo?.description}
            </p>
          </div>

          {/* Local Model Browser - for Ollama, LM Studio, llama.cpp */}
          {isLocalProvider && (
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Browse Available Models</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedProviderInfo?.name}
                </span>
              </div>
              <LocalModelSelector
                provider={formData.provider as 'ollama' | 'lmstudio' | 'llamacpp'}
                currentBaseUrl={formData.baseUrl}
                onSelectModel={(modelId) => setFormData(prev => ({ ...prev, model: modelId }))}
                onBaseUrlChange={(newBaseUrl) => setFormData(prev => ({ ...prev, baseUrl: newBaseUrl }))}
              />
            </div>
          )}

          {/* Model Identifier - Hidden for local providers (selected via browser) */}
          {!isLocalProvider && (
          <div className="space-y-2">
            <Label htmlFor="model">Model Identifier</Label>
            {availableModels.length > 0 ? (
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger id="model" className={errors.model ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="model"
                value={formData.model}
                onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="e.g., gpt-4o"
                className={errors.model ? 'border-red-500' : ''}
              />
            )}
            {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
          </div>
          )}

          {/* API Key */}
          {requiresApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className={errors.apiKey ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey}</p>}
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
          )}

          {/* Base URL */}
          {requiresBaseUrl && !isLocalProvider && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder={formData.provider === 'cloudflare'
                  ? 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID'
                  : 'https://api.example.com'}
                className={errors.baseUrl ? 'border-red-500' : ''}
              />
              {errors.baseUrl && <p className="text-xs text-red-500">{errors.baseUrl}</p>}
              <p className="text-xs text-muted-foreground">
                Custom API endpoint URL (for self-hosted or proxy setups)
              </p>
            </div>
          )}
          {isLocalProvider && formData.baseUrl && (
            <div className="space-y-2">
              <Label htmlFor="baseUrlDisplay">Base URL</Label>
              <Input
                id="baseUrlDisplay"
                value={formData.baseUrl}
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Managed by model browser above
              </p>
            </div>
          )}

          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature ({formData.temperature})</Label>
            <input
              id="temperature"
              type="range"
              min={TEMPERATURE_RANGE.min}
              max={TEMPERATURE_RANGE.max}
              step={0.1}
              value={formData.temperature}
              onChange={e => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
            {errors.temperature && <p className="text-xs text-red-500">{errors.temperature}</p>}
          </div>

          {/* Top-p */}
          <div className="space-y-2">
            <Label htmlFor="topP">Top-p ({formData.topP})</Label>
            <input
              id="topP"
              type="range"
              min={TOP_P_RANGE.min}
              max={TOP_P_RANGE.max}
              step={0.05}
              value={formData.topP}
              onChange={e => setFormData(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
              className="w-full"
            />
            {errors.topP && <p className="text-xs text-red-500">{errors.topP}</p>}
          </div>

          {/* Enabled checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, enabled: !!checked }))
              }
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              Enable this model for testing
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : model ? 'Update Model' : 'Add Model'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
