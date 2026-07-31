# SQLite app-DB migrations

This directory holds **SQLite-only** migrations for the Next.js app database
(`tpi.db` under `TPI_DATA_DIR`). They cover users, sessions, audit log, RBAC,
and the v2 module tables.

## Postgres migrations live elsewhere

The DSR cascade and budget ledger are **Postgres** data classes. Their
migrations live at `packages/bu-tpi/src/sensei/migrations/` and are mirrored
inline by the per-feature runners under `packages/dojolm-web/src/lib/<feature>/migrate.ts`
(see [`lib/budget/migrate.ts`](../src/lib/budget/migrate.ts) and
[`lib/dsr/migrate.ts`](../src/lib/dsr/migrate.ts) for the pattern).

Do not add Postgres DDL to this directory — the SQLite syntax accepted here
(`datetime('now')`, `INSERT OR IGNORE`, `INTEGER PRIMARY KEY AUTOINCREMENT`)
is incompatible with Postgres, and the Next.js bundling story for the
Postgres path is the inline-mirror runner, not file reads.
