/**
 * File: ModelList.tsx
 * Purpose: Model configuration list and management
 * Index:
 * - ModelList component (line 28)
 * - ModelCard component (line 140)
 */

'use client';

import { useState } from 'react';
import { useModelContext } from '@/lib/contexts';
import type { LLMModelConfig, LLMProvider } from '@/lib/llm-types';
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configured Models ({models.length})</h3>
          <p className="text-sm text-muted-foreground">
            Manage your LLM model configurations for testing
          </p>
        </div>
        <Button onClick={handleAddModel} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No models configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first LLM model to start testing
            </p>
            <Button onClick={handleAddModel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
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

function ModelCard({ model, onEdit, onDelete, onTest, onToggle, isTesting, testResult }: ModelCardProps) {
  const providerInfo = PROVIDER_INFO[model.provider];

  return (
    <Card className={model.enabled ? '' : 'border-muted'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`flex-1 min-w-0 ${!model.enabled ? 'opacity-50' : ''}`}>
            <CardTitle className="text-base truncate">{model.name}</CardTitle>
            <CardDescription className="text-xs truncate">{model.model}</CardDescription>
          </div>
          <Badge variant={model.enabled ? 'default' : 'secondary'} className="shrink-0">
            {model.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Provider badge */}
        <div className={`flex items-center gap-2 ${!model.enabled ? 'opacity-50' : ''}`}>
          <Badge variant="outline" className="text-xs">
            {providerInfo?.name || model.provider}
          </Badge>
          {model.baseUrl && model.provider !== 'openai' && model.provider !== 'anthropic' && (
            <Badge variant="outline" className="text-xs">
              Custom URL
            </Badge>
          )}
        </div>

        {/* Test result indicator */}
        {testResult && (
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
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onToggle(!model.enabled)}
          >
            {model.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={isTesting || !model.enabled}
          >
            <TestTube className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
