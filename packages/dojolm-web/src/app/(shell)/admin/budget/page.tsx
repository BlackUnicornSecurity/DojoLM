// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/budget — multi-scope LLM spend caps.
 *
 * Three scopes, one ledger:
 *   - App-wide ceiling (single cap; blank = uncapped).
 *   - Per-model caps (some models capped, the rest uncapped).
 *
 * Reads/writes `/api/admin/budget`. Model picker is populated from
 * `/api/llm/models?enabled=true`. POST/DELETE carry the CSRF token.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CommandHero } from '@/design/command/CommandHero';
import { Panel } from '@/design/shell/Panel';
import { readCsrfToken } from '@/lib/csrf-cookie';

interface ScopeSnapshot {
  readonly scope: { readonly kind: string; readonly id: string };
  readonly capCredits: number;
  readonly spentCredits: number;
  readonly remainingCredits: number;
}
interface BudgetResponse {
  readonly app: ScopeSnapshot | null;
  readonly models: readonly ScopeSnapshot[];
}
interface EnabledModel {
  readonly id: string;
  readonly name?: string;
  readonly provider?: string;
}

async function mutate(method: 'POST' | 'DELETE', body: unknown): Promise<boolean> {
  const csrf = readCsrfToken();
  const res = await fetch('/api/admin/budget', {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default function BudgetAdminPage() {
  const [app, setApp] = useState<ScopeSnapshot | null>(null);
  const [models, setModels] = useState<readonly ScopeSnapshot[]>([]);
  const [enabledModels, setEnabledModels] = useState<readonly EnabledModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [appCap, setAppCap] = useState('');
  const [pickModel, setPickModel] = useState('');
  const [modelCap, setModelCap] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, modelsRes] = await Promise.all([
        fetch('/api/admin/budget', { cache: 'no-store' }),
        fetch('/api/llm/models?enabled=true', { cache: 'no-store' }),
      ]);
      if (!budgetRes.ok) {
        setError('Budget unavailable');
        return;
      }
      const body = (await budgetRes.json()) as BudgetResponse;
      setApp(body.app);
      setModels(body.models);
      setAppCap(body.app ? String(body.app.capCredits) : '');
      const list = modelsRes.ok ? await modelsRes.json().catch(() => []) : [];
      if (Array.isArray(list)) {
        setEnabledModels(
          list.filter(
            (m: unknown): m is EnabledModel =>
              typeof m === 'object' && m !== null && typeof (m as EnabledModel).id === 'string',
          ),
        );
      }
      setError(null);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<boolean>) {
    setBusy(true);
    setError(null);
    try {
      const ok = await fn();
      if (!ok) setError('Update failed');
      else await load();
    } finally {
      setBusy(false);
    }
  }

  function saveApp() {
    const n = Number.parseInt(appCap, 10);
    if (!Number.isInteger(n) || n < 0) {
      setError('App cap must be a non-negative integer');
      return;
    }
    void run(() => mutate('POST', { kind: 'app', capCredits: n }));
  }
  function clearApp() {
    void run(() => mutate('DELETE', { kind: 'app' }));
  }
  function saveModel() {
    const n = Number.parseInt(modelCap, 10);
    if (!pickModel) {
      setError('Choose a model');
      return;
    }
    if (!Number.isInteger(n) || n < 0) {
      setError('Model cap must be a non-negative integer');
      return;
    }
    void run(() => mutate('POST', { kind: 'model', id: pickModel, capCredits: n }));
  }

  return (
    <>
      <CommandHero
        tint="steel"
        watermark="予"
        vertical="予算 · BUDGET"
        eyebrow="Admin · spend caps"
        title={<>Multi-scope <em>spend budgets</em></>}
        lede="Cap LLM spend per model, leave others uncapped, and set one application-wide ceiling. A call is denied if any applicable cap — model or app-wide — would be exceeded."
      />

      {error ? (
        <p className="mono" data-testid="budget-error" style={{ color: 'var(--danger, #c0392b)', fontSize: 12 }}>
          {error}
        </p>
      ) : null}

      <div className="grid">
        <div style={{ gridColumn: 'span 5' }}>
          <Panel
            title="Application-wide ceiling"
            sub={loading ? 'Loading…' : app ? `${app.remainingCredits} of ${app.capCredits} remaining` : 'Uncapped'}
            meta={
              <span className="chip steel">
                <span className="dot" />
                {app ? 'CAPPED' : 'UNCAPPED'}
              </span>
            }
          >
            <label htmlFor="app-cap" className="mono" style={{ display: 'block', fontSize: 11, letterSpacing: '0.18em', color: 'var(--fg-mute)', marginBottom: 8 }}>
              Credits (blank / clear = uncapped)
            </label>
            <input
              id="app-cap"
              type="number"
              min={0}
              value={appCap}
              disabled={loading || busy}
              onChange={(e) => setAppCap(e.target.value)}
              data-testid="budget-app-cap"
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" disabled={loading || busy || !app} data-testid="budget-app-clear" onClick={clearApp}>
                Clear
              </button>
              <button type="button" className="btn btn-primary" disabled={loading || busy} data-testid="budget-app-save" onClick={saveApp}>
                Save ceiling
              </button>
            </div>
          </Panel>
        </div>

        <div style={{ gridColumn: 'span 7' }}>
          <Panel title="Per-model cap" sub="Set a cap for a model. Models with no cap are uncapped.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label htmlFor="model-pick" className="mono" style={{ display: 'block', fontSize: 11, letterSpacing: '0.18em', color: 'var(--fg-mute)', marginBottom: 8 }}>
                  Model
                </label>
                <select id="model-pick" value={pickModel} disabled={loading || busy} onChange={(e) => setPickModel(e.target.value)} data-testid="budget-model-pick" style={{ width: '100%' }}>
                  <option value="">Select a model…</option>
                  {enabledModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ? `${m.name} (${m.id})` : m.id}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '0 1 140px' }}>
                <label htmlFor="model-cap" className="mono" style={{ display: 'block', fontSize: 11, letterSpacing: '0.18em', color: 'var(--fg-mute)', marginBottom: 8 }}>
                  Credits
                </label>
                <input id="model-cap" type="number" min={0} value={modelCap} disabled={loading || busy} onChange={(e) => setModelCap(e.target.value)} data-testid="budget-model-cap" style={{ width: '100%' }} />
              </div>
              <button type="button" className="btn btn-primary" disabled={loading || busy} data-testid="budget-model-save" onClick={saveModel}>
                Set cap
              </button>
            </div>

            <table className="mono" style={{ width: '100%', marginTop: 16, fontSize: 12, borderCollapse: 'collapse' }} data-testid="budget-model-table">
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-mute)' }}>
                  <th style={{ padding: '4px 6px' }}>Model</th>
                  <th style={{ padding: '4px 6px' }}>Cap</th>
                  <th style={{ padding: '4px 6px' }}>Spent</th>
                  <th style={{ padding: '4px 6px' }}>Remaining</th>
                  <th style={{ padding: '4px 6px' }} />
                </tr>
              </thead>
              <tbody>
                {models.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '8px 6px', color: 'var(--fg-mute)' }}>
                      {loading ? 'Loading…' : 'No model caps — all models uncapped.'}
                    </td>
                  </tr>
                ) : (
                  models.map((m) => (
                    <tr key={m.scope.id} style={{ borderTop: '1px solid var(--b-1)' }}>
                      <td style={{ padding: '6px' }}>{m.scope.id}</td>
                      <td style={{ padding: '6px' }}>{m.capCredits}</td>
                      <td style={{ padding: '6px' }}>{m.spentCredits}</td>
                      <td style={{ padding: '6px' }}>{m.remainingCredits}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          data-testid={`budget-model-clear-${m.scope.id}`}
                          onClick={() => void run(() => mutate('DELETE', { kind: 'model', id: m.scope.id }))}
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </>
  );
}
