/**
 * File: SetupWizard.tsx
 * Purpose: Main orchestrator for the first-startup setup wizard
 * Story: Setup Wizard
 * Index:
 * - WizardState type (line 18)
 * - SetupWizard component (line 34)
 * - StepIndicator component (line 110)
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { CreateAdminStep } from './steps/CreateAdminStep';
import { ConfigureOllamaStep } from './steps/ConfigureOllamaStep';
import { ConfigureProvidersStep } from './steps/ConfigureProvidersStep';
import { ProvisionSenseiStep } from './steps/ProvisionSenseiStep';
import { ReviewStep } from './steps/ReviewStep';

/** Shared type for models registered during setup. */
export interface ConfiguredModel {
  provider: string;
  name: string;
  id: string;
}

export interface WizardState {
  adminUsername: string;
  ollamaConfigured: boolean;
  ollamaModels: ConfiguredModel[];
  cloudProviders: ConfiguredModel[];
  senseiModelId: string | null;
  senseiModelName: string | null;
}

const STEPS = [
  { label: 'Admin Account', number: 1 },
  { label: 'Ollama', number: 2 },
  { label: 'Cloud Providers', number: 3 },
  { label: 'Sensei AI', number: 4 },
  { label: 'Review', number: 5 },
] as const;

export function SetupWizard() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>({
    adminUsername: '',
    ollamaConfigured: false,
    ollamaModels: [],
    cloudProviders: [],
    senseiModelId: null,
    senseiModelName: null,
  });

  const handleAdminCreated = useCallback(async (username: string) => {
    setWizardState(prev => ({ ...prev, adminUsername: username }));
    await refresh();
    setCurrentStep(2);
  }, [refresh]);

  const handleOllamaComplete = useCallback((models: ConfiguredModel[]) => {
    setWizardState(prev => ({
      ...prev,
      ollamaConfigured: models.length > 0,
      ollamaModels: models,
    }));
    setCurrentStep(3);
  }, []);

  const handleProvidersComplete = useCallback((providers: ConfiguredModel[]) => {
    setWizardState(prev => ({ ...prev, cloudProviders: providers }));
    setCurrentStep(4);
  }, []);

  const handleSenseiComplete = useCallback((modelId: string | null, modelName: string | null) => {
    setWizardState(prev => ({ ...prev, senseiModelId: modelId, senseiModelName: modelName }));
    setCurrentStep(5);
  }, []);

  const handleFinish = useCallback(() => {
    router.replace('/');
  }, [router]);

  const allConfiguredModels = useMemo(
    () => [...wizardState.ollamaModels, ...wizardState.cloudProviders],
    [wizardState.ollamaModels, wizardState.cloudProviders]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            DojoLM Setup
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure your platform in a few steps
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step content */}
        <div className="mt-8">
          {currentStep === 1 && (
            <CreateAdminStep onComplete={handleAdminCreated} />
          )}
          {currentStep === 2 && (
            <ConfigureOllamaStep onComplete={handleOllamaComplete} />
          )}
          {currentStep === 3 && (
            <ConfigureProvidersStep onComplete={handleProvidersComplete} />
          )}
          {currentStep === 4 && (
            <ProvisionSenseiStep
              configuredModels={allConfiguredModels}
              onComplete={handleSenseiComplete}
            />
          )}
          {currentStep === 5 && (
            <ReviewStep state={wizardState} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const isActive = step.number === currentStep;
        const isComplete = step.number < currentStep;
        return (
          <div key={step.number} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div
                className={`h-px w-4 sm:w-8 ${
                  isComplete ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? '\u2713' : step.number}
              </div>
              <span
                className={`hidden text-[10px] sm:block ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
