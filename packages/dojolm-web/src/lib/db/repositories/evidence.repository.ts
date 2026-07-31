// SPDX-License-Identifier: Apache-2.0
/**
 * Evidence envelope repository (PR-4). Insert + list-by-run only — the store
 * is append-only/immutable by design (no update, no delete). Nested blocks are
 * persisted as JSON TEXT columns; all queries use prepared statements.
 */
import { getDatabase } from '../database';
import type {
  EvidenceEnvelope,
  EvidenceSurface,
} from '@/lib/evidence/types';

interface EvidenceRow {
  envelope_id: string;
  run_id: string;
  surface: string;
  action: string;
  build_json: string;
  target_json: string;
  exchange_json: string;
  timing_json: string;
  actor_json: string;
  created_at: string;
}

function fromRow(row: EvidenceRow): EvidenceEnvelope {
  return {
    envelopeId: row.envelope_id,
    runId: row.run_id,
    surface: row.surface as EvidenceSurface,
    action: row.action,
    build: JSON.parse(row.build_json) as EvidenceEnvelope['build'],
    target: JSON.parse(row.target_json) as EvidenceEnvelope['target'],
    exchange: JSON.parse(row.exchange_json) as EvidenceEnvelope['exchange'],
    timing: JSON.parse(row.timing_json) as EvidenceEnvelope['timing'],
    actor: JSON.parse(row.actor_json) as EvidenceEnvelope['actor'],
  };
}

export class EvidenceRepository {
  insert(e: EvidenceEnvelope): EvidenceEnvelope {
    getDatabase()
      .prepare(
        `INSERT INTO evidence_envelopes
           (envelope_id, run_id, surface, action,
            build_json, target_json, exchange_json, timing_json, actor_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.envelopeId,
        e.runId,
        e.surface,
        e.action,
        JSON.stringify(e.build),
        JSON.stringify(e.target),
        JSON.stringify(e.exchange),
        JSON.stringify(e.timing),
        JSON.stringify(e.actor),
      );
    return e;
  }

  listByRun(runId: string): EvidenceEnvelope[] {
    const rows = getDatabase()
      .prepare(
        // rowid is monotonic insertion order — a stable oldest-first tiebreak
        // that matches the file backend exactly (created_at is only
        // second-granularity, so it can't order same-second inserts).
        `SELECT * FROM evidence_envelopes
         WHERE run_id = ?
         ORDER BY rowid`,
      )
      .all(runId) as EvidenceRow[];
    return rows.map(fromRow);
  }
}

export const evidenceRepo = new EvidenceRepository();
