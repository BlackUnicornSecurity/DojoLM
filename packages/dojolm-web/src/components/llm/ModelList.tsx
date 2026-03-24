/**
 * File: ModelList.tsx
 * Purpose: Model configuration list and management
 * Index:
 * - ModelList component (line 28)
 * - ModelCard component (line 140)
 */

'use client';

import { useMemo, useState } from 'react';
import { useModelContext } from '@/lib/contexts';
import type { LLMModelConfig } from '@/lib/llm-types';
import { PROVIDER_INFO } from '@/lib/llm-constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, TestTube, Check, X, RefreshCw, Brain } from 'lucide-react';
import { ModelForm } from './ModelForm';

/**
 * Model List Component
 *
 * Displays all configured models with actions to edit, delete, test, and enable/disable
 */
export function ModelList() {
  const { models, isLoading, error, saveModel, deleteModel, toggleModel, testModel, refresh } = useModelContext();

  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<LLMModelConfig | null>(null);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const handleAddModel = () => {
    setEditingModel(null);
    setShowForm(true);
  };

  const handleEditModel = (model: LLMModelConfig) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleDeleteModel = async (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      await deleteModel(id);
    }
  };

  const handleTestModel = async (id: string) => {
    setTestingModel(id);
    const result = await testModel(id);
    setTestResults(prev => ({ ...prev, [id]: result }));
    setTestingModel(null);
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await toggleModel(id, enabled);
  };

  const handleSaveModel = async (modelData: Omit<LLMModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    await saveModel(modelData);
    setShowForm(false);
    setEditingModel(null);
  };

  const modelSummary = useMemo(() => {
    const enabledCount = models.filter(model => model.enabled).length;
    const guardRequiredCount = models.filter(model => model.requiresGuard).length;
    const elevatedRiskCount = models.filter(model => model.safetyRisk && model.safetyRisk !== 'LOW' && model.safetyRisk !== 'SAFE').length;

    return {
      enabledCount,
      disabledCount: models.length - enabledCount,
      guardRequiredCount,
      elevatedRiskCount,
    };
  }, [models]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-500/10">
        <CardContent className="p-4">
          <p className="text-red-500">Error loading models: {error}</p>
          <Button onClick={refresh} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div>
            <h3 className="text-page-title text-[var(--foreground)]">Configured Models ({models.length})</h3>
            <p className="text-sm text-muted-foreground">
              Manage provider coverage, test readiness, and risk posture from one command surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="active">{modelSummary.enabledCount} enabled</Badge>
            <Badge variant="outline">{modelSummary.disabledCount} standby</Badge>
            <Badge variant={modelSummary.guardRequiredCount > 0 ? 'warning' : 'success'}>
              {modelSummary.guardRequiredCount} guard-gated
            </Badge>
            <Badge variant={modelSummary.elevatedRiskCount > 0 ? 'error' : 'success'}>
              {modelSummary.elevatedRiskCount} elevated risk
            </Badge>
          </div>
        </div>
        <div>
          <Button onClick={handleAddModel} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
        </div>
      </div>

      {models.length === 0 ? (
        <Card variant="interactive" className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bu-electric-subtle)] text-[var(--bu-electric)]">
              <Brain className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No models configured</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
              Add your first LLM model to start testing, tracking provider coverage, and exporting results from the dashboard.
            </p>
            <Button onClick={handleAddModel} variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              onEdit={() => handleEditModel(model)}
              onDelete={() => handleDeleteModel(model.id)}
              onTest={() => handleTestModel(model.id)}
              onToggle={(enabled) => handleToggleEnabled(model.id, enabled)}
              isTesting={testingModel === model.id}
              testResult={testResults[model.id]}
            />
          ))}

          <button
            type="button"
            onClick={handleAddModel}
            className="text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            aria-label="Add Model"
          >
            <Card variant="interactive" className="h-full border-dashed">
              <CardContent className="flex h-full min-h-[280px] flex-col items-start justify-between p-5">
                <div className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bu-electric-subtle)] text-[var(--bu-electric)]">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-[var(--foreground)]">Add Model</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create another provider card and keep the grid balanced as your evaluation stack grows.
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bu-electric)]">
                  Expand Coverage
                </p>
              </CardContent>
            </Card>
          </button>
        </div>
      )}

      {showForm && (
        <ModelForm
          model={editingModel}
          onSave={handleSaveModel}
          onCancel={() => {
            setShowForm(false);
            setEditingModel(null);
          }}
        />
      )}
    </>
  );
}

