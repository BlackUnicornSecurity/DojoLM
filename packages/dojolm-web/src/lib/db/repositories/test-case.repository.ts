/**
 * Test Case Repository.
 * Handles fixture/test case CRUD with bulk upsert for seeding.
 */

import { BaseRepository } from './base.repository';
import { getDatabase } from '../database';
import type { TestCaseRow } from '../types';

export class TestCaseRepository extends BaseRepository<TestCaseRow> {
  constructor() {
    super('test_cases');
  }

  findByCategory(category: string): TestCaseRow[] {
    return this.findAll({ where: { category } });
  }

  findByOwasp(owaspCategory: string): TestCaseRow[] {
    return this.findAll({ where: { owasp_category: owaspCategory } });
  }

  findByTpi(tpiStory: string): TestCaseRow[] {
    return this.findAll({ where: { tpi_story: tpiStory } });
  }

  findEnabled(): TestCaseRow[] {
    return this.findAll({ where: { enabled: 1 } });
  }

  /**
   * Bulk upsert test cases for fixture seeding.
   * Uses INSERT OR REPLACE for idempotent imports.
   */
  bulkUpsert(testCases: Partial<TestCaseRow>[]): number {
    const db = this.getDb();
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO test_cases
       (id, name, category, prompt, expected_behavior, severity, scenario,
        owasp_category, tpi_story, tags_json, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const upsertAll = db.transaction(() => {
      let count = 0;
      for (const tc of testCases) {
        stmt.run(
          tc.id, tc.name, tc.category, tc.prompt, tc.expected_behavior ?? null,
          tc.severity ?? 'MEDIUM', tc.scenario ?? null, tc.owasp_category ?? null,
          tc.tpi_story ?? null, tc.tags_json ?? null, tc.enabled ?? 1
        );
        count++;
      }
      return count;
    });

    return upsertAll();
  }
}

export const testCaseRepo = new TestCaseRepository();
