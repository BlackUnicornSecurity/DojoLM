/**
 * File: ProvisionSenseiStep.tsx
 * Purpose: Step 4 — Choose which model powers the Sensei AI assistant
 * Story: Setup Wizard
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type { ConfiguredModel } from '../SetupWizard';
import { Bot, ChevronRight, Loader2 } from 'lucide-react';

const SENSEI_MODEL_STORAGE_KEY = 'sensei-model';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface ProvisionSenseiStepProps {
  configuredModels: ConfiguredModel[];
  onComplete: (modelId: string | null, modelName: string | null) => void;
}

export function ProvisionSenseiStep({ configuredModels, onComplete }: ProvisionSenseiStepProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all enabled models from the API (covers what was just added)
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetchWithAuth('/api/llm/models');
        if (res.ok) {
          const data = await res.json();
          const list: ModelInfo[] = (data.models ?? []).map((m: Record<string, unknown>) => ({
            id: String(m.id),
            name: String(m.name),
            provider: String(m.provider),
          }));
          setModels(list);
          // Pre-select first model if available
          if (list.length > 0) {
            setSelectedId(list[0].id);
          }
        }
      } catch {
        // Fall back to wizard-tracked models
        if (configuredModels.length > 0) {
          setModels(configuredModels.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
          })));
          setSelectedId(configuredModels[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, [configuredModels]);

  const handleContinue = useCallback(() => {
    if (selectedId) {
      // Persist selection to localStorage (same key Sensei uses)
      try {
        localStorage.setItem(SENSEI_MODEL_STORAGE_KEY, selectedId);
      } catch {
        // Ignore QuotaExceededError
      }
      const model = models.find(m => m.id === selectedId);
      onComplete(selectedId, model?.name ?? null);
    } else {
      onComplete(null, null);
    }
  }, [selectedId, models, onComplete]);

  const hasModels = models.length > 0;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Provision Sensei</CardTitle>
        <CardDescription>
          Sensei is your AI assistant. Choose which model will power it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasModels ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            No models configured yet. You can set up Sensei later from the Admin Panel
            once you have added at least one model.
          </div>
        ) : (
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {models.map(model => (
              <label
                key={model.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  selectedId === model.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="sensei-model"
                  checked={selectedId === model.id}
                  onChange={() => setSelectedId(model.id)}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{model.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{model.provider}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={() => onComplete(null, null)}
          >
            Skip for now
          </button>

          <Button onClick={handleContinue}>
            {hasModels && selectedId ? (
              <>
                Set as Sensei Model
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
