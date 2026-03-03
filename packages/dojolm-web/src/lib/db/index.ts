/**
 * Database module barrel export.
 *
 * Re-exports connection management, migration runner, and types.
 */

export {
  getDatabase,
  closeDatabase,
  getDatabasePath,
  verifyWalMode,
  resetDatabase,
} from './database';

export {
  getCurrentVersion,
  getAppliedMigrations,
  discoverMigrations,
  runMigrations,
  initializeDatabase,
} from './migrations';

export {
  encrypt,
  decrypt,
  validateEncryptionKey,
  resetEncryptionKey,
} from './encryption';

export type {
  ModelConfigRow,
  TestCaseRow,
  BatchExecutionRow,
  BatchTestCaseRow,
  TestExecutionRow,
  ScanFindingRow,
  EvidenceRecordRow,
  ExecutionOwaspCoverageRow,
  ExecutionTpiCoverageRow,
  ModelScoreRow,
  ComplianceScoreRow,
  UserRow,
  UserRole,
  SessionRow,
  AuditLogRow,
  RetentionConfigRow,
  PaginatedResult,
} from './types';

export { QueryBuilder } from './query-builder';

export {
  getRetentionConfig,
  updateRetentionConfig,
  runRetention,
} from './retention';

// Re-export repositories
export {
  modelConfigRepo,
  testCaseRepo,
  executionRepo,
  batchRepo,
  scoreboardRepo,
  auditRepo,
  userRepo,
} from './repositories';
