import { describe, it, expect } from 'vitest';
import * as mod from '../webmcp/index.js';

describe('webmcp exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports transport security functions', () => {
    expect(mod.validateSSEStream).toBeTypeOf('function');
    expect(mod.validateWebSocketSecurity).toBeTypeOf('function');
    expect(mod.signMCPMessage).toBeTypeOf('function');
    expect(mod.verifyMCPMessage).toBeTypeOf('function');
  });

  it('exports TLS and assessment functions', () => {
    expect(mod.validateTLSConfig).toBeTypeOf('function');
    expect(mod.assessTransportSecurity).toBeTypeOf('function');
  });
});
