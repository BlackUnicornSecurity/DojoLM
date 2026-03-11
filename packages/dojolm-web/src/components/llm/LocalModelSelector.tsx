/**
 * File: LocalModelSelector.tsx
 * Purpose: UI component for fetching and selecting models from local LLM providers
 * Index:
 * - LocalModelSelector component (line 29)
 * - Model list display (line 120)
 * - Connection status (line 180)
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { LLMProvider } from '@/lib/llm-types';
import { PROVIDER_BASE_URLS } from '@/lib/llm-constants';
import { RefreshCw, Server, ServerOff, Check, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export interface LocalModelInfo {
  id: string;
  name: string;
  size?: number;
  sizeFormatted?: string;
  quantization?: string;
  modifiedAt?: string;
  digest?: string;
}

export interface LocalModelSelectorProps {
  /** The local provider type */
  provider: 'ollama' | 'lmstudio' | 'llamacpp';
  /** Currently selected base URL */
  currentBaseUrl?: string;
  /** Called when a model is selected */
  onSelectModel: (modelId: string) => void;
  /** Called when base URL changes (optional) */
  onBaseUrlChange?: (baseUrl: string) => void;
}

/**
 * Local Model Selector Component
 *
 * Fetches and displays available models from local LLM providers.
 * Supports Ollama, LM Studio, and llama.cpp.
 */
export function LocalModelSelector({
  provider,
  currentBaseUrl,
  onSelectModel,
  onBaseUrlChange,
}: LocalModelSelectorProps) {
  const [baseUrl, setBaseUrl] = useState(
    currentBaseUrl || PROVIDER_BASE_URLS[provider] || ''
  );
  const [models, setModels] = useState<LocalModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const defaultBaseUrl = PROVIDER_BASE_URLS[provider];

  // Auto-fetch on mount for default URL
  useEffect(() => {
    if (!currentBaseUrl && baseUrl === defaultBaseUrl) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch models from the local provider
   */
  async function fetchModels() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        provider,
        baseUrl,
      });

      const response = await fetchWithAuth(`/api/llm/local-models?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch models');
      }

      const data = await response.json();

      if (data.models && Array.isArray(data.models)) {
        setModels(data.models);
      } else {
        setModels([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle base URL change
   */
  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    if (onBaseUrlChange) {
      onBaseUrlChange(value);
    }
  }

  /**
   * Handle model selection
   */
  function handleSelectModel(model: LocalModelInfo) {
    setSelectedModel(model.id);
    onSelectModel(model.id);
  }

  /**
   * Get provider display name
   */
  function getProviderName(): string {
    const names: Record<typeof provider, string> = {
      ollama: 'Ollama',
      lmstudio: 'LM Studio',
      llamacpp: 'llama.cpp',
    };
    return names[provider];
  }

  return (
    <div className="space-y-4">
      {/* Base URL Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchModels}
            disabled={isLoading}
            className="h-7 gap-1"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isLoading ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
        <Input
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          placeholder={defaultBaseUrl}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Enter LAN IP address (e.g., 192.168.1.100) for remote instance
        </p>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        provider={getProviderName()}
        isLoading={isLoading}
        hasModels={models.length > 0}
        error={error}
      />

      {/* Models List */}
      {models.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">
                Available Models ({models.length})
              </Label>
              {selectedModel && (
                <Badge variant="outline" className="text-xs">
                  {selectedModel}
                </Badge>
              )}
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-2">
                {models.map((model) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModel === model.id}
                    onClick={() => handleSelectModel(model)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && models.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {error
            ? `Failed to connect: ${error}`
            : 'No models found. Ensure the provider is running.'}
        </div>
      )}
    </div>
  );
}

/**
 * Connection Status Indicator
 */
interface ConnectionStatusProps {
  provider: string;
  isLoading: boolean;
  hasModels: boolean;
  error: string | null;
}

function ConnectionStatus({
  provider,
  isLoading,
  hasModels,
  error,
}: ConnectionStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
        <span>Connecting to {provider}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <ServerOff className="h-4 w-4" />
        <span>{provider} unavailable</span>
      </div>
    );
  }

  if (hasModels) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Server className="h-4 w-4" />
        <span>Connected to {provider}</span>
      </div>
    );
  }

  return null;
}

/**
 * Model Item Component
 */
interface ModelItemProps {
  model: LocalModelInfo;
  isSelected: boolean;
  onClick: () => void;
}

function ModelItem({ model, isSelected, onClick }: ModelItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2 rounded border transition-colors ${
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{model.name}</div>
          <div className="text-xs text-muted-foreground truncate">{model.id}</div>
        </div>
        <div className="text-xs text-muted-foreground flex flex-col gap-1 items-end">
          {model.sizeFormatted && <span>{model.sizeFormatted}</span>}
          {model.quantization && (
            <Badge variant="secondary" className="text-xs">
              {model.quantization}
            </Badge>
          )}
          {isSelected && (
            <Check className="h-4 w-4 text-primary-foreground" />
          )}
        </div>
      </div>
    </button>
  );
}
