// SPDX-License-Identifier: Apache-2.0
/**
 * File: SetupWizard.tsx
 * Purpose: Main orchestrator for the first-startup setup wizard.
 *
 * Epic 6: restyled as a Ritual paper-scroll. The setup wizard sits
 * outside the (shell) layout, so <Scroll standalone> re-establishes
 * the design-system scope locally. Step indicator moves to
 * <RitualSteps>. Every step component (CreateAdminStep, etc.)
 * continues to render inside the scroll's body unchanged; form
 * state machines + API calls are untouched.
 *
 * E6.S3 / F-8-006: a new TelemetryConsentStep is inserted at index 5
 * (between Sensei and Review) so the operator must explicitly
 * acknowledge the build-channel telemetry-disclosure before the
 * wizard's terminal Review step. The /admin/* gate refuses
 * navigation until the ack is on file. When the wizard is
 * resumed mid-flow (admin already exists; ack pending) we
 * jump straight to the telemetry step via
 * `resumeAtTelemetryStep`.
 *
 * E9.S1 (2026-05-10) — wizard state (`currentStep`, `wizardState`,
 * and the in-progress admin form fields) is now mirrored to a
 * sessionStorage-backed draft via `useSetupWizardDraft`. An accidental
 * refresh during the admin step preserves the typed username / email /
 * display name. Secrets (passwords, provider API keys) are
 * deliberately NOT persisted — see `useSetupWizardDraft.ts` for the
 * security boundary. The draft is cleared on wizard completion.
 *
 * Index:
 * - WizardState type (line 28)
 * - SetupWizard component (line 50)
 */

"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Scroll, RitualSteps, type RitualStepItem } from "@/design";
import { CreateAdminStep } from "./steps/CreateAdminStep";
import { ConfigureOllamaStep } from "./steps/ConfigureOllamaStep";
import { ConfigureProvidersStep } from "./steps/ConfigureProvidersStep";
import { ProvisionSenseiStep } from "./steps/ProvisionSenseiStep";
import { TelemetryConsentStep } from "./steps/TelemetryConsentStep";
import { ReviewStep } from "./steps/ReviewStep";
import {
  useSetupWizardDraft,
  type SetupWizardAdminFormDraft,
} from "./useSetupWizardDraft";
import type { BuildChannel } from "@/lib/db/types";

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
  /** ISO-8601 ack timestamp from the server, null until the operator
   *  completes step 5 (TelemetryConsentStep). */
  telemetryAcknowledgedAt: string | null;
  /** Build channel that the operator was disclosed at ack time. */
  telemetryBuildChannel: BuildChannel | null;
}

export interface SetupWizardProps {
  /** Jump straight to the telemetry-consent step on mount. Used when the
   *  /admin/* gate redirects an authenticated admin back here because the
   *  ack is missing. */
  readonly resumeAtTelemetryStep?: boolean;
  /** Show the warn banner inside TelemetryConsentStep explaining that
   *  the operator landed back here from the /admin/* gate. */
  readonly showTelemetryConsentRequiredBanner?: boolean;
}

const STEP_META: readonly {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    id: "admin",
    label: "Admin account",
    description: "Create the first admin user for this deployment.",
  },
  {
    id: "ollama",
    label: "Local models",
    description: "Connect a local model runtime (optional).",
  },
  {
    id: "providers",
    label: "Cloud providers",
    description: "Register cloud provider credentials (optional).",
  },
  {
    id: "sensei",
    label: "Assistant model",
    description: "Powers Sensei, the dojo assistant.",
  },
  {
    id: "telemetry",
    label: "Telemetry consent",
    description: "Acknowledge what telemetry collects and where it goes.",
  },
  {
    id: "review",
    label: "Review",
    description: "Confirm the configuration before finishing.",
  },
] as const;

/**
 * 1-indexed slot for the TelemetryConsentStep. Kept as a named const so
 * the resume-flow can target it without a magic number, and the test
 * harness can assert against it.
 */
export const TELEMETRY_CONSENT_STEP_INDEX = 5;

