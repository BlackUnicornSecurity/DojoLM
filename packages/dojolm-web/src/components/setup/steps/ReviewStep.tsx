/**
 * File: ReviewStep.tsx
 * Purpose: Step 5 — Summary of setup configuration and finish
 * Story: Setup Wizard
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WizardState } from '../SetupWizard';
import {
  CheckCircle2,
  Shield,
  Server,
  Cloud,
  Bot,
  SkipForward,
  Rocket,
} from 'lucide-react';

interface ReviewStepProps {
  state: WizardState;
  onFinish: () => void;
}

export function ReviewStep({ state, onFinish }: ReviewStepProps) {
  const totalModels = state.ollamaModels.length + state.cloudProviders.length;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <CardTitle>Setup Complete</CardTitle>
        <CardDescription>
          Your DojoLM platform is ready to use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Admin account */}
          <SummaryRow
            icon={<Shield className="h-4 w-4 text-primary" />}
            label="Admin Account"
            value={state.adminUsername}
          />

          {/* Ollama */}
          <SummaryRow
            icon={<Server className="h-4 w-4 text-primary" />}
            label="Ollama Models"
            value={
              state.ollamaModels.length > 0
                ? `${state.ollamaModels.length} model${state.ollamaModels.length !== 1 ? 's' : ''} registered`
                : undefined
            }
            skipped={state.ollamaModels.length === 0}
          />

          {/* Cloud providers */}
          <SummaryRow
            icon={<Cloud className="h-4 w-4 text-primary" />}
            label="Cloud Providers"
            value={
              state.cloudProviders.length > 0
                ? state.cloudProviders.map(p => p.name).join(', ')
                : undefined
            }
            skipped={state.cloudProviders.length === 0}
          />

          {/* Sensei */}
          <SummaryRow
            icon={<Bot className="h-4 w-4 text-primary" />}
            label="Sensei AI"
            value={state.senseiModelName ?? undefined}
            skipped={!state.senseiModelId}
          />
        </div>

        {totalModels === 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">
            No models were configured. You can add models anytime from the Admin Panel.
          </div>
        )}

        <Button onClick={onFinish} className="w-full" size="lg">
          <Rocket className="mr-2 h-4 w-4" />
          Launch DojoLM
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  skipped,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  skipped?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {skipped ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SkipForward className="h-3 w-3" />
            Skipped
          </div>
        ) : (
          <div className="text-xs text-muted-foreground truncate">{value}</div>
        )}
      </div>
      {!skipped && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}
