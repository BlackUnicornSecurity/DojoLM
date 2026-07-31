// SPDX-License-Identifier: Apache-2.0
/**
 * File: registry.ts
 * Purpose: Minimal Prometheus-compatible metrics registry for Wave 6
 *          METRICS-PROMETHEUS / ADR-0051.
 *
 * Intentionally tiny — the goal is an in-process scrape surface that
 * makes the operational blind spot audible without dragging in
 * `prom-client` or similar. Three primitive types:
 *   - Counter      — monotonic, increments only.
 *   - Gauge        — set / inc / dec.
 *   - Histogram    — bucketed observations with `_sum` and `_count`.
 *
 * Labels are low-cardinality: feature, outcome, source. No per-user
 * or per-request labels (label explosion is the fastest way to make
 * a metrics endpoint expensive).
 *
 * Exposition format matches the Prometheus text format (see
 * https://prometheus.io/docs/instrumenting/exposition_formats/).
 * Consumers scrape at `/api/metrics`.
 */

type LabelRecord = Readonly<Record<string, string>>

function labelsKey(labels: LabelRecord): string {
  const keys = Object.keys(labels).sort()
  if (keys.length === 0) return ''
  return keys.map((k) => `${k}=${labels[k]}`).join(',')
}

function formatLabels(labels: LabelRecord): string {
  const keys = Object.keys(labels).sort()
  if (keys.length === 0) return ''
  const inner = keys.map((k) => `${k}="${escapeLabelValue(labels[k])}"`).join(',')
  return `{${inner}}`
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
}

export class Counter {
  private readonly values = new Map<string, { labels: LabelRecord; value: number }>()

  constructor(
    public readonly name: string,
    public readonly help: string,
  ) {}

  inc(labels: LabelRecord = {}, delta = 1): void {
    if (!Number.isFinite(delta) || delta < 0) return
    const key = labelsKey(labels)
    const current = this.values.get(key)
    if (current === undefined) {
      this.values.set(key, { labels, value: delta })
    } else {
      this.values.set(key, { labels: current.labels, value: current.value + delta })
    }
  }

  value(labels: LabelRecord = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0
  }

  reset(): void {
    this.values.clear()
  }

  toExposition(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ]
    if (this.values.size === 0) {
      lines.push(`${this.name} 0`)
    } else {
      for (const { labels, value } of this.values.values()) {
        lines.push(`${this.name}${formatLabels(labels)} ${value}`)
      }
    }
    return lines.join('\n')
  }
}

export class Gauge {
  private readonly values = new Map<string, { labels: LabelRecord; value: number }>()

  constructor(
    public readonly name: string,
    public readonly help: string,
  ) {}

  set(value: number, labels: LabelRecord = {}): void {
    if (!Number.isFinite(value)) return
    this.values.set(labelsKey(labels), { labels, value })
  }

  inc(labels: LabelRecord = {}, delta = 1): void {
    if (!Number.isFinite(delta)) return
    const key = labelsKey(labels)
    const current = this.values.get(key)
    if (current === undefined) this.values.set(key, { labels, value: delta })
    else this.values.set(key, { labels: current.labels, value: current.value + delta })
  }

  dec(labels: LabelRecord = {}, delta = 1): void {
    this.inc(labels, -delta)
  }

  value(labels: LabelRecord = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0
  }

  reset(): void {
    this.values.clear()
  }

