/**
 * Shingan — Universal Skill/Agent Definition Scanner
 *
 * Public API for scanning skill files from any agent framework.
 * D7.1-D7.7 (Phase 1): Parser + 6 pattern layers
 * D7.8-D7.10 (Phase 2): Scanner module + trust scoring + public API
 *
 * Layers:
 * - L1: Metadata Poisoning (shingan-metadata)
 * - L2: Code-Level Payloads (shingan-payloads)
 * - L3: Data Exfiltration (shingan-exfiltration)
 * - L4: Social Engineering (shingan-social)
 * - L5: Supply Chain Identity (shingan-supply-chain)
 * - L6: Memory & Context Poisoning (shingan-context)
 */

// Re-export skill parser types and functions
export {
  type SkillFormat,
  type SkillMetadata,
  type SkillSection,
  type ParsedSkill,
  detectFormat,
  parseSkill,
} from '../modules/skill-parser.js';

// Re-export pattern arrays for direct access
export { ALL_METADATA_PATTERNS } from '../modules/shingan-metadata.js';
export { ALL_PAYLOAD_PATTERNS } from '../modules/shingan-payloads.js';
export { ALL_EXFILTRATION_PATTERNS } from '../modules/shingan-exfiltration.js';
export { ALL_SOCIAL_PATTERNS } from '../modules/shingan-social.js';
export { ALL_SUPPLY_CHAIN_PATTERNS } from '../modules/shingan-supply-chain.js';
export { ALL_CONTEXT_PATTERNS } from '../modules/shingan-context.js';

// D7.8: Scanner module + combined patterns
export {
  shinganModule,
  ALL_SHINGAN_PATTERNS,
  LAYERS,
} from '../modules/shingan-scanner.js';

// D7.9: Trust score calculator
export {
  type SkillTrustScore,
  type RiskLevel,
  computeTrustScore,
  batchTrustScore,
} from '../modules/shingan-trust.js';

// D7.10: Convenience function — scan a skill file
import type { ScanResult } from '../types.js';
import { scan } from '../scanner.js';

// Ensure shingan module is registered
import '../modules/shingan-scanner.js';

export function scanSkill(
  content: string,
  _filename?: string,
): ScanResult {
  return scan(content, { engines: ['shingan-scanner'] });
}
