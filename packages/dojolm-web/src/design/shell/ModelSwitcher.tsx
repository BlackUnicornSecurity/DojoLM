// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * Active Model Switcher (Story D) — top-bar dropdown that lets any
 * authenticated user select the default target model. Writes through
 * the activeModelStore -> noda-active-model cookie path; the server
 * reads the cookie via the resolver chain (Story B).
 *
 * Per locked decisions:
 *   - NO $/token column anywhere
 *   - Metrics fetched on dropdown open + 5min SWR background refresh
 *   - Active model = TARGET slot only (orchestrator attacker/judge
 *     and kagami pair-B keep their own pickers)
 *
 * The trigger is the persistent control on the top-bar; the open
 * popover renders one row per enabled model with a per-row health
 * dot, tier pill, and metadata strip.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveModel } from "@/lib/stores/active-model-context";

interface ModelRow {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly tier?: string;
  readonly maxTokens?: number;
  readonly enabled?: boolean;
}

interface MetricRow {
  readonly id: string;
  readonly healthStatus:
    | "available"
    | "unavailable"
    | "error"
    | "rate-limited"
    | "unknown";
  readonly latencyP50Ms: number | null;
  readonly testCount: number;
  readonly resilienceScore: number | null;
  readonly lastTestedAt: string | null;
}

const SWR_DEDUPE_MS = 5 * 60 * 1000;

interface FetchState {
  readonly models: readonly ModelRow[];
  readonly metrics: ReadonlyMap<string, MetricRow>;
  readonly fetchedAt: number;
  readonly loading: boolean;
}

const INITIAL_STATE: FetchState = {
  models: [],
  metrics: new Map(),
  fetchedAt: 0,
  loading: false,
};

async function fetchModelsAndMetrics(): Promise<{
  models: readonly ModelRow[];
  metrics: ReadonlyMap<string, MetricRow>;
}> {
  const [modelsRes, metricsRes] = await Promise.all([
    fetch("/api/llm/models?enabled=true", { cache: "no-store" }),
    fetch("/api/llm/models/metrics", { cache: "no-store" }),
  ]);
  const modelsBody = modelsRes.ok ? await modelsRes.json() : [];
  const metricsBody = metricsRes.ok
    ? ((await metricsRes.json()) as { metrics?: MetricRow[] })
    : { metrics: [] };

  const models: ModelRow[] = Array.isArray(modelsBody)
    ? modelsBody
        .filter(
          (m: unknown): m is ModelRow =>
            typeof m === "object" &&
            m !== null &&
            typeof (m as ModelRow).id === "string",
        )
        .map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          tier: m.tier,
          maxTokens: m.maxTokens,
          enabled: m.enabled,
        }))
    : [];

  const metricsMap = new Map<string, MetricRow>();
  for (const metric of metricsBody.metrics ?? []) {
    metricsMap.set(metric.id, metric);
  }

  return { models, metrics: metricsMap };
}

function HealthDot({
  status,
}: {
  status?: MetricRow["healthStatus"];
}): ReactNode {
  const color =
    status === "available"
      ? "#52d68b"
      : status === "rate-limited"
        ? "#f1c75e"
        : status === "unavailable" || status === "error"
          ? "#e7625e"
          : "#5a5e6b";
  return (
    <span
      data-testid="model-switcher-health-dot"
      data-health={status ?? "unknown"}
      aria-label={`health: ${status ?? "unknown"}`}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        marginRight: 8,
      }}
    />
  );
}

function formatLatency(p50: number | null): string {
  if (p50 === null) return "— p50";
  return `${p50}ms p50`;
}

function formatResilience(score: number | null): string {
  if (score === null) return "no tests yet";
  return `resilience ${score}/10`;
}

function formatContextWindow(maxTokens?: number): string | null {
  if (maxTokens === undefined || maxTokens === null) return null;
  if (maxTokens >= 1000) return `${Math.round(maxTokens / 1000)}k`;
  return `${maxTokens}`;
}

