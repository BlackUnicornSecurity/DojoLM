/**
 * Protocol Fuzzer Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ProtocolFuzzer,
  PROTOCOL_TYPES,
  PROTOCOL_MUTATIONS,
  DEFAULT_PROTOCOL_FUZZ_CONFIG,
} from './protocol-fuzzer.js';

describe('PROTOCOL_TYPES', () => {
  it('defines 3 protocol types', () => {
    expect(PROTOCOL_TYPES).toHaveLength(3);
    expect(PROTOCOL_TYPES).toContain('mcp');
    expect(PROTOCOL_TYPES).toContain('http-rest');
    expect(PROTOCOL_TYPES).toContain('json-rpc');
  });
});

describe('PROTOCOL_MUTATIONS', () => {
  it('defines 7 mutation types', () => {
    expect(PROTOCOL_MUTATIONS).toHaveLength(7);
    expect(PROTOCOL_MUTATIONS).toContain('field_deletion');
    expect(PROTOCOL_MUTATIONS).toContain('type_confusion');
    expect(PROTOCOL_MUTATIONS).toContain('boundary_values');
  });
});

describe('DEFAULT_PROTOCOL_FUZZ_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_PROTOCOL_FUZZ_CONFIG.protocol).toBe('mcp');
    expect(DEFAULT_PROTOCOL_FUZZ_CONFIG.maxIterations).toBe(1000);
    expect(DEFAULT_PROTOCOL_FUZZ_CONFIG.mutationRate).toBe(0.1);
  });
});

describe('ProtocolFuzzer', () => {
  it('constructs with config', () => {
    const fuzzer = new ProtocolFuzzer({
      ...DEFAULT_PROTOCOL_FUZZ_CONFIG,
      maxIterations: 10,
    });
    expect(fuzzer).toBeDefined();
  });

  it('runs MCP fuzzing and returns results', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'mcp',
      targetUrl: 'http://localhost:8080',
      maxIterations: 20,
      timeoutMs: 5000,
      mutationRate: 0.1,
    });
    const result = fuzzer.run();

    expect(result.config.protocol).toBe('mcp');
    expect(result.iterations.length).toBeGreaterThan(0);
    expect(result.iterations.length).toBeLessThanOrEqual(20);
    expect(result.coverage.totalFields).toBeGreaterThan(0);
    expect(typeof result.elapsed).toBe('number');
  });

  it('runs HTTP-REST fuzzing', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'http-rest',
      targetUrl: 'http://localhost:8080',
      maxIterations: 10,
      timeoutMs: 5000,
      mutationRate: 0.1,
    });
    const result = fuzzer.run();
    expect(result.config.protocol).toBe('http-rest');
    expect(result.iterations.length).toBeGreaterThan(0);
  });

  it('runs JSON-RPC fuzzing', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'json-rpc',
      targetUrl: 'http://localhost:8080',
      maxIterations: 10,
      timeoutMs: 5000,
      mutationRate: 0.1,
    });
    const result = fuzzer.run();
    expect(result.config.protocol).toBe('json-rpc');
    expect(result.iterations.length).toBeGreaterThan(0);
  });

  it('tracks coverage across mutations', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'mcp',
      targetUrl: 'http://localhost:8080',
      maxIterations: 50,
      timeoutMs: 5000,
      mutationRate: 0.1,
    });
    const result = fuzzer.run();
    expect(result.coverage.testedFields).toBeGreaterThan(0);
    expect(result.coverage.coveragePercent).toBeGreaterThan(0);
  });

  it('caps maxIterations at 10000', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'mcp',
      targetUrl: 'http://localhost:8080',
      maxIterations: 99999,
      timeoutMs: 100,
      mutationRate: 0.1,
    });
    // Short timeout will stop early, but it should not crash
    const result = fuzzer.run();
    expect(result.iterations.length).toBeLessThanOrEqual(10000);
  });

  it('invokes progress callback', () => {
    const fuzzer = new ProtocolFuzzer({
      protocol: 'mcp',
      targetUrl: 'http://localhost:8080',
      maxIterations: 5,
      timeoutMs: 5000,
      mutationRate: 0.1,
    });
    let callCount = 0;
    fuzzer.run(() => { callCount++; });
    expect(callCount).toBe(5);
  });
});
