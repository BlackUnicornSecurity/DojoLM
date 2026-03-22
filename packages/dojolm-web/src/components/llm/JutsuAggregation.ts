/**
 * File: JutsuAggregation.ts
 * Purpose: Aggregation logic for grouping LLM test results by model
 * Story: NODA-3 Story 11.3
 * Index:
 * - AggregatedModel interface (line 10)
 * - aggregateByModel() (line 36)
 * - calculateTrend() (line 86)
 */

/** Single test execution record */
export interface TestExecution {
  id: string
  modelId: string
  modelName: string
  provider: string
  score: number
  passRate: number
  totalTests: number
  passed: number
  failed: number
  categoriesFailed: string[]
  timestamp: string
  batchId?: string
}

/** Aggregated model data combining all executions */
export interface AggregatedModel {
  modelId: string
  modelName: string
  provider: string
  latestScore: number
  avgScore: number
  bestScore: number
  worstScore: number
  passRate: number
  totalExecutions: number
  totalTests: number
  lastTestedAt: string
  scoreTrend: number[]  // last N scores for sparkline
  vulnerabilities: { category: string; count: number }[]
  executions: TestExecution[]
}

/**
 * Aggregate test executions by model, deduplicating across batches
 */
export function aggregateByModel(executions: TestExecution[]): AggregatedModel[] {
  const byModel = new Map<string, TestExecution[]>()

  for (const exec of executions) {
    const key = exec.modelId || exec.modelName
    if (!byModel.has(key)) {
      byModel.set(key, [])
    }
    byModel.get(key)!.push(exec)
  }

  const models: AggregatedModel[] = []

  for (const [, execs] of byModel) {
    // Sort by timestamp descending
    const sorted = [...execs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const latest = sorted[0]

    const scores = sorted.map(e => e.score)
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0

    // Build vulnerability summary from categoriesFailed
    const vulnMap = new Map<string, number>()
    for (const exec of sorted) {
      for (const cat of exec.categoriesFailed) {
        vulnMap.set(cat, (vulnMap.get(cat) ?? 0) + 1)
      }
    }
    const vulnerabilities = Array.from(vulnMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Score trend (last 10 scores, oldest first for sparkline)
    const scoreTrend = sorted.slice(0, 10).map(e => e.score).reverse()

    const totalTests = sorted.reduce((sum, e) => sum + e.totalTests, 0)
    const totalPassed = sorted.reduce((sum, e) => sum + e.passed, 0)

    models.push({
      modelId: latest.modelId,
      modelName: latest.modelName,
      provider: latest.provider,
      latestScore: latest.score,
      avgScore,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      worstScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      totalExecutions: sorted.length,
      totalTests,
      lastTestedAt: latest.timestamp,
      scoreTrend,
      vulnerabilities,
      executions: sorted,
    })
  }

  // Sort by latest score descending
  return models.sort((a, b) => b.latestScore - a.latestScore)
}

/** Score change below this threshold is treated as noise */
const TREND_STABILITY_THRESHOLD = 2

/**
 * Calculate trend direction from score history
 * Returns: 'up' | 'down' | 'stable'
 */
export function calculateTrend(scores: number[]): 'up' | 'down' | 'stable' {
  if (scores.length < 2) return 'stable'
  const recent = scores[scores.length - 1]
  const previous = scores[scores.length - 2]
  const diff = recent - previous
  if (Math.abs(diff) < TREND_STABILITY_THRESHOLD) return 'stable'
  return diff > 0 ? 'up' : 'down'
}
