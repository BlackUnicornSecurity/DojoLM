import { describe, it, expect } from 'vitest';
import * as mod from '../modules/index.js';

describe('modules exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports scanner registry', () => {
    expect(mod.ScannerRegistry).toBeTypeOf('function');
    expect(mod.scannerRegistry).toBeDefined();
  });

  it('exports scanner modules', () => {
    expect(mod.mcpParserModule).toBeDefined();
    expect(mod.encodingEngineModule).toBeDefined();
    expect(mod.piiDetectorModule).toBeDefined();
    expect(mod.webmcpDetectorModule).toBeDefined();
  });
});
