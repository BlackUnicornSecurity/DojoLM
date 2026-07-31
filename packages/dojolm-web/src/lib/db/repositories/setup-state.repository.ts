// SPDX-License-Identifier: Apache-2.0
/**
 * Setup-State Repository (E6.S3 / F-8-006).
 *
 * Persists the singleton `setup_state` row that captures wizard-completion
 * timestamps the legal/regulatory layer needs to prove explicit, time-stamped
 * consent (GDPR Art. 6/7/13, ePrivacy Art. 5(3), ICO PECR, CCPA 1798.135).
 *
 * The first column tracked here is `acknowledged_telemetry_at` — the ISO-8601
 * timestamp at which an admin acknowledged the build-channel telemetry-
 * disclosure step in the first-boot wizard. The /admin/* gate refuses
 * navigation while this column is null, so a pre-ack admin lands back on
 * /setup. `build_channel_at_ack` records which channel ('cloud' |
 * 'self-host') was disclosed at ack time so a later channel flip cannot
 * retroactively reframe what the operator agreed to.
 *
 * Validation runs at the repository boundary (not just the route layer) so
 * defense-in-depth holds even if a future caller skips the route's input
 * schema.
 */

import { isBuildChannel, type BuildChannel, type SetupStateRow } from '../types';
import { getDatabase } from '../database';

export class SetupStateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SetupStateValidationError';
  }
}

/**
 * Snapshot shape for the singleton row. Mirrors `SetupStateRow` but
 * narrows `build_channel_at_ack` to the closed `BuildChannel` set when
 * present. A corrupt row collapses to `null` rather than poisoning the
 * gate.
 */
export interface SetupStateSnapshot {
  readonly acknowledged_telemetry_at: string | null;
  readonly acknowledged_telemetry_by_user_id: string | null;
  readonly build_channel_at_ack: BuildChannel | null;
}

const EMPTY_SNAPSHOT: SetupStateSnapshot = Object.freeze({
  acknowledged_telemetry_at: null,
  acknowledged_telemetry_by_user_id: null,
  build_channel_at_ack: null,
});

export class SetupStateRepository {
  /**
   * Read the singleton row. Returns the empty snapshot when the row is
   * absent (the migration seeds it, but a partial state shouldn't crash
   * a route that runs before the migration completes — e.g. tests that
   * shadow the DB).
   */
  getSnapshot(): SetupStateSnapshot {
    const db = getDatabase();
    let row: SetupStateRow | undefined;
    try {
      row = db
        .prepare('SELECT * FROM setup_state WHERE id = 1')
        .get() as SetupStateRow | undefined;
    } catch {
      // Table missing (test fixture or pre-migration boot) — fail closed
      // by returning the unack snapshot. The /admin/* gate then redirects
      // to /setup, which is the correct posture for a non-provisioned
      // deployment.
      return EMPTY_SNAPSHOT;
    }
    if (!row) {
      return EMPTY_SNAPSHOT;
    }
    return Object.freeze({
      acknowledged_telemetry_at: row.acknowledged_telemetry_at,
      acknowledged_telemetry_by_user_id: row.acknowledged_telemetry_by_user_id,
      build_channel_at_ack: isBuildChannel(row.build_channel_at_ack)
        ? row.build_channel_at_ack
        : null,
    });
  }

  /**
   * Returns true when the operator has acknowledged the telemetry-disclosure
   * step. The `/admin/*` gate keys off this single boolean — corrupt rows
   * (manual SQL edits) collapse to `false` so the gate fails closed.
   */
  isTelemetryAcknowledged(): boolean {
    return this.getSnapshot().acknowledged_telemetry_at !== null;
  }

  /**
   * Record the operator's telemetry-disclosure ack. Idempotent — a second
   * call from the same user on the same channel rewrites the row to the
   * latest timestamp; a different user / channel also rewrites because
   * the legally-relevant value is the *most recent* ack, and the audit
   * log captures the prior value.
   *
   * Throws `SetupStateValidationError` when:
   *   * `userId` is empty / non-string
   *   * `buildChannel` is not in the closed set
   */
  acknowledgeTelemetry(userId: string, buildChannel: BuildChannel): SetupStateSnapshot {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new SetupStateValidationError('userId must be a non-empty string');
    }
    if (!isBuildChannel(buildChannel)) {
      throw new SetupStateValidationError(
        'buildChannel must be one of {cloud, self-host}',
      );
    }
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO setup_state (id, acknowledged_telemetry_at, acknowledged_telemetry_by_user_id, build_channel_at_ack, updated_at)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         acknowledged_telemetry_at = excluded.acknowledged_telemetry_at,
         acknowledged_telemetry_by_user_id = excluded.acknowledged_telemetry_by_user_id,
         build_channel_at_ack = excluded.build_channel_at_ack,
         updated_at = excluded.updated_at`,
    ).run(now, userId.trim(), buildChannel, now);
    return this.getSnapshot();
  }
}

export const setupStateRepo = new SetupStateRepository();
