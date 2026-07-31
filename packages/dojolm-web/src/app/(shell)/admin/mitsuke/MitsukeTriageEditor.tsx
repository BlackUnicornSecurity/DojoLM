// SPDX-License-Identifier: Apache-2.0
/**
 * MitsukeTriageEditor — T8.1 / #354. Modal-style drawer for editing or
 * authoring a Mitsuke triage template, plus the closed-set Edit button
 * surfaced inside `<TriageTab>` per template card.
 *
 * Three modes:
 *   - 'edit-bundled' — patch the editable subset of a bundled default
 *     (severity / steps / expectedOutcome / tags). The template id +
 *     name + description + triggerTypes remain immutable for THIS
 *     mode because the server side `sanitizePatch` only accepts those
 *     four fields; widening the patch surface is a follow-up ticket.
 *   - 'edit-authored' — patches the same four fields on a previously
 *     operator-authored template. name / description / triggerTypes
 *     are display-only post-creation. Re-create + delete is the
 *     supported workflow if those fields need to change.
 *   - 'create' — full form for a brand-new authored template; server
 *     synthesizes the id and accepts the full body shape (including
 *     name / description / triggerTypes) via POST.
 *
 * R-T1: closed `ERROR_COPY` map mirrors KagamiClient/KotobaClient. Never
 * echoes server-derived strings.
 */

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Drawer } from '@/design/codex/Drawer';
import { readCsrfToken } from '@/lib/csrf-cookie';
import {
  INDICATOR_TYPES,
  INDICATOR_TYPE_LABEL,
  SEVERITIES,
  SEVERITY_LABEL,
  type IndicatorType,
  type MitsukeSeverity,
  type TriageTemplate,
} from './MitsukeTabs';

// ---------------------------------------------------------------------------
// Closed-error-copy map (R-T1)
// ---------------------------------------------------------------------------

type EditorErrorCode =
  | 'forbidden'
  | 'invalid-input'
  | 'conflict'
  | 'network'
  | 'server';

const ERROR_COPY: Record<EditorErrorCode, string> = {
  forbidden: 'Admin role required to edit triage templates.',
  'invalid-input': 'One or more fields are invalid. Check the values and retry.',
  conflict: 'Quota reached. Delete an authored template before adding another.',
  network: 'Network error. Try again.',
  server: 'Server error. Try again in a moment.',
};

// ---------------------------------------------------------------------------
// Editable-step contract
// ---------------------------------------------------------------------------

interface EditableStep {
  readonly id: string;
  readonly title: string;
  readonly instruction: string;
}

const MAX_STEPS = 8;
const STEP_TITLE_MAX = 80;
const STEP_INSTRUCTION_MAX = 280;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 400;
const EXPECTED_OUTCOME_MAX = 400;
const TAGS_MAX = 8;
const TAG_LEN_MAX = 32;