/**
 * Individual model card component
 */
interface ModelCardProps {
  model: LLMModelConfig;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onToggle: (enabled: boolean) => void;
  isTesting: boolean;
  testResult?: { success: boolean; error?: string };
}

function formatUpdatedAt(value: string) {
  if (!value) return 'Not yet synced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet synced';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRiskBadgeVariant(risk?: LLMModelConfig['safetyRisk']) {
  switch (risk) {
    case 'CRITICAL':
      return 'critical' as const;
    case 'HIGH':
      return 'high' as const;
    case 'MEDIUM':
      return 'medium' as const;
    case 'LOW':
      return 'low' as const;
    case 'SAFE':
      return 'success' as const;
    default:
      return 'outline' as const;
  }
}

function ModelCard({ model, onEdit, onDelete, onTest, onToggle, isTesting, testResult }: ModelCardProps) {
  const providerInfo = PROVIDER_INFO[model.provider];
  const updatedLabel = formatUpdatedAt(model.updatedAt);
  const riskLabel = model.safetyRisk ?? 'Unrated';

  return (
    <Card variant={model.enabled ? 'interactive' : 'default'} className={model.enabled ? '' : 'border-muted opacity-[0.85]'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex-1 min-w-0 ${!model.enabled ? 'opacity-50' : ''}`}>
            <CardTitle className="text-base truncate">{model.name}</CardTitle>
            <CardDescription className="mt-1 text-xs truncate">{model.model}</CardDescription>
          </div>
          <Badge variant={model.enabled ? 'active' : 'secondary'} className="shrink-0">
            {model.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex flex-wrap items-center gap-2 ${!model.enabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[var(--bg-quaternary)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <span className="text-[10px] font-bold text-[var(--bu-electric)]">
                {(providerInfo?.name || model.provider).charAt(0).toUpperCase()}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {providerInfo?.name || model.provider}
            </Badge>
          </div>
          {model.baseUrl && model.provider !== 'openai' && model.provider !== 'anthropic' && (
            <Badge variant="outline" className="text-xs">
              Custom URL
            </Badge>
          )}
          {model.requiresGuard && (
            <Badge variant="warning" className="text-xs">
              Guard Required
            </Badge>
          )}
          <Badge variant={getRiskBadgeVariant(model.safetyRisk)} className="text-xs">
            {riskLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border-subtle)] surface-base p-3">
            <p className="text-label">Updated</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{updatedLabel}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] surface-base p-3">
            <p className="text-label">Max Tokens</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
              {model.maxTokens ? model.maxTokens.toLocaleString() : 'Default'}
            </p>
          </div>
        </div>

        <div className={`rounded-lg border border-[var(--border-subtle)] surface-base p-3 ${!model.enabled ? 'opacity-70' : ''}`}>
          {testResult ? (
            <div className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
              {testResult.success ? (
                <>
                  <Check className="h-3 w-3" />
                  Connection successful
                </>
              ) : (
                <>
                  <X className="h-3 w-3" />
                  {testResult.error || 'Connection failed'}
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No tests run yet</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={isTesting || !model.enabled}
          >
            <TestTube className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
          <Button
            size="sm"
            variant="ghost"
            className="px-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(!model.enabled)}
          >
            {model.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-0 text-muted-foreground hover:text-red-500 transition-colors"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
