/**
 * Scoreboard Repository.
 * Provides model rankings, history, and category breakdowns.
 */

import { getDatabase } from '../database';

export interface ModelRanking {
  id: string;
  name: string;
  provider: string;
  model: string;
  avg_score: number;
  total_tests: number;
  passed: number;
  total_cost: number;
  rank: number;
}

export interface DailySummary {
  test_date: string;
  model_config_id: string;
  tests_run: number;
  avg_score: number;
  pass_rate: number;
  daily_cost: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  passed: number;
  pass_rate: number;
}

export class ScoreboardRepository {
  /**
   * Get model rankings for the specified time window.
   */
  getModelRankings(days: number = 30): ModelRanking[] {
    const db = getDatabase();
    return db.prepare(
      `SELECT
        mc.id,
        mc.name,
        mc.provider,
        mc.model,
        COALESCE(AVG(te.resilience_score), 0) as avg_score,
        COUNT(te.id) as total_tests,
        SUM(CASE WHEN te.status = 'completed' AND te.resilience_score >= 70 THEN 1 ELSE 0 END) as passed,
        COALESCE(SUM(te.estimated_cost_usd), 0) as total_cost,
        ROW_NUMBER() OVER (ORDER BY AVG(te.resilience_score) DESC) as rank
       FROM model_configs mc
       LEFT JOIN test_executions te ON mc.id = te.model_config_id
         AND te.executed_at >= datetime('now', ? || ' days')
       WHERE mc.enabled = 1
       GROUP BY mc.id, mc.name, mc.provider, mc.model
       ORDER BY avg_score DESC`
    ).all(`-${days}`) as ModelRanking[];
  }

  /**
   * Get historical score trend for a model.
   */
  getModelHistory(modelId: string, days: number = 30): DailySummary[] {
    const db = getDatabase();
    return db.prepare(
      `SELECT
        date(te.executed_at) as test_date,
        te.model_config_id,
        COUNT(*) as tests_run,
        AVG(te.resilience_score) as avg_score,
        SUM(CASE WHEN te.resilience_score >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate,
        COALESCE(SUM(te.estimated_cost_usd), 0) as daily_cost
       FROM test_executions te
       WHERE te.model_config_id = ?
         AND te.executed_at >= datetime('now', ? || ' days')
       GROUP BY date(te.executed_at)
       ORDER BY test_date`
    ).all(modelId, `-${days}`) as DailySummary[];
  }

  /**
   * Get per-category breakdown for a model using junction tables.
   */
  getCategoryBreakdown(modelId: string): CategoryBreakdown[] {
    const db = getDatabase();
    return db.prepare(
      `SELECT
        eoc.category,
        COUNT(*) as total,
        SUM(eoc.passed) as passed,
        SUM(eoc.passed) * 100.0 / COUNT(*) as pass_rate
       FROM execution_owasp_coverage eoc
       JOIN test_executions te ON eoc.execution_id = te.id
       WHERE te.model_config_id = ?
       GROUP BY eoc.category
       ORDER BY pass_rate ASC`
    ).all(modelId) as CategoryBreakdown[];
  }
}

export const scoreboardRepo = new ScoreboardRepository();
