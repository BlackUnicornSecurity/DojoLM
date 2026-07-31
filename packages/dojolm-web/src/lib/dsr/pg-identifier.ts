// SPDX-License-Identifier: Apache-2.0
/**
 * Shared SQL-identifier whitelist for DSR Postgres store templates.
 *
 * Both `PostgresDsr*Store` (PR #158) and `PostgresReapableStore` (PR #159)
 * validate table/column names against the same regex to prevent config
 * injection; keeping the check in one place makes the rule a single
 * source of truth.
 */

export const SAFE_SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Validate a schema/table/column identifier. Accepts dotted
 * `schema.table` form — every segment must match {@link SAFE_SQL_IDENTIFIER}.
 * Throws an `Error` naming the offending `kind` + value.
 */
export function assertSafeSqlIdentifier(id: string, kind: string): void {
  for (const part of id.split('.')) {
    if (!SAFE_SQL_IDENTIFIER.test(part)) {
      throw new Error(
        `SQL ${kind} "${id}" must match ${SAFE_SQL_IDENTIFIER.source} (per segment). ` +
          'Use names that do not require quoting.',
      );
    }
  }
}
