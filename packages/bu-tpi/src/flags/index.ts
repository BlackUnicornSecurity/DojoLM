// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/flags.
 */
export {
  FLAGS,
  FLAG_NAMES,
  EnvFlagSource,
  StaticFlagSource,
  FlagReader,
  defaultFlagReader,
  isHarmPathFlag,
  isBuildTimeFlag,
} from './flags.js';
export type { FlagDefinition, FlagName, FlagSource } from './flags.js';

export {
  KILL_SIGNALS,
  KillSwitchRegistry,
  CancellationToken,
  KillSwitchAbort,
  killSwitchRegistry,
} from './kill-switch.js';
export type {
  KillSignal,
  KillReason,
  KillEvent,
  KillHandler,
} from './kill-switch.js';

export {
  InMemoryKillSwitchTransport,
  PostgresNotifyKillSwitchTransport,
  RedisKillSwitchTransport,
  TransportNotConfiguredError,
  buildKillSwitchTransport,
  readTransportKind,
} from './kill-switch-pubsub.js';
export type {
  KillSwitchTransport,
  KillSwitchTransportKind,
  TransportFactories,
  PostgresNotifyClient,
  RedisPublisher,
  RedisSubscriber,
} from './kill-switch-pubsub.js';

export {
  TwoPersonApproval,
  TwoPersonApprovalError,
} from './two-person-approval.js';
export type {
  ApplyChange,
  ApprovalAuditSink,
  ApprovalConfig,
  ApprovalRecord,
  ApprovalRequestInput,
  ApprovalRequestKind,
  ApprovalState,
} from './two-person-approval.js';
