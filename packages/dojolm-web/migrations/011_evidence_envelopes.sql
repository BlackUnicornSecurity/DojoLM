-- Evidence envelope store (PR-4 / CONT-R2 evidence contract).
-- One immutable row per authenticated, target-bound QA action. The nested
-- blocks (build/target/exchange/timing/actor) are stored as JSON TEXT so the
-- shape can evolve without a column migration; run-scoped readback + count
-- reconciliation are served by the run_id index. There is deliberately NO
-- update path — a correction is a new row with timing.retryOfEnvelopeId set.
CREATE TABLE IF NOT EXISTS evidence_envelopes (
  envelope_id   TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  surface       TEXT NOT NULL,
  action        TEXT NOT NULL,
  build_json    TEXT NOT NULL,
  target_json   TEXT NOT NULL,
  exchange_json TEXT NOT NULL,
  timing_json   TEXT NOT NULL,
  actor_json    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_run ON evidence_envelopes(run_id);
