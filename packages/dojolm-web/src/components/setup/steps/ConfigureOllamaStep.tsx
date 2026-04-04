/**
 * File: ConfigureOllamaStep.tsx
 * Purpose: Step 2 — Discover and register Ollama models
 * Story: Setup Wizard
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type { ConfiguredModel } from '../SetupWizard';
import {
  Server,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface LocalModelInfo {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  quantization: string | null;
  modifiedAt: string;
}

interface ConfigureOllamaStepProps {
  onComplete: (models: ConfiguredModel[]) => void;
}

export function ConfigureOllamaStep({ onComplete }: ConfigureOllamaStepProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);
  const [error, setError] = useState('');
  const [discoveredModels, setDiscoveredModels] = useState<LocalModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setError('');
    setConnectionOk(false);
    setDiscoveredModels([]);
    setSelectedModels(new Set());

    try {
      const url = `/api/llm/local-models?provider=ollama&baseUrl=${encodeURIComponent(baseUrl.trim())}`;
      const res = await fetchWithAuth(url);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Connection failed' }));
        setError(data.error || `Connection failed (${res.status})`);
        return;
      }

      const data = await res.json();
      const models: LocalModelInfo[] = data.models ?? [];

      if (models.length === 0) {
        setError('Connected successfully, but no models found. Pull models with `ollama pull <model>` first.');
        setConnectionOk(true);
        return;
      }

      setDiscoveredModels(models);
      setSelectedModels(new Set(models.map(m => m.id)));
      setConnectionOk(true);
    } catch {
      setError('Could not connect to Ollama server. Is it running?');
    } finally {
      setTesting(false);
    }
  }, [baseUrl]);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }, []);

  const handleAddModels = useCallback(async () => {
    if (selectedModels.size === 0) {
      onComplete([]);
      return;
    }

    setAdding(true);
    setError('');
    const added: ConfiguredModel[] = [];

    for (const modelId of selectedModels) {
      const model = discoveredModels.find(m => m.id === modelId);
      if (!model) continue;

      try {
        const res = await fetchWithAuth('/api/llm/models', {
          method: 'POST',
          body: JSON.stringify({
            name: `Ollama - ${model.name}`,
            provider: 'ollama',
            model: model.id,
            baseUrl: baseUrl.trim(),
            enabled: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          added.push({
            provider: 'ollama',
            name: model.name,
            id: data.model?.id ?? model.id,
          });
        }
      } catch {
        // Continue with remaining models
      }
    }

    setAdding(false);
    onComplete(added);
  }, [selectedModels, discoveredModels, baseUrl, onComplete]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Server className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Configure Ollama</CardTitle>
        <CardDescription>
          Connect to your local Ollama server to discover and register models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ollama-url">Ollama Server URL</Label>
          <div className="flex gap-2">
            <Input
              id="ollama-url"
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              disabled={testing || adding}
            />
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={testing || adding || !baseUrl.trim()}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : connectionOk ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                'Test'
              )}
            </Button>
          </div>
        </div>

        {connectionOk && discoveredModels.length > 0 && (
          <div className="space-y-3">
            <Label>Discovered Models ({discoveredModels.length})</Label>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {discoveredModels.map(model => (
                <label
                  key={model.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="rounded"
                    disabled={adding}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.sizeFormatted}
                      {model.quantization ? ` \u00b7 ${model.quantization}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={() => onComplete([])}
            disabled={adding}
          >
            Skip, I&apos;ll configure later
          </button>

          {connectionOk && discoveredModels.length > 0 ? (
            <Button
              onClick={handleAddModels}
              disabled={adding || selectedModels.size === 0}
            >
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  Add {selectedModels.size} Model{selectedModels.size !== 1 ? 's' : ''}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onComplete([])}
              disabled={adding}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
