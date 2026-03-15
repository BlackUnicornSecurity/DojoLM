/**
 * H23.1: Protocol Fuzzer
 * Generates mutated protocol messages (MCP, HTTP-REST, JSON-RPC) for fuzz testing.
 * SEC-09: Dry-run generator only — does NOT execute payloads against live targets.
 */

import { SeededRNG } from '../sage/mutation-engine.js';

// --- Protocol Types ---

export const PROTOCOL_TYPES = ['mcp', 'http-rest', 'json-rpc'] as const;
export type ProtocolType = (typeof PROTOCOL_TYPES)[number];

// --- Mutation Types ---

export const PROTOCOL_MUTATIONS = [
  'field_deletion',
  'type_confusion',
  'boundary_values',
  'malformed_headers',
  'missing_required',
  'extra_fields',
  'encoding_mismatch',
] as const;
export type ProtocolMutation = (typeof PROTOCOL_MUTATIONS)[number];

// --- Configuration ---

export interface ProtocolFuzzConfig {
  readonly protocol: ProtocolType;
  readonly targetUrl: string;
  readonly maxIterations: number;
  readonly timeoutMs: number;
  readonly mutationRate: number;
}

export const DEFAULT_PROTOCOL_FUZZ_CONFIG: ProtocolFuzzConfig = {
  protocol: 'mcp',
  targetUrl: 'http://localhost:3000',
  maxIterations: 1000,
  timeoutMs: 5000,
  mutationRate: 0.1,
};

// --- Result Types ---

export interface FuzzIteration {
  readonly index: number;
  readonly mutation: ProtocolMutation;
  readonly input: string;
  readonly output: string | null;
  readonly crashed: boolean;
  readonly errorType: string | null;
  readonly elapsed: number;
}

export interface ProtocolCoverage {
  readonly totalFields: number;
  readonly testedFields: number;
  readonly coveragePercent: number;
  readonly fieldMap: Record<string, boolean>;
}

export interface ProtocolFuzzResult {
  readonly config: ProtocolFuzzConfig;
  readonly iterations: FuzzIteration[];
  readonly crashes: FuzzIteration[];
  readonly coverage: ProtocolCoverage;
  readonly elapsed: number;
}

// --- MCP Field Map ---

const MCP_FIELDS = [
  'jsonrpc',
  'method',
  'id',
  'params',
  'result',
  'error',
  'error.code',
  'error.message',
  'error.data',
] as const;

const HTTP_FIELDS = [
  'method',
  'url',
  'headers',
  'headers.content-type',
  'headers.authorization',
  'body',
  'query',
] as const;

const JSONRPC_FIELDS = [
  'jsonrpc',
  'method',
  'id',
  'params',
  'result',
  'error',
  'error.code',
  'error.message',
  'error.data',
] as const;

/**
 * Protocol Fuzzer — generates mutated protocol messages for fuzz testing.
 * SEC-09: Dry-run mode only. Does NOT send requests to live targets.
 */
export class ProtocolFuzzer {
  private readonly config: ProtocolFuzzConfig;
  private readonly fieldMap: Record<string, boolean>;
  private readonly fieldList: readonly string[];

  constructor(config: ProtocolFuzzConfig) {
    const maxIter = Math.min(Math.max(config.maxIterations, 1), 10_000);
    this.config = { ...config, maxIterations: maxIter };

    switch (config.protocol) {
      case 'mcp':
        this.fieldList = MCP_FIELDS;
        break;
      case 'http-rest':
        this.fieldList = HTTP_FIELDS;
        break;
      case 'json-rpc':
        this.fieldList = JSONRPC_FIELDS;
        break;
    }

    this.fieldMap = {};
    for (const field of this.fieldList) {
      this.fieldMap[field] = false;
    }
  }

  /**
   * Generate a valid MCP JSON-RPC message, then apply mutation.
   */
  generateMCPMessage(rng: SeededRNG): string {
    const methods = ['initialize', 'tools/list', 'tools/call', 'resources/read', 'prompts/get'];
    const method = methods[rng.nextInt(0, methods.length - 1)];
    const msg: Record<string, unknown> = {
      jsonrpc: '2.0',
      method,
      id: rng.nextInt(1, 99999),
      params: { name: `test-${rng.nextInt(0, 100)}` },
    };
    return JSON.stringify(msg);
  }

