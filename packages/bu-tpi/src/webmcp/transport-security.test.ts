/**
 * WebMCP Transport Security Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateSSEStream,
  validateSSEContentType,
  validateWebSocketSecurity,
  signMCPMessage,
  verifyMCPMessage,
  validateTLSConfig,
  assessTransportSecurity,
} from './transport-security.js';

// ============================================================================
// SSE Validation
// ============================================================================

describe('validateSSEStream', () => {
  it('accepts valid SSE stream', () => {
    const stream = 'event: message\ndata: hello world\n\n';
    const result = validateSSEStream(stream);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects injection in event name', () => {
    const stream = 'event: test<script>alert(1)</script>\ndata: hi\n\n';
    const result = validateSSEStream(stream);
    expect(result.valid).toBe(false);
    const injection = result.issues.find((i) => i.type === 'injection');
    expect(injection).toBeDefined();
  });

  it('detects XSS in data field', () => {
    const stream = 'data: <script>document.cookie</script>\n\n';
    const result = validateSSEStream(stream);
    const xss = result.issues.find((i) => i.type === 'injection');
    expect(xss).toBeDefined();
    expect(xss!.severity).toBe('critical');
  });

  it('detects oversized stream', () => {
    const stream = 'data: ' + 'A'.repeat(600_000) + '\n\n';
    const result = validateSSEStream(stream);
    expect(result.valid).toBe(false);
    expect(result.issues[0].type).toBe('overflow');
  });

  it('detects non-standard retry field', () => {
    const stream = 'retry: notanumber\n\n';
    const result = validateSSEStream(stream);
    const malformed = result.issues.find((i) => i.type === 'malformed');
    expect(malformed).toBeDefined();
  });
});

describe('validateSSEContentType', () => {
  it('returns null for correct content type', () => {
    expect(validateSSEContentType('text/event-stream')).toBeNull();
  });

  it('flags missing content type', () => {
    const issue = validateSSEContentType(undefined);
    expect(issue).not.toBeNull();
    expect(issue!.type).toBe('missing-content-type');
  });

  it('flags wrong content type', () => {
    const issue = validateSSEContentType('application/json');
    expect(issue).not.toBeNull();
  });
});

// ============================================================================
// WebSocket Security
// ============================================================================

describe('validateWebSocketSecurity', () => {
  const validHeaders = {
    upgrade: 'websocket',
    connection: 'Upgrade',
    'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
    'sec-websocket-version': '13',
    origin: 'https://example.com',
  };

  it('accepts valid WebSocket handshake with allowlist', () => {
    const result = validateWebSocketSecurity(
      validHeaders,
      'https://example.com',
      ['https://example.com'],
    );
    expect(result.secure).toBe(true);
  });

  it('detects CSWSH when origin not in allowlist', () => {
    const result = validateWebSocketSecurity(
      validHeaders,
      'https://evil.com',
      ['https://example.com'],
    );
    expect(result.secure).toBe(false);
    const cswsh = result.issues.find((i) => i.type === 'cswsh');
    expect(cswsh).toBeDefined();
  });

  it('detects null origin bypass', () => {
    const result = validateWebSocketSecurity(
      { ...validHeaders, origin: 'null' },
      'null',
      ['https://example.com'],
    );
    const bypass = result.issues.find((i) => i.type === 'origin-bypass');
    expect(bypass).toBeDefined();
  });

  it('flags missing upgrade header', () => {
    const { upgrade: _, ...noUpgrade } = validHeaders;
    const result = validateWebSocketSecurity(noUpgrade);
    const issue = result.issues.find((i) => i.type === 'upgrade-abuse');
    expect(issue).toBeDefined();
  });
});

// ============================================================================
// Message Integrity
// ============================================================================

describe('signMCPMessage / verifyMCPMessage', () => {
  const secret = 'a-secure-secret-key-that-is-long-enough';

  it('signs and verifies a message', () => {
    const signature = signMCPMessage('hello', secret);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);

    const result = verifyMCPMessage('hello', signature, secret);
    expect(result.valid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.tampered).toBe(false);
  });

  it('detects tampered message', () => {
    const signature = signMCPMessage('original', secret);
    const result = verifyMCPMessage('tampered', signature, secret);
    expect(result.valid).toBe(false);
    expect(result.tampered).toBe(true);
  });

  it('rejects missing signature', () => {
    const result = verifyMCPMessage('msg', '', secret);
    expect(result.valid).toBe(false);
    expect(result.signaturePresent).toBe(false);
  });

  it('rejects short secret', () => {
    expect(() => signMCPMessage('msg', 'short')).toThrow();
  });
});

// ============================================================================
// TLS Validation
// ============================================================================

describe('validateTLSConfig', () => {
  it('flags HTTP endpoint', () => {
    const result = validateTLSConfig({ url: 'http://example.com/api' });
    expect(result.secure).toBe(false);
    const noTls = result.issues.find((i) => i.type === 'no-tls');
    expect(noTls).toBeDefined();
  });

  it('accepts HTTPS endpoint', () => {
    const result = validateTLSConfig({ url: 'https://example.com/api' });
    expect(result.secure).toBe(true);
  });

  it('flags weak TLS protocol', () => {
    const result = validateTLSConfig({ url: 'https://example.com', protocol: 'TLSv1' });
    const weak = result.issues.find((i) => i.type === 'weak-protocol');
    expect(weak).toBeDefined();
  });

  it('flags expired certificate', () => {
    const result = validateTLSConfig({
      url: 'https://example.com',
      certExpiry: new Date('2020-01-01'),
    });
    const expired = result.issues.find((i) => i.type === 'expired-cert');
    expect(expired).toBeDefined();
  });
});

// ============================================================================
// Full Assessment
// ============================================================================

describe('assessTransportSecurity', () => {
  it('returns overall secure when all checks pass', () => {
    const report = assessTransportSecurity({});
    expect(report.overallSecure).toBe(true);
    expect(typeof report.timestamp).toBe('string');
  });

  it('returns insecure when SSE has injection', () => {
    const report = assessTransportSecurity({
      sseStream: 'event: <script>\ndata: test\n\n',
    });
    expect(report.overallSecure).toBe(false);
  });
});