let stepIdCounter = 0;
function nextStepId(): string {
  stepIdCounter += 1;
  return `s-${stepIdCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Editor mode + props
// ---------------------------------------------------------------------------

export type EditorMode = 'edit-bundled' | 'edit-authored' | 'create';

export interface TriageEditorTarget {
  readonly mode: EditorMode;
  readonly template: TriageTemplate;
}

interface TriageEditDrawerProps {
  readonly open: boolean;
  readonly target: TriageEditorTarget | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

interface SavePayload {
  readonly mode: EditorMode;
  readonly id?: string;
  readonly body: Record<string, unknown>;
}

function deriveSavePayload(
  mode: EditorMode,
  template: TriageTemplate,
  draft: DraftState,
): SavePayload {
  const stepBodies = draft.steps.map((s, idx) => ({
    order: idx + 1,
    title: s.title.trim(),
    instruction: s.instruction.trim(),
  }));
  const tagBodies = draft.tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, TAGS_MAX);

  if (mode === 'create') {
    return {
      mode,
      body: {
        name: draft.name.trim(),
        description: draft.description.trim(),
        severity: draft.severity,
        triggerTypes: draft.triggerTypes,
        steps: stepBodies,
        expectedOutcome: draft.expectedOutcome.trim(),
        tags: tagBodies,
      },
    };
  }

  // edit-bundled and edit-authored share the same PATCH-body shape —
  // the server's `sanitizePatch` only accepts severity / steps /
  // expectedOutcome / tags regardless of whether the id is bundled or
  // authored.
  return {
    mode,
    id: template.id,
    body: {
      severity: draft.severity,
      steps: stepBodies,
      expectedOutcome: draft.expectedOutcome.trim(),
      tags: tagBodies,
    },
  };
}

interface DraftState {
  readonly name: string;
  readonly description: string;
  readonly severity: MitsukeSeverity;
  readonly triggerTypes: readonly IndicatorType[];
  readonly steps: readonly EditableStep[];
  readonly expectedOutcome: string;
  readonly tags: string;
}

function emptyDraft(): DraftState {
  return {
    name: '',
    description: '',
    severity: 'MEDIUM',
    triggerTypes: [],
    steps: [{ id: nextStepId(), title: '', instruction: '' }],
    expectedOutcome: '',
    tags: '',
  };
}

function templateToDraft(template: TriageTemplate): DraftState {
  return {
    name: template.name,
    description: template.description,
    severity: template.severity,
    triggerTypes: template.triggerTypes,
    // YR.19 sanitizer dropped per-step shape so we hydrate from full
    // template steps if available; if not, prefill a single blank step.
    steps:
      template.steps && template.steps.length > 0
        ? template.steps.map((s) => ({
            id: nextStepId(),
            title: s.title,
            instruction: s.instruction,
          }))
        : [{ id: nextStepId(), title: '', instruction: '' }],
    expectedOutcome: template.expectedOutcome ?? '',
    tags: (template.tags ?? []).join(', '),
  };
}

function mapHttpToErrorCode(status: number): EditorErrorCode {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 400) return 'invalid-input';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'network';
}

// ---------------------------------------------------------------------------
// TriageEditDrawer
// ---------------------------------------------------------------------------

export function TriageEditDrawer({
  open,
  target,
  onClose,
  onSaved,
}: TriageEditDrawerProps): ReactElement {
  const [draft, setDraft] = useState<DraftState>(() => emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<EditorErrorCode | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Hydrate the draft when the target changes (drawer opens / target swaps).
  useEffect(() => {
    if (!open) return;
    setErrorCode(null);
    if (target === null || target.mode === 'create') {
      setDraft(emptyDraft());
    } else {
      setDraft(templateToDraft(target.template));
    }
  }, [open, target]);

  const mode: EditorMode = target?.mode ?? 'create';
  const template = target?.template ?? null;

  // Validation runs locally so the Save button reflects the closed-shape
  // validity before the server speaks. The server is still the source of
  // truth on rejection (we map its 400 to 'invalid-input').
  const validity = useMemo(() => {
    if (mode === 'create') {
      if (!draft.name.trim()) return 'name';
      if (!draft.description.trim()) return 'description';
      if (draft.triggerTypes.length === 0) return 'triggerTypes';
    }
    if (draft.steps.length === 0) return 'steps';
    for (const step of draft.steps) {
      if (!step.title.trim()) return 'steps';
      if (!step.instruction.trim()) return 'steps';
    }
    if (!draft.expectedOutcome.trim()) return 'expectedOutcome';
    return 'ok';
  }, [draft, mode]);

  const isValid = validity === 'ok';

  const updateStep = useCallback((id: string, patch: Partial<EditableStep>) => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const addStep = useCallback(() => {
    setDraft((prev) => {
      if (prev.steps.length >= MAX_STEPS) return prev;
      return {
        ...prev,
        steps: [...prev.steps, { id: nextStepId(), title: '', instruction: '' }],
      };
    });
  }, []);

  const removeStep = useCallback((id: string) => {
    setDraft((prev) => {
      if (prev.steps.length <= 1) return prev;
      return { ...prev, steps: prev.steps.filter((s) => s.id !== id) };
    });
  }, []);

  const toggleTriggerType = useCallback((t: IndicatorType) => {
    setDraft((prev) => {
      const set = new Set(prev.triggerTypes);
      if (set.has(t)) set.delete(t);
      else set.add(t);
      return { ...prev, triggerTypes: Array.from(set) };
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!isValid) {
      setErrorCode('invalid-input');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setErrorCode(null);
    try {
      const tmpl = template ?? {
        id: '',
        name: '',
        description: '',
        severity: 'MEDIUM' as MitsukeSeverity,
        triggerTypes: [],
        steps: [],
        expectedOutcome: '',
        tags: [],
      };
      const payload = deriveSavePayload(mode, tmpl, draft);
      const csrf = readCsrfToken();
      const url =
        payload.mode === 'create'
          ? '/api/mitsuke/triage-templates'
          : `/api/mitsuke/triage-templates/${encodeURIComponent(payload.id ?? '')}`;
      const method = payload.mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify(payload.body),
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        setErrorCode(mapHttpToErrorCode(res.status));
        return;
      }
      onSaved();
      onClose();
    } catch {
      if (mountedRef.current) setErrorCode('network');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [draft, isValid, mode, onClose, onSaved, template]);

  const drawerTitle =
    mode === 'create'
      ? 'Author triage template'
      : `Edit · ${template?.name ?? 'template'}`;
  const drawerSub =
    mode === 'create'
      ? 'New operator-authored template — saved to your per-user override store.'
      : mode === 'edit-bundled'
      ? 'Patches the bundled default for your view only. Other operators still see the original.'
      : 'Editing your authored template.';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      sub={drawerSub}
      closeLabel="Close editor"
    >
      <div
        data-testid="mitsuke-triage-editor"
        style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {mode === 'create' && (
          <>
            <label className="wb-field">
              <span className="wb-hint" style={{ fontSize: 11 }}>Name</span>
              <input
                data-testid="mitsuke-triage-editor-name"
                className="wb-input"
                type="text"
                maxLength={NAME_MAX}
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                aria-required="true"
                autoComplete="off"
              />
            </label>
            <label className="wb-field">
              <span className="wb-hint" style={{ fontSize: 11 }}>Description</span>
              {/* E7.S12 / E9.S10 (retires F-4-032 P3) — long-text fields get
                  lang="en" + spellcheck="true" defaults. WCAG SC 1.3.5
                  Identify Input Purpose + SC 1.4.12 Text Spacing — declaring
                  the field's language lets AT pronounce operator-entered
                  text correctly when read aloud, and spellcheck="true"
                  surfaces typos that would otherwise survive the round-trip
                  to the audit log. The defaults apply to the description,
                  instruction, and expected-outcome fields — short
                  operator-text fields where natural-language entry is
                  expected. Code/payload textareas elsewhere (e.g.
                  /admin/shingan skill content) intentionally do NOT inherit
                  this default because spellcheck on YAML/JSON noise is
                  user-hostile. */}
              <textarea
                data-testid="mitsuke-triage-editor-description"
                className="wb-input"
                rows={2}
                maxLength={DESCRIPTION_MAX}
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                aria-required="true"
                lang="en"
                spellCheck="true"
              />
            </label>
            <fieldset
              data-testid="mitsuke-triage-editor-trigger-types"
              style={{ border: 'none', padding: 0, margin: 0 }}
            >
              <legend className="wb-hint" style={{ fontSize: 11 }}>Trigger types</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {INDICATOR_TYPES.map((t) => {
                  const checked = draft.triggerTypes.includes(t);
                  return (
                    <label
                      key={t}
                      className={`chip ${checked ? 'gold' : 'steel'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTriggerType(t)}
                        data-testid={`mitsuke-triage-editor-trigger-${t}`}
                        style={{ marginRight: 4 }}
                      />
                      {INDICATOR_TYPE_LABEL[t]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        <label className="wb-field">
          <span className="wb-hint" style={{ fontSize: 11 }}>Severity</span>
          <select
            data-testid="mitsuke-triage-editor-severity"
            className="wb-input"
            value={draft.severity}
            onChange={(e) => {
              const v = e.target.value as MitsukeSeverity;
              if (SEVERITIES.includes(v)) {
                setDraft((p) => ({ ...p, severity: v }));
              }
            }}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
            ))}
          </select>
        </label>

        <fieldset
          data-testid="mitsuke-triage-editor-steps"
          style={{ border: '1px solid var(--b-1, #2a2a2a)', borderRadius: 6, padding: 8 }}
        >
          <legend className="wb-hint" style={{ fontSize: 11, padding: '0 4px' }}>
            Steps ({draft.steps.length}/{MAX_STEPS})
          </legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {draft.steps.map((step, idx) => (
              <div
                key={step.id}
                data-testid={`mitsuke-triage-editor-step-${idx}`}
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: 6, alignItems: 'start' }}
              >
                <span className="wb-hint" style={{ fontSize: 11, paddingTop: 6 }}>{idx + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input
                    aria-label={`Step ${idx + 1} title`}
                    data-testid={`mitsuke-triage-editor-step-${idx}-title`}
                    className="wb-input"
                    type="text"
                    placeholder="Title"
                    maxLength={STEP_TITLE_MAX}
                    value={step.title}
                    onChange={(e) => updateStep(step.id, { title: e.target.value })}
                    autoComplete="off"
                  />
                  <textarea
                    aria-label={`Step ${idx + 1} instruction`}
                    data-testid={`mitsuke-triage-editor-step-${idx}-instruction`}
                    className="wb-input"
                    rows={2}
                    placeholder="Instruction"
                    maxLength={STEP_INSTRUCTION_MAX}
                    value={step.instruction}
                    onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                    lang="en"
                    spellCheck="true"
                  />
                </div>
                <button
                  type="button"
                  className="wb-btn"
                  data-testid={`mitsuke-triage-editor-step-${idx}-remove`}
                  onClick={() => removeStep(step.id)}
                  disabled={draft.steps.length <= 1}
                  aria-label={`Remove step ${idx + 1}`}
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              className="wb-btn"
              data-testid="mitsuke-triage-editor-add-step"
              onClick={addStep}
              disabled={draft.steps.length >= MAX_STEPS}
            >
              + Add step
            </button>
          </div>
        </fieldset>

        <label className="wb-field">
          <span className="wb-hint" style={{ fontSize: 11 }}>Expected outcome</span>
          <textarea
            data-testid="mitsuke-triage-editor-expected-outcome"
            className="wb-input"
            rows={2}
            maxLength={EXPECTED_OUTCOME_MAX}
            value={draft.expectedOutcome}
            onChange={(e) => setDraft((p) => ({ ...p, expectedOutcome: e.target.value }))}
            aria-required="true"
            lang="en"
            spellCheck="true"
          />
        </label>

        <label className="wb-field">
          <span className="wb-hint" style={{ fontSize: 11 }}>
            Tags (comma-separated, max {TAGS_MAX} × {TAG_LEN_MAX} chars)
          </span>
          <input
            data-testid="mitsuke-triage-editor-tags"
            className="wb-input"
            type="text"
            value={draft.tags}
            onChange={(e) => setDraft((p) => ({ ...p, tags: e.target.value }))}
            autoComplete="off"
          />
        </label>

        {errorCode !== null && (
          <div
            role="alert"
            data-testid="mitsuke-triage-editor-error"
            className="yr4-banner tone-red"
          >
            {ERROR_COPY[errorCode]}
          </div>
        )}

        <div className="yr4-button-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {/* Wave 3hh — F-6-016 (P2) retire. "Discard template
              changes" names the abandoned operation (the in-progress
              triage-template edits). data-testid stays the same so
              existing selectors keep working. */}
          <button
            type="button"
            className="wb-btn"
            data-testid="mitsuke-triage-editor-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Discard template changes
          </button>
          <button
            type="button"
            className="wb-btn primary"
            data-testid="mitsuke-triage-editor-save"
            onClick={onSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? 'Saving template…' : 'Save template'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
