// SPDX-License-Identifier: Apache-2.0
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
    // Stream 8: tightened to exclude RFC 2606 reserved demo TLDs
    // (.example, .invalid, .test, .localhost) and RFC 6761 example.{com,
    // org,net} domains. Documentation fixtures like
    // `new WebSocket('wss://chat.example.com')` are universally benign
    // example code, not real exfil. Stream 7 raised one FP on the
    // `webmcp/benign-websocket-chat.fixture` file (which uses
    // wss://chat.example.com) — this tightening removes that FP class.
    re: /\bnew\s+WebSocket\s*\(\s*["']wss?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|[\w.-]+\.(?:example|invalid|test|localhost)\b|example\.(?:com|org|net)\b)/,
    desc: 'WebSocket connection to external host (RFC 2606/6761 demo domains excluded)',
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
    // Stream 8: tightened to require shell-context anchoring for `id` and
    // `hostname` (otherwise \bid\b matched HTML id="..." attrs, JSON {"id":N}
    // keys, REST docs like {id}, etc.; \bhostname\b matched prose mentions
    // of /etc/hosts setup). Other tokens (uname/whoami/ifconfig/ip addr/
    // systeminfo/cat /etc/passwd) are already shell-only and unchanged.
    // The id|hostname shell-context shape requires:
    //   • a shell statement-separator before (`;`, `&`, `|`, line start, or `$(` or backtick)
    //   • a shell terminator after (`;`, `&`, `|`, end of line, `>` redirect, or `)` closing $(...))
    re: /\b(?:uname\s+-[a-z]|whoami|ifconfig\b|ip\s+addr|systeminfo|cat\s+\/etc\/passwd)|(?:^|[;&|`]|\$\()(?:\s*)(?:id|hostname)(?:\s*)(?:[;&|>]|$|\))/im,
    desc: 'System information gathering commands (shell-anchored for id/hostname)',
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