export function SetupWizard({
  resumeAtTelemetryStep = false,
  showTelemetryConsentRequiredBanner = false,
}: SetupWizardProps = {}) {
  const router = useRouter();
  const { refresh } = useAuth();

  // E9.S1 — sessionStorage-backed draft. Returns initial empty draft on
  // SSR / first render; rehydrates from sessionStorage post-mount.
  const { draft, updateDraft, clearDraft } = useSetupWizardDraft();
  const { currentStep, wizardState, adminFormDraft } = draft;

  // Helper: bump the step pointer through the draft.
  const setCurrentStep = useCallback(
    (next: number) => {
      updateDraft({ currentStep: next });
    },
    [updateDraft],
  );

  // Helper: merge a wizardState patch through the draft.
  const patchWizardState = useCallback(
    (patch: Partial<WizardState>) => {
      updateDraft((prev) => ({
        ...prev,
        wizardState: { ...prev.wizardState, ...patch },
      }));
    },
    [updateDraft],
  );

  // Defensive: if `resumeAtTelemetryStep` flips post-mount (e.g. the
  // status fetch resolves after the initial render), realign the
  // step pointer. Without this, the wizard would freeze at step 1
  // when the resume flag arrives late.
  useEffect(() => {
    if (resumeAtTelemetryStep) {
      updateDraft((prev) =>
        prev.currentStep < TELEMETRY_CONSENT_STEP_INDEX
          ? { ...prev, currentStep: TELEMETRY_CONSENT_STEP_INDEX }
          : prev,
      );
    }
  }, [resumeAtTelemetryStep, updateDraft]);

  const handleAdminCreated = useCallback(
    async (username: string) => {
      patchWizardState({ adminUsername: username });
      await refresh();
      setCurrentStep(2);
    },
    [patchWizardState, refresh, setCurrentStep],
  );

  const handleOllamaComplete = useCallback(
    (models: ConfiguredModel[]) => {
      patchWizardState({
        ollamaConfigured: models.length > 0,
        ollamaModels: models,
      });
      setCurrentStep(3);
    },
    [patchWizardState, setCurrentStep],
  );

  const handleProvidersComplete = useCallback(
    (providers: ConfiguredModel[]) => {
      patchWizardState({ cloudProviders: providers });
      setCurrentStep(4);
    },
    [patchWizardState, setCurrentStep],
  );

  const handleSenseiComplete = useCallback(
    (modelId: string | null, modelName: string | null) => {
      patchWizardState({ senseiModelId: modelId, senseiModelName: modelName });
      setCurrentStep(TELEMETRY_CONSENT_STEP_INDEX);
    },
    [patchWizardState, setCurrentStep],
  );

  const handleTelemetryAck = useCallback(
    (ackAt: string, channel: BuildChannel) => {
      patchWizardState({
        telemetryAcknowledgedAt: ackAt,
        telemetryBuildChannel: channel,
      });
      setCurrentStep(TELEMETRY_CONSENT_STEP_INDEX + 1);
    },
    [patchWizardState, setCurrentStep],
  );

  // E9.S1 — admin-form non-secret field changes flow through the
  // draft so a refresh mid-typing preserves the typed text.
  // `password` / `confirmPassword` are NOT routed through here.
  const handleAdminFieldChange = useCallback(
    (field: keyof SetupWizardAdminFormDraft, value: string) => {
      updateDraft((prev) => ({
        ...prev,
        adminFormDraft: { ...prev.adminFormDraft, [field]: value },
      }));
    },
    [updateDraft],
  );

  const handleFinish = useCallback(() => {
    // E9.S1 — wizard finished successfully; the draft has fulfilled
    // its purpose. Clear the sessionStorage entry so a subsequent
    // visit to /setup (e.g. operator hits the URL after configuring
    // a fresh deployment) does not pre-fill stale form state.
    clearDraft();
    router.replace("/");
  }, [clearDraft, router]);

  const allConfiguredModels = useMemo(
    () => [...wizardState.ollamaModels, ...wizardState.cloudProviders],
    [wizardState.ollamaModels, wizardState.cloudProviders],
  );

  const stepItems: readonly RitualStepItem[] = STEP_META.map((meta, i) => {
    const n = i + 1;
    const state: RitualStepItem["state"] =
      n < currentStep ? "done" : n === currentStep ? "active" : "pending";
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      state,
    };
  });

  return (
    <Scroll
      standalone
      titleLevel={1}
      ariaLabel="DojoLM first-boot wizard"
      eyebrow="First boot · setup"
      title="DojoLM setup"
      lede="Six steps, each reversible until you finish. Skipped steps can be completed any time from Admin."
    >
      <RitualSteps items={stepItems} ariaLabel="Setup steps" />
      <div className="setup-step-current mt-8" data-testid="setup-step-current">
        {currentStep === 1 && (
          <CreateAdminStep
            onComplete={handleAdminCreated}
            username={adminFormDraft.username}
            email={adminFormDraft.email}
            displayName={adminFormDraft.displayName}
            onFieldChange={handleAdminFieldChange}
          />
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
        {currentStep === TELEMETRY_CONSENT_STEP_INDEX && (
          <TelemetryConsentStep
            onComplete={handleTelemetryAck}
            showAdminGateBanner={showTelemetryConsentRequiredBanner}
          />
        )}
        {currentStep === TELEMETRY_CONSENT_STEP_INDEX + 1 && (
          <ReviewStep state={wizardState} onFinish={handleFinish} />
        )}
      </div>
    </Scroll>
  );
}
