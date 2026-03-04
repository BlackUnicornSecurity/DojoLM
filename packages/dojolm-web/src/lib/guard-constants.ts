/**
 * File: guard-constants.ts
 * Purpose: Constants and metadata for the Hattori Guard system
 * Story: TPI-UIP-11
 * Index:
 * - GUARD_MODES (line 14)
 * - GUARD_MODE_ICONS (line 70)
 * - DEFAULT_GUARD_CONFIG (line 79)
 * - Guard limits (line 88)
 */

import { Eye, Shield, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { GuardMode, GuardModeInfo, GuardConfig } from './guard-types';

/** Metadata for all four guard modes */
export const GUARD_MODES: GuardModeInfo[] = [
  {
    id: 'shinobi',
    name: 'Shinobi',
    subtitle: 'Stealth Monitor',
    description:
      'Stealth monitoring. Scans inputs, logs everything, blocks nothing.',
    inputScan: true,
    outputScan: false,
    canBlock: false,
    icon: Eye,
  },
  {
    id: 'samurai',
    name: 'Samurai',
    subtitle: 'Active Defense',
    description:
      'Active defense. Scans and blocks suspicious inputs before they reach the LLM.',
    inputScan: true,
    outputScan: false,
    canBlock: true,
    icon: Shield,
  },
  {
    id: 'sensei',
    name: 'Sensei',
    subtitle: 'Aggressive Defense',
    description:
      'Aggressive defense. Scans and blocks dangerous LLM outputs.',
    inputScan: false,
    outputScan: true,
    canBlock: true,
    icon: ShieldAlert,
  },
  {
    id: 'hattori',
    name: 'Hattori',
    subtitle: 'Full Protection',
    description:
      'Master protection. Scans both inputs and outputs with blocking on both sides.',
    inputScan: true,
    outputScan: true,
    canBlock: true,
    icon: ShieldCheck,
  },
];

/** Lookup map of mode IDs to Lucide icons */
export const GUARD_MODE_ICONS: Record<GuardMode, LucideIcon> = {
  shinobi: Eye,
  samurai: Shield,
  sensei: ShieldAlert,
  hattori: ShieldCheck,
};

/** Default guard configuration (disabled, stealth monitor mode) */
export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  enabled: false,
  mode: 'shinobi',
  blockThreshold: 'WARNING',
  engines: null,
  persist: false,
};

/** Maximum characters of scanned text stored in audit events (S6) */
export const GUARD_AUDIT_TEXT_MAX = 500;

/** Scan timeout in milliseconds — prevents ReDoS; fail-open on timeout (L4) */
export const GUARD_SCAN_TIMEOUT_MS = 500;

/** Maximum input size in bytes for guard scanning — prevents scanning bombs (L5) */
export const GUARD_MAX_INPUT_SIZE = 50_000;

/** Score assigned to guard-blocked executions — guard caught it but model resilience untested (L1) */
export const GUARD_BLOCKED_SCORE = 80;

/** Maximum number of audit events stored before rotation */
export const GUARD_MAX_EVENTS = 10_000;

/** Valid guard modes for config validation */
export const VALID_GUARD_MODES: ReadonlySet<string> = new Set<string>([
  'shinobi',
  'samurai',
  'sensei',
  'hattori',
]);

/** Valid block thresholds for config validation */
export const VALID_BLOCK_THRESHOLDS: ReadonlySet<string> = new Set<string>([
  'CRITICAL',
  'WARNING',
]);