function isRowDisabled(
  model: ModelRow,
  metric: MetricRow | undefined,
): boolean {
  if (model.enabled === false) return true;
  if (metric && metric.healthStatus === "error") return true;
  return false;
}

export function ModelSwitcher() {
  const { activeModelId, setActiveModelId } = useActiveModel();
  const [state, setState] = useState<FetchState>(INITIAL_STATE);
  const [open, setOpen] = useState(false);

  // Refresh on dropdown open + 5min SWR.
  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    if (now - state.fetchedAt < SWR_DEDUPE_MS && state.models.length > 0) {
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetchModelsAndMetrics()
      .then(({ models, metrics }) => {
        if (cancelled) return;
        setState({
          models,
          metrics,
          fetchedAt: Date.now(),
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [open, state.fetchedAt, state.models.length]);

  const triggerLabel = useMemo(() => {
    // S7 — design shows `model-a` as the resting selector label, not an empty
    // "Select model" placeholder (model-a is the canonical default model).
    if (!activeModelId) return "model-a";
    const match = state.models.find((m) => m.id === activeModelId);
    return match?.name ?? activeModelId;
  }, [activeModelId, state.models]);

  return (
    <div
      className="model-switcher"
      data-testid="model-switcher"
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <Select
        value={activeModelId || undefined}
        onValueChange={(value) => setActiveModelId(value)}
        onOpenChange={setOpen}
      >
        <SelectTrigger
          className="model-switcher-trigger"
          data-testid="model-switcher-trigger"
          aria-label="Active model"
        >
          {/* S7 — `model-a` is the design's resting selector label (the
              canonical default), shown when no model id is active. */}
          <SelectValue placeholder="model-a">{triggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {state.loading && state.models.length === 0 ? (
            <div
              data-testid="model-switcher-loading"
              style={{ padding: 12, opacity: 0.6 }}
            >
              Loading models…
            </div>
          ) : state.models.length === 0 ? (
            <div
              data-testid="model-switcher-empty"
              style={{ padding: 12, opacity: 0.6 }}
            >
              No models available — configure one in Models
            </div>
          ) : (
            <>
              {state.models.map((model) => {
                const metric = state.metrics.get(model.id);
                const disabled = isRowDisabled(model, metric);
                const ctxLabel = formatContextWindow(model.maxTokens);
                return (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    disabled={disabled}
                    data-testid={`model-switcher-row-${model.id}`}
                    data-disabled={disabled ? "true" : undefined}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>
                        <HealthDot status={metric?.healthStatus} />
                        <strong>{model.name}</strong>
                        {model.tier && (
                          <span
                            className="chip"
                            data-testid={`model-switcher-tier-${model.id}`}
                            style={{ marginLeft: 6, fontSize: "0.75em" }}
                          >
                            {model.tier}
                          </span>
                        )}
                        {ctxLabel && (
                          <span
                            className="chip"
                            data-testid={`model-switcher-ctx-${model.id}`}
                            style={{ marginLeft: 6, fontSize: "0.75em" }}
                            title={`${model.maxTokens} tokens context window`}
                          >
                            {ctxLabel}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75em",
                          opacity: 0.7,
                          marginLeft: 16,
                        }}
                      >
                        {model.provider} ·{" "}
                        {formatLatency(metric?.latencyP50Ms ?? null)}
                        {" · "}
                        {metric?.testCount ?? 0} tests ·{" "}
                        {formatResilience(metric?.resilienceScore ?? null)}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
              <SelectSeparator />
              <div
                data-testid="model-switcher-footer"
                style={{ padding: "6px 12px", fontSize: 11, opacity: 0.7 }}
              >
                <Link
                  href="/admin/jutsu"
                  data-testid="model-switcher-manage-link"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  Manage models →
                </Link>
              </div>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
