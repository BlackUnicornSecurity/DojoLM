/**
 * S32d: Environmental & Config Attack Detector
 * Detects environmental manipulation and config poisoning attacks.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'env-detector';
const MODULE_SOURCE = 'S32d';
const ENGINE = 'env-detector';

const MAX_INPUT_LENGTH = 500_000;

export const PATH_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'env_path_hijack', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?PATH\s*=\s*[^\n]*(?:attacker|malicious|evil|tmp\/hack|\/hack)/i, desc: 'PATH hijack to attacker-controlled directory', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_ld_preload', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?LD_(?:PRELOAD|LIBRARY_PATH)\s*=\s*\S+/i, desc: 'LD_PRELOAD/LD_LIBRARY_PATH injection', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_path_prepend', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:export\s+)?PATH\s*=\s*(?:\/(?:tmp|var\/tmp|proc|dev|attacker|evil|hack|malicious)[^\s:]*:)\$PATH/i, desc: 'PATH prepend with suspicious directory', source: MODULE_SOURCE, weight: 7 },
];

export const CREDENTIAL_EXFIL_PATTERNS: RegexPattern[] = [
  { name: 'env_credential_echo', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.CRITICAL,
    re: /echo\s+\$(?:API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AWS_SECRET|OPENAI_API_KEY|DATABASE_URL)/i, desc: 'Credential extraction via echo', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_process_env_secret', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.CRITICAL,
    re: /process\.env\.(?:SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|API_KEY|AWS_SECRET)/i, desc: 'Node.js process.env credential access', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_getenv_secret', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.WARNING,
    re: /(?:getenv|os\.environ)\s*[\[(]\s*['"]?(?:SECRET|TOKEN|KEY|PASSWORD|API_KEY|AWS_SECRET)/i, desc: 'Environment variable credential extraction', source: MODULE_SOURCE, weight: 8 },
  { name: 'env_printenv_exfil', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.WARNING,
    re: /(?:printenv|env\b|set\b)[^\n]{0,40}(?:exfil|extract|steal|leak|dump|send|curl|wget)/i, desc: 'Environment enumeration with exfiltration', source: MODULE_SOURCE, weight: 8 },
];

export const CONFIG_POISON_PATTERNS: RegexPattern[] = [
  { name: 'env_safety_false', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /(?:SAFETY|SECURITY|GUARD|FILTER|PROTECTION)[\w_]*\s*[=:]\s*(?:false|0|off|disabled|none)/i, desc: 'Safety configuration disabled', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_admin_unrestricted', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /(?:ADMIN|ROOT|SUPER)\s*[_-]?\s*(?:MODE|ACCESS|LEVEL)\s*[=:]\s*(?:unrestricted|true|full|yes|enabled)/i, desc: 'Admin mode unrestricted', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_debug_production', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.WARNING,
    re: /(?:FLASK_DEBUG\s*=\s*1|DEBUG\s*[=:]\s*(?:true|\*))/i, desc: 'Debug mode enabled in production context', source: MODULE_SOURCE, weight: 7 },
  { name: 'env_system_override_config', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /SYSTEM[_-]?OVERRIDE\s*[=:]\s*(?:true|1|yes|enabled)/i, desc: 'System override via config', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_prompt_visible', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /prompt[_-]?visible\s*[=:]\s*(?:true|1|yes)/i, desc: 'Prompt visibility config override', source: MODULE_SOURCE, weight: 9 },
];

export const DOTENV_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'env_dotenv_override', cat: 'ENV_DOTENV_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:INSTRUCTIONS?|COMMAND|OVERRIDE)\s*=\s*["']?(?:ignore|override|bypass|disable)/i, desc: '.env variable with instruction override', source: MODULE_SOURCE, weight: 8 },
  { name: 'env_ini_safety_section', cat: 'ENV_DOTENV_INJECTION', sev: SEVERITY.WARNING,
    re: /\[safety\]\s*\n(?:\s*\w+\s*=\s*\S+\s*\n)*\s*enabled\s*=\s*false/im, desc: 'INI config safety section disabled', source: MODULE_SOURCE, weight: 8 },
];

export const CONTAINER_ESCAPE_PATTERNS: RegexPattern[] = [
  { name: 'env_docker_privileged', cat: 'ENV_CONTAINER_ESCAPE', sev: SEVERITY.CRITICAL,
    re: /(?:docker\s+run|podman\s+run)[^\n]{0,80}--privileged/i, desc: 'Privileged container execution', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_hostpid_hostnet', cat: 'ENV_CONTAINER_ESCAPE', sev: SEVERITY.CRITICAL,
    re: /(?:hostPID|hostNetwork|hostIPC)\s*:\s*true/i, desc: 'Host namespace access in container config', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_docker_env_inject', cat: 'ENV_CONTAINER_ESCAPE', sev: SEVERITY.WARNING,
    re: /docker\s+run\s+(?:-e\s+["'][^"']*(?:OVERRIDE|SAFETY|ADMIN)[^"']*["']\s*){2,}/i, desc: 'Docker env injection with multiple override flags', source: MODULE_SOURCE, weight: 8 },
];

export const SECRET_BYPASS_PATTERNS: RegexPattern[] = [
  { name: 'env_secret_file_read', cat: 'ENV_SECRET_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:cat|read|open)\s+\/run\/secrets\//, desc: 'Direct secret file access', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_vault_token', cat: 'ENV_SECRET_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:VAULT_TOKEN|vault\s+token)/i, desc: 'Vault token extraction', source: MODULE_SOURCE, weight: 8 },
];

export const CONFIG_FORMAT_PATTERNS: RegexPattern[] = [
  { name: 'env_json_safety_disabled', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /["']?safety["']?\s*:\s*\{[^}]*["']?enabled["']?\s*:\s*false/i, desc: 'JSON config safety disabled', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_json_admin_mode', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /["']?(?:admin|root)["']?\s*:\s*\{[^}]*["']?mode["']?\s*:\s*["']unrestricted["']/i, desc: 'JSON config admin unrestricted', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_yaml_safety_disabled', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /safety:\s*\n\s+enabled:\s*false/im, desc: 'YAML config safety disabled', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_yaml_override_true', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.CRITICAL,
    re: /(?:system_override|override):\s*true/i, desc: 'YAML/config override enabled', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_config_inject_general', cat: 'ENV_CONFIG_POISON', sev: SEVERITY.WARNING,
    re: /(?:configuration|config)\s+(?:inject|poison|tamper|manipulat)/i, desc: 'Configuration injection attack', source: MODULE_SOURCE, weight: 7 },
];

export const DIRECTORY_HIJACK_PATTERNS: RegexPattern[] = [
  { name: 'env_home_hijack', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?HOME\s*=\s*(?:\/tmp\/|\/dev\/|\/proc\/)\S*/i, desc: 'HOME directory redirected to suspicious location', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_xdg_hijack', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?XDG_(?:CONFIG|CACHE|DATA)_HOME\s*=\s*[^\n]*(?:attacker|malicious|tmp\/)/i, desc: 'XDG directory hijacked', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_ssh_socket_hijack', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?SSH_AUTH_SOCK\s*=\s*[^\n]*(?:attacker|\.sock)/i, desc: 'SSH auth socket redirected', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_http_proxy_inject', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?(?:HTTP|HTTPS)_PROXY\s*=\s*[^\n]*(?:attacker|malicious|evil)/i, desc: 'HTTP proxy redirected to attacker server', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_no_proxy_empty', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?NO_PROXY\s*=\s*(?:""|'')\s*$/im, desc: 'NO_PROXY empty (all traffic proxied)', source: MODULE_SOURCE, weight: 9 },
  { name: 'env_proxy_intercept', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.WARNING,
    re: /(?:HTTP|HTTPS)_PROXY[^\n]{0,80}(?:all\s+traffic|intercept|route|redirect)/i, desc: 'Proxy traffic interception', source: MODULE_SOURCE, weight: 8 },
  { name: 'env_proxy_loader_inject', cat: 'ENV_CREDENTIAL_EXFIL', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?(?:HTTP|HTTPS)_PROXY\s*=\s*["']?(?:--require\s+\S+|\/tmp\/[^\s"']+(?:\.(?:dylib|so|js))?|\/tmp\/libs|https?:\/\/evil[-\w.]+(?::\d+)?)/i, desc: 'Proxy variable points to local hooks, shared libraries, or attacker proxy infrastructure', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_runtime_option_inject', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?(?:NODE_OPTIONS|PYTHONPATH)\s*=\s*["']?(?:--require\s+\S+|\/tmp\/[^\s"']+(?:\.(?:so|dylib|js))?|\/tmp\/libs|https?:\/\/evil[-\w.]+(?::\d+)?)/i, desc: 'Runtime option or language path variable injects a local hook or attacker-controlled loader', source: MODULE_SOURCE, weight: 10 },
  { name: 'env_dyld_insert_libraries', cat: 'ENV_PATH_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:export\s+)?DYLD_INSERT_LIBRARIES\s*=\s*["']?\S+/i, desc: 'DYLD_INSERT_LIBRARIES injection on macOS', source: MODULE_SOURCE, weight: 10 },
];

export function detectEnvManipulation(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect environment variable exfiltration chain
  const envVarPattern = /(?:echo\s+\$|\$\{?)[A-Z_]{3,}/g;
  const envVarMatches = text.match(envVarPattern);
  if (envVarMatches && envVarMatches.length >= 3) {
    findings.push({
      category: 'ENV_CREDENTIAL_EXFIL', severity: SEVERITY.WARNING,
      description: `Multiple environment variable extractions (${envVarMatches.length} variables)`,
      match: envVarMatches.slice(0, 3).join(', '), source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'env_multi_var_exfil', weight: 8,
    });
  }

  // Detect config key=value blocks with safety-disabling values
  const safetyDisablePattern = /(?:safety|security|guard|filter|protection)\s*[=:]\s*(?:false|0|off|disabled|none)/gi;
  const safetyMatches = text.match(safetyDisablePattern);
  if (safetyMatches && safetyMatches.length >= 2) {
    findings.push({
      category: 'ENV_CONFIG_POISON', severity: SEVERITY.CRITICAL,
      description: `Multiple safety controls disabled (${safetyMatches.length} settings)`,
      match: safetyMatches.slice(0, 3).join(', '), source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'env_multi_safety_disable', weight: 10,
    });
  }

  return findings;
}

const ENV_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: PATH_MANIPULATION_PATTERNS, name: 'PATH_MANIPULATION' },
  { patterns: CREDENTIAL_EXFIL_PATTERNS, name: 'CREDENTIAL_EXFIL' },
  { patterns: CONFIG_POISON_PATTERNS, name: 'CONFIG_POISON' },
  { patterns: DOTENV_INJECTION_PATTERNS, name: 'DOTENV_INJECTION' },
  { patterns: CONTAINER_ESCAPE_PATTERNS, name: 'CONTAINER_ESCAPE' },
  { patterns: SECRET_BYPASS_PATTERNS, name: 'SECRET_BYPASS' },
  { patterns: CONFIG_FORMAT_PATTERNS, name: 'CONFIG_FORMAT' },
  { patterns: DIRECTORY_HIJACK_PATTERNS, name: 'DIRECTORY_HIJACK' },
];
const ENV_DETECTORS = [{ name: 'env-manipulation', detect: detectEnvManipulation }];

const envDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects environmental manipulation and config poisoning attacks',
  supportedContentTypes: ['text/plain', 'application/json', 'application/yaml'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'ENVCONFIG_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for env-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'env_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of ENV_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of ENV_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return ENV_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + ENV_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = ENV_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'env-detectors', count: ENV_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

scannerRegistry.register(envDetectorModule);
export { envDetectorModule };
