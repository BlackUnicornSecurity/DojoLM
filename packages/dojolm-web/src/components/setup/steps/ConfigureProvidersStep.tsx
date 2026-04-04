/**
 * File: ConfigureProvidersStep.tsx
 * Purpose: Step 3 — Configure cloud LLM provider API keys
 * Story: Setup Wizard
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type { ConfiguredModel } from '../SetupWizard';
import {
  PROVIDER_INFO,
  PROVIDER_BASE_URLS,
  DEFAULT_MODELS,
} from '@/lib/llm-constants';
import type { LLMProvider } from '@/lib/llm-types';
import {
  Cloud,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';

interface ConfigureProvidersStepProps {
  onComplete: (providers: ConfiguredModel[]) => void;
}

/** Top providers shown in setup wizard */
const SETUP_PROVIDERS: LLMProvider[] = [
  'openai',
  'anthropic',
  'google',
  'groq',
  'deepseek',
  'mistral',
];

interface ProviderEntry {
  provider: LLMProvider;
  apiKey: string;
  selectedModel: string;
  added: boolean;
  error: string;
}

export function ConfigureProvidersStep({ onComplete }: ConfigureProvidersStepProps) {
  const [entries, setEntries] = useState<ProviderEntry[]>(
    SETUP_PROVIDERS.map(p => ({
      provider: p,
      apiKey: '',
      selectedModel: DEFAULT_MODELS[p]?.[0] ?? '',
      added: false,
      error: '',
    }))
  );
  const [adding, setAdding] = useState<string | null>(null);
  const [allAdded, setAllAdded] = useState<ConfiguredModel[]>([]);

  const updateEntry = useCallback((provider: LLMProvider, updates: Partial<ProviderEntry>) => {
    setEntries(prev =>
      prev.map(e => (e.provider === provider ? { ...e, ...updates } : e))
    );
  }, []);

  const addProvider = useCallback(async (entry: ProviderEntry) => {
    if (!entry.apiKey.trim() || !entry.selectedModel) return;

    setAdding(entry.provider);
    updateEntry(entry.provider, { error: '' });

    try {
      const info = PROVIDER_INFO[entry.provider];
      const res = await fetchWithAuth('/api/llm/models', {
        method: 'POST',
        body: JSON.stringify({
          name: `${info?.name ?? entry.provider} - ${entry.selectedModel}`,
          provider: entry.provider,
          model: entry.selectedModel,
          apiKey: entry.apiKey.trim(),
          baseUrl: PROVIDER_BASE_URLS[entry.provider] ?? '',
          enabled: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const added: ConfiguredModel = {
          provider: entry.provider,
          name: entry.selectedModel,
          id: data.model?.id ?? entry.selectedModel,
        };
        updateEntry(entry.provider, { added: true });
        setAllAdded(prev => [...prev, added]);
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to add' }));
        updateEntry(entry.provider, { error: data.error || 'Failed to add model' });
      }
    } catch {
      updateEntry(entry.provider, { error: 'Network error' });
    } finally {
      setAdding(null);
    }
  }, [updateEntry]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Cloud className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Cloud Providers</CardTitle>
        <CardDescription>
          Add API keys for cloud LLM providers. You can add more later from the Admin Panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[28rem] overflow-y-auto">
          {entries.map(entry => (
            <ProviderCard
              key={entry.provider}
              entry={entry}
              isAdding={adding === entry.provider}
              onUpdate={updates => updateEntry(entry.provider, updates)}
              onAdd={() => addProvider(entry)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={() => onComplete(allAdded)}
            disabled={adding !== null}
          >
            {allAdded.length > 0 ? 'Continue' : "Skip, I'll configure later"}
          </button>

          <Button
            onClick={() => onComplete(allAdded)}
            disabled={adding !== null}
          >
            {allAdded.length > 0 ? (
              <>
                Continue with {allAdded.length} model{allAdded.length !== 1 ? 's' : ''}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderCard({
  entry,
  isAdding,
  onUpdate,
  onAdd,
}: {
  entry: ProviderEntry;
  isAdding: boolean;
  onUpdate: (updates: Partial<ProviderEntry>) => void;
  onAdd: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const info = PROVIDER_INFO[entry.provider];
  const models = DEFAULT_MODELS[entry.provider] ?? [];

  if (entry.added) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <Check className="h-5 w-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{info?.name ?? entry.provider}</div>
          <div className="text-xs text-muted-foreground">{entry.selectedModel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{info?.name ?? entry.provider}</div>
          <div className="text-xs text-muted-foreground">{info?.description ?? ''}</div>
        </div>
      </div>

      {entry.error && (
        <div role="alert" className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {entry.error}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={entry.apiKey}
            onChange={e => onUpdate({ apiKey: e.target.value })}
            placeholder="API Key"
            disabled={isAdding}
            className="pr-8 text-xs h-8"
          />
          <button
            type="button"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowKey(prev => !prev)}
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>

        <select
          value={entry.selectedModel}
          onChange={e => onUpdate({ selectedModel: e.target.value })}
          disabled={isAdding}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={isAdding || !entry.apiKey.trim()}
          className="h-8 px-2"
        >
          {isAdding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