  /**
   * Generate an HTTP request template, then mutate.
   */
  generateHTTPRequest(rng: SeededRNG): string {
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const paths = ['/api/v1/scan', '/api/v1/models', '/api/v1/presets', '/api/v1/health'];
    const req: Record<string, unknown> = {
      method: httpMethods[rng.nextInt(0, httpMethods.length - 1)],
      url: paths[rng.nextInt(0, paths.length - 1)],
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer token-${rng.nextInt(1000, 9999)}`,
      },
      body: JSON.stringify({ input: `test-payload-${rng.nextInt(0, 100)}` }),
      query: {},
    };
    return JSON.stringify(req);
  }

  /**
   * Generate a JSON-RPC 2.0 message, then mutate.
   */
  generateJSONRPCMessage(rng: SeededRNG): string {
    const methods = ['eth_call', 'eth_getBalance', 'net_version', 'web3_clientVersion'];
    const msg: Record<string, unknown> = {
      jsonrpc: '2.0',
      method: methods[rng.nextInt(0, methods.length - 1)],
      id: rng.nextInt(1, 99999),
      params: [`0x${rng.nextInt(1000, 9999).toString(16)}`],
    };
    return JSON.stringify(msg);
  }

  /**
   * Apply a specific mutation type to a message string.
   */
  applyMutation(message: string, mutation: ProtocolMutation, rng: SeededRNG): string {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(message) as Record<string, unknown>;
    } catch {
      return message;
    }

    switch (mutation) {
      case 'field_deletion': {
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          const keyToDelete = keys[rng.nextInt(0, keys.length - 1)];
          delete parsed[keyToDelete];
          this.markFieldTested(keyToDelete);
        }
        return JSON.stringify(parsed);
      }

      case 'type_confusion': {
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          const key = keys[rng.nextInt(0, keys.length - 1)];
          const val = parsed[key];
          if (typeof val === 'string') {
            parsed[key] = 42;
          } else if (typeof val === 'number') {
            parsed[key] = String(val);
          } else if (Array.isArray(val)) {
            parsed[key] = { converted: true };
          } else if (typeof val === 'object' && val !== null) {
            parsed[key] = [val];
          } else {
            parsed[key] = { unexpected: true };
          }
          this.markFieldTested(key);
        }
        return JSON.stringify(parsed);
      }

      case 'boundary_values': {
        const keys = Object.keys(parsed);
        const numericKeys = keys.filter((k) => typeof parsed[k] === 'number');
        if (numericKeys.length > 0) {
          const key = numericKeys[rng.nextInt(0, numericKeys.length - 1)];
          const extremes = [
            Number.MAX_SAFE_INTEGER,
            Number.MIN_SAFE_INTEGER,
            0,
            -1,
            NaN,
            Infinity,
            -Infinity,
            2147483647,
            -2147483648,
          ];
          parsed[key] = extremes[rng.nextInt(0, extremes.length - 1)];
          this.markFieldTested(key);
        } else {
          // No numeric keys — inject one
          const key = keys.length > 0 ? keys[rng.nextInt(0, keys.length - 1)] : 'id';
          parsed[key] = Number.MAX_SAFE_INTEGER;
          this.markFieldTested(key);
        }
        return JSON.stringify(parsed);
      }

      case 'malformed_headers': {
        if ('headers' in parsed && typeof parsed['headers'] === 'object' && parsed['headers'] !== null) {
          const headers = parsed['headers'] as Record<string, unknown>;
          headers['content-type'] = 'text/invalid; charset=\x00broken';
          headers['x-evil'] = '\r\nInjected-Header: true';
          this.markFieldTested('headers');
          this.markFieldTested('headers.content-type');
        } else {
          parsed['headers'] = { 'content-type': 'application/\x00garbage', malformed: true };
          this.markFieldTested('headers');
        }
        return JSON.stringify(parsed);
      }

      case 'missing_required': {
        const requiredFields = ['jsonrpc', 'method', 'id'];
        const present = requiredFields.filter((f) => f in parsed);
        if (present.length > 0) {
          const field = present[rng.nextInt(0, present.length - 1)];
          delete parsed[field];
          this.markFieldTested(field);
        }
        return JSON.stringify(parsed);
      }

      case 'extra_fields': {
        const extraFields = [
          '__proto__',
          'constructor',
          'toString',
          '_debug',
          'admin',
          'internal_flag',
          '$where',
        ];
        const count = rng.nextInt(1, 3);
        for (let i = 0; i < count; i++) {
          const field = extraFields[rng.nextInt(0, extraFields.length - 1)];
          parsed[field] = rng.next() > 0.5 ? 'injected' : rng.nextInt(0, 9999);
        }
        return JSON.stringify(parsed);
      }

      case 'encoding_mismatch': {
        let json = JSON.stringify(parsed);
        // Insert UTF-16 BOM and mix encodings
        const insertions = ['\uFEFF', '\uFFFD', '\u0000', '\u202E', '\u200B'];
        const pos = rng.nextInt(1, Math.max(1, json.length - 2));
        const insertion = insertions[rng.nextInt(0, insertions.length - 1)];
        json = json.slice(0, pos) + insertion + json.slice(pos);
        this.markFieldTested('method');
        return json;
      }
    }
  }

  /**
   * Execute the fuzzing loop in dry-run mode.
   * Generates mutated payloads and tracks coverage. Does NOT send requests.
   */
  run(onProgress?: (iteration: FuzzIteration) => void): ProtocolFuzzResult {
    const rng = new SeededRNG(`protocol-fuzz-${this.config.protocol}-${this.config.targetUrl}`);
    const iterations: FuzzIteration[] = [];
    const crashes: FuzzIteration[] = [];
    const startTime = Date.now();

    for (let i = 0; i < this.config.maxIterations; i++) {
      // Timeout check
      if (Date.now() - startTime > this.config.timeoutMs) {
        break;
      }

      const mutation = PROTOCOL_MUTATIONS[rng.nextInt(0, PROTOCOL_MUTATIONS.length - 1)];
      const iterStart = Date.now();

      // Generate base message
      let baseMessage: string;
      switch (this.config.protocol) {
        case 'mcp':
          baseMessage = this.generateMCPMessage(rng);
          break;
        case 'http-rest':
          baseMessage = this.generateHTTPRequest(rng);
          break;
        case 'json-rpc':
          baseMessage = this.generateJSONRPCMessage(rng);
          break;
      }

      // Apply mutation
      const mutatedMessage = this.applyMutation(baseMessage, mutation, rng);

      // Check if mutated message is parseable (crash detection)
      let crashed = false;
      let errorType: string | null = null;
      let output: string | null = null;

      try {
        JSON.parse(mutatedMessage);
        output = mutatedMessage;
      } catch (e) {
        crashed = true;
        errorType = e instanceof Error ? e.message : 'parse_error';
        output = null;
      }

      const iteration: FuzzIteration = {
        index: i,
        mutation,
        input: mutatedMessage,
        output,
        crashed,
        errorType,
        elapsed: Date.now() - iterStart,
      };

      iterations.push(iteration);
      if (crashed) {
        crashes.push(iteration);
      }

      if (onProgress) {
        onProgress(iteration);
      }
    }

    const elapsed = Date.now() - startTime;

    return {
      config: this.config,
      iterations,
      crashes,
      coverage: this.getCoverage(),
      elapsed,
    };
  }

  /**
   * Return protocol coverage based on fields mutated so far.
   */
  getCoverage(): ProtocolCoverage {
    const totalFields = this.fieldList.length;
    const testedFields = Object.values(this.fieldMap).filter(Boolean).length;
    return {
      totalFields,
      testedFields,
      coveragePercent: totalFields > 0 ? (testedFields / totalFields) * 100 : 0,
      fieldMap: { ...this.fieldMap },
    };
  }

  /**
   * Mark a field as tested in the coverage map.
   */
  private markFieldTested(field: string): void {
    // Direct match
    if (field in this.fieldMap) {
      this.fieldMap[field] = true;
    }
    // Check for nested field coverage (e.g., 'headers' covers 'headers.content-type' parent)
    for (const tracked of this.fieldList) {
      if (tracked.startsWith(field + '.') || field.startsWith(tracked + '.')) {
        this.fieldMap[tracked] = true;
      }
    }
  }
}
