/**
 * Config Loader — Parse dojolm.config.json with security validation (P8-S79)
 *
 * Loads provider configuration from JSON files with:
 * - Env-var interpolation restricted to allowlisted patterns
 * - Rejects literal API key values
 * - JSON structure validation
 *
 * Index:
 * - loadConfig (line ~30)
 * - ProviderConfigEntry interface (line ~15)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { validateEnvVarRef, validateProviderUrl } from './security.js';

// ===========================================================================
// Types
// ===========================================================================

/** A single provider entry from the config file */
export interface ProviderConfigEntry {
  id: string;
  provider: string;
  model: string;
  apiKey?: string;        // Must be env var reference like ${OPENAI_API_KEY}
  baseUrl?: string;
  enabled?: boolean;
  customHeaders?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
}

/** Top-level config file structure */
interface ConfigFile {
  llm?: {
    providers?: ProviderConfigEntry[];
  };
  scanner?: Record<string, unknown>;
}

/** Options for config loading */
export interface LoadConfigOptions {
  /** Override config file path */
  configPath?: string;
  /** Working directory for project config search */
  cwd?: string;
}

// ===========================================================================
// Literal API Key Detection
// ===========================================================================

/** Known API key patterns that should NEVER appear as literals in config */
const LITERAL_KEY_PATTERNS = [
  /^sk-[a-zA-Z0-9]{20,}/,       // OpenAI
  /^gsk_[a-zA-Z0-9]{20,}/,      // Groq
  /^sk-ant-[a-zA-Z0-9_-]{20,}/, // Anthropic
  /^AIza[a-zA-Z0-9_-]{30,}/,    // Google
];

function isLiteralApiKey(value: string): boolean {
  return LITERAL_KEY_PATTERNS.some(p => p.test(value));
}

// ===========================================================================
// Env Var Interpolation
// ===========================================================================

/** Pattern matching ${VAR_NAME} references */
const ENV_VAR_REF_PATTERN = /^\$\{([^}]+)\}$/;

/**
 * Interpolate a string value, resolving ${ENV_VAR} references.
 * Only allows allowlisted env var names (from S78a validateEnvVarRef).
 */
function interpolateValue(value: string): string {
  const match = value.match(ENV_VAR_REF_PATTERN);
  if (!match) return value;

  const varName = match[1];

  // Validate against allowlist
  if (!validateEnvVarRef(varName)) {
    throw new Error(
      `Config file references non-allowlisted env var: ${varName}. ` +
      `Only *_API_KEY, *_BASE_URL, *_MODEL, *_ORGANIZATION_ID, *_SECRET, *_PROJECT_ID are allowed.`
    );
  }

  const envValue = process.env[varName];
  if (!envValue) {
    throw new Error(`Config file references env var ${varName} which is not set.`);
  }

  return envValue;
}

// ===========================================================================
// Config Loader
// ===========================================================================

/**
 * Load provider configuration from dojolm.config.json.
 *
 * Search order:
 * 1. Explicit configPath (if provided)
 * 2. ./dojolm.config.json (project root)
 * 3. ~/.config/dojolm/config.json (user config)
 *
 * Security:
 * - Rejects literal API key values
 * - Only allows allowlisted env var interpolation
 * - Warns if loading from current working directory (untrusted source)
 *
 * @returns Array of validated provider configurations
 */
export function loadConfig(options: LoadConfigOptions = {}): ProviderConfigEntry[] {
  const { configPath, cwd = process.cwd() } = options;

  // Determine config file path
  let filePath: string | undefined;
  let isProjectConfig = false;

  if (configPath) {
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    filePath = configPath;
  } else {
    // Search order: project root, then user config
    const projectPath = join(cwd, 'dojolm.config.json');
    const userPath = join(homedir(), '.config', 'dojolm', 'config.json');

    if (existsSync(projectPath)) {
      filePath = projectPath;
      isProjectConfig = true;
    } else if (existsSync(userPath)) {
      filePath = userPath;
    }
  }

  if (!filePath) {
    // No config file found — that's fine, return empty
    return [];
  }

  // Warn about project-level config (potentially untrusted)
  if (isProjectConfig) {
    console.warn(
      `[dojolm] Loading config from project directory: ${filePath}. ` +
      `Ensure this file is in .gitignore and does not contain literal API keys.`
    );
  }

  // Parse JSON
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read config file: ${filePath}: ${err}`);
  }

  let config: ConfigFile;
  try {
    config = JSON.parse(raw) as ConfigFile;
  } catch (err) {
    throw new Error(`Failed to parse config file: ${filePath}: ${err}`);
  }

  // Extract providers
  const providers = config?.llm?.providers;
  if (!providers || !Array.isArray(providers)) {
    return [];
  }

  // Validate and interpolate each provider entry
  const result: ProviderConfigEntry[] = [];

  for (const entry of providers) {
    // Validate required fields
    if (!entry.id || typeof entry.id !== 'string') {
      throw new Error('Config: provider entry missing "id" field');
    }
    if (!entry.provider || typeof entry.provider !== 'string') {
      throw new Error(`Config: provider "${entry.id}" missing "provider" field`);
    }
    if (!entry.model || typeof entry.model !== 'string') {
      throw new Error(`Config: provider "${entry.id}" missing "model" field`);
    }

    // Check for literal API keys
    if (entry.apiKey && typeof entry.apiKey === 'string' && !entry.apiKey.startsWith('${')) {
      if (isLiteralApiKey(entry.apiKey)) {
        throw new Error(
          `Config: provider "${entry.id}" contains a literal API key. ` +
          `Use environment variable references instead: \${PROVIDER_API_KEY}`
        );
      }
    }

    // Interpolate env var references
    const interpolated: ProviderConfigEntry = {
      ...entry,
      apiKey: entry.apiKey ? interpolateValue(entry.apiKey) : undefined,
      baseUrl: entry.baseUrl ? interpolateValue(entry.baseUrl) : undefined,
    };

    // Validate baseUrl against SSRF blocklist
    if (interpolated.baseUrl) {
      const isLocal = ['ollama', 'lmstudio', 'llamacpp', 'vllm', 'koboldcpp'].includes(entry.provider);
      if (!validateProviderUrl(interpolated.baseUrl, isLocal)) {
        throw new Error(
          `Config: provider "${entry.id}" has blocked baseUrl: ${interpolated.baseUrl}. ` +
          `Internal IPs, cloud metadata endpoints, and non-HTTPS URLs are not allowed.`
        );
      }
    }

    // Validate field types (partial JSON Schema equivalent)
    if (interpolated.temperature !== undefined && (typeof interpolated.temperature !== 'number' || interpolated.temperature < 0 || interpolated.temperature > 2)) {
      throw new Error(`Config: provider "${entry.id}" has invalid temperature (must be 0-2)`);
    }
    if (interpolated.maxTokens !== undefined && (typeof interpolated.maxTokens !== 'number' || interpolated.maxTokens < 1)) {
      throw new Error(`Config: provider "${entry.id}" has invalid maxTokens (must be >= 1)`);
    }
    if (interpolated.customHeaders !== undefined && (typeof interpolated.customHeaders !== 'object' || Array.isArray(interpolated.customHeaders) || interpolated.customHeaders === null)) {
      throw new Error(`Config: provider "${entry.id}" has invalid customHeaders (must be an object)`);
    }
    if (interpolated.enabled !== undefined && typeof interpolated.enabled !== 'boolean') {
      throw new Error(`Config: provider "${entry.id}" has invalid enabled (must be boolean)`);
    }

    result.push(interpolated);
  }

  return result;
}
