/**
 * D7.4: Shingan L3 — Data Exfiltration Patterns (12 patterns)
 *
 * Detects network exfiltration, credential harvesting,
 * and environment sniffing in skill/agent content.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.4';

// ============================================================================
// Network Exfiltration (4 patterns)
// ============================================================================

export const NETWORK_EXFIL_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_exfil_curl_wget',
    cat: 'SKILL_DATA_EXFILTRATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:curl|wget)\s+(?:-[a-zA-Z]*\s+)*(?:--data|--post-data|-d|-X\s*POST)\s+[^\n]{5,}(?:https?:\/\/|[a-zA-Z0-9.-]+\.\w{2,})/i,
    desc: 'curl/wget POST data to external URL',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_exfil_dns',
    cat: 'SKILL_DATA_EXFILTRATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:dig|nslookup|host)\s+(?:\$[\w{]|`[^`]+`|\$\([^)]+\))[\s\S]{0,30}\.(?:[a-z0-9-]+\.){1,3}[a-z]{2,}/i,
    desc: 'DNS exfiltration via dynamic subdomain lookup',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_exfil_websocket',
    cat: 'SKILL_DATA_EXFILTRATION',
    sev: SEVERITY.CRITICAL,
    re: /\bnew\s+WebSocket\s*\(\s*["']wss?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
    desc: 'WebSocket connection to external host',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_exfil_beacon',
    cat: 'SKILL_DATA_EXFILTRATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:navigator\.sendBeacon|fetch|XMLHttpRequest|http\.request|axios\.(?:post|put|patch))\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s"']{5,}/,
    desc: 'HTTP beacon/callback to external endpoint',
    source: SOURCE,
    weight: 9,
  },
] as const;

// ============================================================================
// Credential Harvesting (4 patterns)
// ============================================================================

export const CREDENTIAL_HARVEST_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_harvest_env_file',
    cat: 'SKILL_CREDENTIAL_HARVEST',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:cat|read|type|Get-Content|fs\.readFile\w*|readFileSync)\s*\(?\s*["'`]?(?:\.env|\.env\.local|\.env\.production|\.env\.secret)/i,
    desc: 'Reading .env file for credential harvesting',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_harvest_api_key',
    cat: 'SKILL_CREDENTIAL_HARVEST',
    sev: SEVERITY.WARNING,
    re: /\b(?:api[_-]?key|api[_-]?secret|auth[_-]?token|bearer[_-]?token|access[_-]?token|secret[_-]?key)\s*[:=]\s*(?:process\.env|os\.environ|\$\{?\w)/i,
    desc: 'API key/token reference with environment variable access',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_harvest_ssh_key',
    cat: 'SKILL_CREDENTIAL_HARVEST',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:cat|read|type|readFile\w*)\s*\(?\s*["'`]?(?:~\/\.ssh\/|\/home\/\w+\/\.ssh\/|\$HOME\/\.ssh\/|id_rsa|id_ed25519|authorized_keys|known_hosts)/i,
    desc: 'Reading SSH key files',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_harvest_aws_creds',
    cat: 'SKILL_CREDENTIAL_HARVEST',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:cat|read|type|readFile\w*)\s*\(?\s*["'`]?(?:~\/\.aws\/|\/home\/\w+\/\.aws\/|\$HOME\/\.aws\/|credentials|\.aws\/config)/i,
    desc: 'Reading AWS credential files',
    source: SOURCE,
    weight: 10,
  },
] as const;

// ============================================================================
// Environment Sniffing (4 patterns)
// ============================================================================

export const ENV_SNIFFING_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_sniff_process_env',
    cat: 'SKILL_ENV_SNIFFING',
    sev: SEVERITY.WARNING,
    re: /\bprocess\.env\b[\s\S]{0,20}(?:JSON\.stringify|Object\.(?:keys|entries|values)|\.join|\.map|\.forEach|\bfor\s+\()/,
    desc: 'Bulk enumeration of process.env variables',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_sniff_home_user',
    cat: 'SKILL_ENV_SNIFFING',
    sev: SEVERITY.WARNING,
    re: /\b(?:\$HOME|\$USER|\$PATH|\$SHELL|%USERPROFILE%|%APPDATA%|process\.env\.(?:HOME|USER|PATH|SHELL|USERNAME|USERPROFILE))\b/,
    desc: 'Accessing user home/identity environment variables',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_sniff_system_info',
    cat: 'SKILL_ENV_SNIFFING',
    sev: SEVERITY.WARNING,
    re: /\b(?:uname\s+-[a-z]|whoami|id\b|hostname\b|ifconfig\b|ip\s+addr|systeminfo|cat\s+\/etc\/passwd)/i,
    desc: 'System information gathering commands',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_sniff_os_platform',
    cat: 'SKILL_ENV_SNIFFING',
    sev: SEVERITY.INFO,
    re: /\b(?:os\.platform|os\.hostname|os\.userInfo|os\.homedir|os\.arch|os\.cpus|os\.networkInterfaces)\s*\(\)/,
    desc: 'Node.js os module platform/system info gathering',
    source: SOURCE,
    weight: 4,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_EXFILTRATION_PATTERNS: readonly RegexPattern[] = [
  ...NETWORK_EXFIL_PATTERNS,
  ...CREDENTIAL_HARVEST_PATTERNS,
  ...ENV_SNIFFING_PATTERNS,
] as const;