  toExposition(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} gauge`,
    ]
    if (this.values.size === 0) {
      lines.push(`${this.name} 0`)
    } else {
      for (const { labels, value } of this.values.values()) {
        lines.push(`${this.name}${formatLabels(labels)} ${value}`)
      }
    }
    return lines.join('\n')
  }
}

interface HistogramState {
  labels: LabelRecord
  counts: number[]
  sum: number
  count: number
}

export class Histogram {
  private readonly series = new Map<string, HistogramState>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly buckets: readonly number[],
  ) {
    if (buckets.length === 0) throw new Error('Histogram requires at least one bucket')
    for (let i = 1; i < buckets.length; i += 1) {
      if (buckets[i] <= buckets[i - 1]) {
        throw new Error('Histogram buckets must be strictly ascending')
      }
    }
  }

  observe(value: number, labels: LabelRecord = {}): void {
    if (!Number.isFinite(value) || value < 0) return
    const key = labelsKey(labels)
    let state = this.series.get(key)
    if (state === undefined) {
      state = { labels, counts: this.buckets.map(() => 0), sum: 0, count: 0 }
      this.series.set(key, state)
    }
    state.sum += value
    state.count += 1
    for (let i = 0; i < this.buckets.length; i += 1) {
      if (value <= this.buckets[i]) state.counts[i] += 1
    }
  }

  reset(): void {
    this.series.clear()
  }

  toExposition(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} histogram`,
    ]
    if (this.series.size === 0) {
      lines.push(`${this.name}_sum 0`)
      lines.push(`${this.name}_count 0`)
      return lines.join('\n')
    }
    for (const state of this.series.values()) {
      for (let i = 0; i < this.buckets.length; i += 1) {
        const labels = { ...state.labels, le: String(this.buckets[i]) }
        lines.push(`${this.name}_bucket${formatLabels(labels)} ${state.counts[i]}`)
      }
      // +Inf bucket (count)
      const infLabels = { ...state.labels, le: '+Inf' }
      lines.push(`${this.name}_bucket${formatLabels(infLabels)} ${state.count}`)
      lines.push(`${this.name}_sum${formatLabels(state.labels)} ${state.sum}`)
      lines.push(`${this.name}_count${formatLabels(state.labels)} ${state.count}`)
    }
    return lines.join('\n')
  }
}

// ---------------------------------------------------------------------------
// Module-scoped registry. Instrumented sites import these directly.
// ---------------------------------------------------------------------------

export const llmCallsTotal = new Counter(
  'dojolm_llm_calls_total',
  'Total LLM calls per feature and outcome (success / filtered / error).',
)

export const llmBudgetRejectionsTotal = new Counter(
  'dojolm_llm_budget_rejections_total',
  'Total LLM calls rejected because the per-minute budget was saturated.',
)

export const intelPollLatencySeconds = new Histogram(
  'dojolm_intel_poll_latency_seconds',
  'Ronin intel poll cycle duration in seconds, per source.',
  [0.1, 0.5, 1, 2, 5, 10, 30, 60],
)

export const intelPollTotal = new Counter(
  'dojolm_intel_poll_total',
  'Total Ronin intel poll cycles, per outcome (success / partial / failed).',
)

export const fsLockContentionsTotal = new Counter(
  'dojolm_fs_lock_contentions_total',
  'Total filesystem user-lock contentions (another holder present).',
)

export const sengokuRunDurationSeconds = new Histogram(
  'dojolm_sengoku_run_duration_seconds',
  'Sengoku Temporal run wall-clock duration in seconds, per executor path.',
  [0.5, 1, 5, 10, 30, 60, 120, 300, 600, 1200],
)

export const sengokuRunsTotal = new Counter(
  'dojolm_sengoku_runs_total',
  'Total Sengoku Temporal runs, per executor path and verdict.',
)

export const idorProbesTotal = new Counter(
  'dojolm_idor_probes_total',
  'Total IDOR_PROBE audit events emitted, per namespace and foundElsewhere outcome.',
)

/** Ordered export; keeps scrape output deterministic across calls. */
export const REGISTRY: ReadonlyArray<Counter | Gauge | Histogram> = [
  llmCallsTotal,
  llmBudgetRejectionsTotal,
  intelPollTotal,
  intelPollLatencySeconds,
  sengokuRunsTotal,
  sengokuRunDurationSeconds,
  fsLockContentionsTotal,
  idorProbesTotal,
]

export function renderMetrics(): string {
  return REGISTRY.map((m) => m.toExposition()).join('\n') + '\n'
}

/**
 * Test helper: reset every metric in the module-scoped registry.
 * Production code does not call this — metrics are process-lifetime.
 */
export function resetAllMetricsForTests(): void {
  for (const m of REGISTRY) m.reset()
}
