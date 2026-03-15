/**
 * WebMCP Transport Security Testing
 * Story: H16.6
 * Tests MCP transport layer for SSE, WebSocket, and HTTP security.
 */

import { createHmac, timingSafeEqual } from 'crypto';

// --- Types ---

export interface SSEIssue {
  readonly type: 'injection' | 'overflow' | 'malformed' | 'missing-content-type';
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly evidence: string;
}

export interface SSEValidationResult {
  readonly valid: boolean;
  readonly issues: SSEIssue[];
}

export interface WebSocketIssue {
  readonly type:
    | 'origin-bypass'
    | 'cswsh'
    | 'frame-injection'
    | 'upgrade-abuse'
    | 'missing-origin'
    | 'no-origin-allowlist';
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly evidence: string;
}

export interface WebSocketSecurityResult {
  readonly secure: boolean;
  readonly issues: WebSocketIssue[];
}

export interface MessageIntegrityResult {
  readonly valid: boolean;
  readonly signaturePresent: boolean;
  readonly signatureValid: boolean;
  readonly tampered: boolean;
}

export interface TLSValidationResult {
  readonly secure: boolean;
  readonly issues: TLSIssue[];
}

export interface TLSIssue {
  readonly type:
    | 'no-tls'
    | 'weak-protocol'
    | 'weak-cipher'
    | 'expired-cert'
    | 'self-signed'
    | 'hostname-mismatch';
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly evidence: string;
}

export interface TransportSecurityReport {
  readonly sse: SSEValidationResult;
  readonly websocket: WebSocketSecurityResult;
  readonly integrity: MessageIntegrityResult;
  readonly tls: TLSValidationResult;
  readonly overallSecure: boolean;
  readonly timestamp: string;
}

// --- Constants ---

/** Maximum total SSE stream size (500KB). */
const MAX_SSE_STREAM_LENGTH = 500_000;
/** Maximum per-field data length (64KB). */
const MAX_SSE_DATA_LENGTH = 65_536;
/** Maximum event name length. */
const MAX_EVENT_NAME_LENGTH = 256;
/** Valid SSE field names per spec. */
const VALID_SSE_FIELDS = new Set(['event', 'data', 'id', 'retry']);
/** Maximum header value length for WebSocket validation. */
const MAX_HEADER_VALUE_LENGTH = 2048;
/** Maximum message length for HMAC signing/verification. */
const MAX_MESSAGE_LENGTH = 1_048_576; // 1MB
/** Minimum HMAC secret length. */
const MIN_SECRET_LENGTH = 16;
/** Expected hex-encoded HMAC-SHA256 length. */
const HMAC_HEX_LENGTH = 64;
/** Weak TLS protocols. */
const WEAK_TLS_PROTOCOLS = new Set([
  'SSLv2',
  'SSLv3',
  'TLSv1',
  'TLSv1.0',
  'TLSv1.1',
]);
/** Weak cipher substrings. */
const WEAK_CIPHER_PATTERNS = [
  'RC4',
  'DES',
  'MD5',
  'NULL',
  'EXPORT',
  'anon',
  'CBC',
];

// --- SSE Validation ---

/**
 * Validates an SSE stream for injection attacks, overflow, and malformed fields.
 * Checks event names for injection characters, data fields for XSS payloads,
 * and enforces size limits on all fields.
 */
export function validateSSEStream(rawStream: string): SSEValidationResult {
  if (typeof rawStream !== 'string') {
    return {
      valid: false,
      issues: [
        {
          type: 'malformed',
          severity: 'critical',
          description: 'SSE stream is not a string',
          evidence: `Type: ${typeof rawStream}`,
        },
      ],
    };
  }

  const issues: SSEIssue[] = [];

  if (rawStream.length > MAX_SSE_STREAM_LENGTH) {
    return {
      valid: false,
      issues: [
        {
          type: 'overflow',
          severity: 'high',
          description: 'SSE stream exceeds maximum size',
          evidence: `Length: ${rawStream.length}, max: ${MAX_SSE_STREAM_LENGTH}`,
        },
      ],
    };
  }

  const lines = rawStream.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty lines (event boundaries) and comments are fine
    if (line === '' || line.startsWith(':')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      // Lines without colons are field-only (treated as field with empty value per spec)
      // Still validate the field name
      const field = line.trim();
      if (field.length > 0 && !VALID_SSE_FIELDS.has(field)) {
        issues.push({
          type: 'malformed',
          severity: 'medium',
          description: `Unknown SSE field at line ${i + 1}: "${field.slice(0, 64)}"`,
          evidence: line.slice(0, 200),
        });
      }
      continue;
    }

    const field = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trimStart();

    // Check for invalid field names
    if (!VALID_SSE_FIELDS.has(field)) {
      issues.push({
        type: 'malformed',
        severity: 'medium',
        description: `Unknown SSE field at line ${i + 1}: "${field.slice(0, 64)}"`,
        evidence: line.slice(0, 200),
      });
    }

    // Check for injection in event names
    if (field === 'event') {
      if (value.length > MAX_EVENT_NAME_LENGTH) {
        issues.push({
          type: 'overflow',
          severity: 'high',
          description: 'SSE event name exceeds max length',
          evidence: `Length: ${value.length}, max: ${MAX_EVENT_NAME_LENGTH}`,
        });
      }
      // Newlines, carriage returns, angle brackets indicate injection attempt
      if (/[\r\n<>]/.test(value)) {
        issues.push({
          type: 'injection',
          severity: 'critical',
          description: 'SSE event name contains injection characters',
          evidence: value.slice(0, 100),
        });
      }
    }

    // Check for data field overflow
    if (field === 'data' && value.length > MAX_SSE_DATA_LENGTH) {
      issues.push({
        type: 'overflow',
        severity: 'high',
        description: 'SSE data field exceeds max length',
        evidence: `Length: ${value.length}, max: ${MAX_SSE_DATA_LENGTH}`,
      });
    }

    // Check for HTML/script injection in data fields
    if (
      field === 'data' &&
      /<script\b|javascript\s{0,4}:|<img\b[^>]{0,200}\bonerror\b/i.test(value)
    ) {
      issues.push({
        type: 'injection',
        severity: 'critical',
        description: 'SSE data contains potential XSS payload',
        evidence: value.slice(0, 200),
      });
    }

    // Check for event stream injection via crafted id fields (CRLF injection)
    if (field === 'id' && /[\r\n\0]/.test(value)) {
      issues.push({
        type: 'injection',
        severity: 'critical',
        description: 'SSE id field contains control characters (CRLF injection)',
        evidence: value.slice(0, 100),
      });
    }

    // Check retry field is numeric
    if (field === 'retry' && !/^\d{1,10}$/.test(value)) {
      issues.push({
        type: 'malformed',
        severity: 'medium',
        description: 'SSE retry field is not a valid integer',
        evidence: value.slice(0, 64),
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === 'critical');
  return { valid: !hasCritical, issues };
}

/**
 * Validates that an SSE response has the correct Content-Type header.
 */
export function validateSSEContentType(
  contentType: string | undefined
): SSEIssue | null {
  if (!contentType) {
    return {
      type: 'missing-content-type',
      severity: 'high',
      description: 'SSE response missing Content-Type header',
      evidence: 'Content-Type: undefined',
    };
  }
  const normalized = contentType.toLowerCase().trim();
  if (!normalized.startsWith('text/event-stream')) {
    return {
      type: 'missing-content-type',
      severity: 'high',
      description:
        'SSE response has incorrect Content-Type (expected text/event-stream)',
      evidence: `Content-Type: ${contentType.slice(0, 128)}`,
    };
  }
  return null;
}

// --- WebSocket Security ---

/**
 * Validates WebSocket connection headers for security issues including
 * origin validation, CSWSH (Cross-Site WebSocket Hijacking) defense,
 * and upgrade header abuse.
 */
export function validateWebSocketSecurity(
  headers: Record<string, string>,
  origin?: string,
  allowedOrigins?: string[]
): WebSocketSecurityResult {
  const issues: WebSocketIssue[] = [];

  if (!headers || typeof headers !== 'object') {
    return {
      secure: false,
      issues: [
        {
          type: 'upgrade-abuse',
          severity: 'critical',
          description: 'Headers object is missing or invalid',
          evidence: 'No headers provided',
        },
      ],
    };
  }

  // Normalize header keys to lowercase for case-insensitive lookup
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key === 'string' && typeof value === 'string') {
      normalizedHeaders[key.toLowerCase()] =
        value.length > MAX_HEADER_VALUE_LENGTH
          ? value.slice(0, MAX_HEADER_VALUE_LENGTH)
          : value;
    }
  }

  // 1. Verify Upgrade header
  const upgradeHeader = normalizedHeaders['upgrade'];
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    issues.push({
      type: 'upgrade-abuse',
      severity: 'high',
      description: 'Missing or invalid Upgrade header',
      evidence: `Upgrade: ${upgradeHeader?.slice(0, 64) ?? 'missing'}`,
    });
  }

  // 2. Verify Connection header includes "Upgrade"
  const connectionHeader = normalizedHeaders['connection'];
  if (
    !connectionHeader ||
    !connectionHeader.toLowerCase().includes('upgrade')
  ) {
    issues.push({
      type: 'upgrade-abuse',
      severity: 'medium',
      description: 'Missing or invalid Connection header',
      evidence: `Connection: ${connectionHeader?.slice(0, 64) ?? 'missing'}`,
    });
  }

  // 3. Check Sec-WebSocket-Key presence (required for handshake)
  const wsKey = normalizedHeaders['sec-websocket-key'];
  if (!wsKey) {
    issues.push({
      type: 'upgrade-abuse',
      severity: 'high',
      description: 'Missing Sec-WebSocket-Key header',
      evidence: 'Sec-WebSocket-Key: missing',
    });
  }

  // 4. Origin validation (critical for CSWSH defense)
  const requestOrigin =
    origin ?? normalizedHeaders['origin'] ?? undefined;

  if (!requestOrigin) {
    issues.push({
      type: 'missing-origin',
      severity: 'high',
      description:
        'No Origin header present; cannot validate against CSWSH',
      evidence: 'Origin: missing',
    });
  } else if (allowedOrigins && allowedOrigins.length > 0) {
    const normalizedOrigin = requestOrigin.toLowerCase().replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.toLowerCase().replace(/\/$/, '') === normalizedOrigin
    );

    if (!isAllowed) {
      issues.push({
        type: 'cswsh',
        severity: 'critical',
        description:
          'Origin not in allowlist; potential Cross-Site WebSocket Hijacking',
        evidence: `Origin: ${requestOrigin.slice(0, 128)}, allowed: [${allowedOrigins.join(', ').slice(0, 256)}]`,
      });
    }
  } else if (requestOrigin) {
    // Origin present but no allowlist configured — flag as warning
    issues.push({
      type: 'no-origin-allowlist',
      severity: 'medium',
      description:
        'Origin header present but no allowlist configured; cannot validate origin',
      evidence: `Origin: ${requestOrigin.slice(0, 128)}, allowedOrigins: not configured`,
    });
  }

  // 5. Check for suspicious origin patterns (null origin from sandboxed iframes)
  if (requestOrigin && requestOrigin.toLowerCase() === 'null') {
    issues.push({
      type: 'origin-bypass',
      severity: 'high',
      description:
        'Origin is "null" (sandboxed iframe or redirect); potential bypass',
      evidence: `Origin: ${requestOrigin}`,
    });
  }

  // 6. Check for frame injection via Sec-WebSocket-Protocol
  const wsProtocol = normalizedHeaders['sec-websocket-protocol'];
  if (wsProtocol && /[\r\n<>]/.test(wsProtocol)) {
    issues.push({
      type: 'frame-injection',
      severity: 'critical',
      description:
        'Sec-WebSocket-Protocol contains injection characters',
      evidence: `Sec-WebSocket-Protocol: ${wsProtocol.slice(0, 128)}`,
    });
  }

  // 7. Check Sec-WebSocket-Version
  const wsVersion = normalizedHeaders['sec-websocket-version'];
  if (wsVersion && wsVersion !== '13') {
    issues.push({
      type: 'upgrade-abuse',
      severity: 'medium',
      description: 'Non-standard Sec-WebSocket-Version (expected 13)',
      evidence: `Sec-WebSocket-Version: ${wsVersion.slice(0, 16)}`,
    });
  }

  const hasCritical = issues.some((i) => i.severity === 'critical');
  return { secure: !hasCritical, issues };
}

// --- Message Integrity (HMAC) ---

/**
 * Signs an MCP message using HMAC-SHA256.
 * Returns the hex-encoded signature.
 */
export function signMCPMessage(message: string, secret: string): string {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Secret must be a string of at least ${MIN_SECRET_LENGTH} characters`
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} bytes`
    );
  }

  return createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verifies an MCP message signature using timing-safe comparison.
 * Uses HMAC to normalize both values to fixed-length digests before comparison,
 * preventing length-leaking timing attacks.
 */
export function verifyMCPMessage(
  message: string,
  signature: string,
  secret: string
): MessageIntegrityResult {
  if (typeof message !== 'string' || typeof secret !== 'string') {
    return {
      valid: false,
      signaturePresent: false,
      signatureValid: false,
      tampered: true,
    };
  }

  if (!signature || typeof signature !== 'string') {
    return {
      valid: false,
      signaturePresent: false,
      signatureValid: false,
      tampered: true,
    };
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    return {
      valid: false,
      signaturePresent: true,
      signatureValid: false,
      tampered: true,
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      signaturePresent: true,
      signatureValid: false,
      tampered: true,
    };
  }

  // Validate signature format (hex-encoded SHA-256 = 64 hex chars)
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return {
      valid: false,
      signaturePresent: true,
      signatureValid: false,
      tampered: true,
    };
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Use timing-safe comparison on fixed-length hex strings
  // Both are HMAC-SHA256 hex digests (64 chars), so same length guaranteed
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const providedBuf = Buffer.from(signature.toLowerCase(), 'hex');

  const isValid = timingSafeEqual(expectedBuf, providedBuf);

  return {
    valid: isValid,
    signaturePresent: true,
    signatureValid: isValid,
    tampered: !isValid,
  };
}

// --- TLS Certificate Validation ---

/**
 * Validates TLS configuration for MCP endpoints.
 * Checks protocol version, cipher strength, certificate validity,
 * and hostname matching.
 */
export function validateTLSConfig(config: {
  url: string;
  protocol?: string;
  cipher?: string;
  certExpiry?: Date;
  certIssuer?: string;
  certSubject?: string;
  selfSigned?: boolean;
}): TLSValidationResult {
  const issues: TLSIssue[] = [];

  // 1. Check URL scheme
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.url);
  } catch {
    return {
      secure: false,
      issues: [
        {
          type: 'no-tls',
          severity: 'critical',
          description: 'Invalid URL provided for TLS validation',
          evidence: `URL: ${String(config.url).slice(0, 128)}`,
        },
      ],
    };
  }

  if (parsedUrl.protocol === 'http:') {
    issues.push({
      type: 'no-tls',
      severity: 'critical',
      description: 'MCP endpoint uses HTTP instead of HTTPS',
      evidence: `URL: ${parsedUrl.origin}`,
    });
  }

  // 2. Check TLS protocol version
  if (config.protocol) {
    if (WEAK_TLS_PROTOCOLS.has(config.protocol)) {
      issues.push({
        type: 'weak-protocol',
        severity: 'critical',
        description: `Weak TLS protocol: ${config.protocol}`,
        evidence: `Protocol: ${config.protocol}`,
      });
    }
  }

  // 3. Check cipher suite
  if (config.cipher) {
    const cipherUpper = config.cipher.toUpperCase();
    for (const weak of WEAK_CIPHER_PATTERNS) {
      if (cipherUpper.includes(weak)) {
        issues.push({
          type: 'weak-cipher',
          severity: 'high',
          description: `Weak cipher suite detected (contains ${weak})`,
          evidence: `Cipher: ${config.cipher.slice(0, 128)}`,
        });
        break;
      }
    }
  }

  // 4. Check certificate expiry
  if (config.certExpiry) {
    const now = new Date();
    if (config.certExpiry < now) {
      issues.push({
        type: 'expired-cert',
        severity: 'critical',
        description: 'TLS certificate has expired',
        evidence: `Expiry: ${config.certExpiry.toISOString()}`,
      });
    } else {
      // Warn if expiring within 30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (config.certExpiry.getTime() - now.getTime() < thirtyDays) {
        issues.push({
          type: 'expired-cert',
          severity: 'medium',
          description: 'TLS certificate expires within 30 days',
          evidence: `Expiry: ${config.certExpiry.toISOString()}`,
        });
      }
    }
  }

  // 5. Check self-signed
  if (config.selfSigned) {
    issues.push({
      type: 'self-signed',
      severity: 'high',
      description:
        'TLS certificate is self-signed (no trusted CA chain)',
      evidence: `Issuer: ${config.certIssuer?.slice(0, 128) ?? 'unknown'}`,
    });
  }

  // 6. Check hostname mismatch
  if (config.certSubject) {
    const hostname = parsedUrl.hostname;
    const subject = config.certSubject.toLowerCase();
    const hostLower = hostname.toLowerCase();

    // Simple check: subject should match hostname or be a valid wildcard
    const subjectMatches =
      subject === hostLower ||
      (subject.startsWith('*.') &&
        hostLower.endsWith(subject.slice(1)) &&
        !hostLower.slice(0, hostLower.length - subject.length + 1).includes(
          '.'
        ));

    if (!subjectMatches) {
      issues.push({
        type: 'hostname-mismatch',
        severity: 'critical',
        description: 'TLS certificate subject does not match endpoint hostname',
        evidence: `Hostname: ${hostname}, Subject: ${config.certSubject.slice(0, 128)}`,
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === 'critical');
  return { secure: !hasCritical, issues };
}

// --- Full Security Assessment ---

/**
 * Runs all transport security checks and compiles a unified report.
 */
export function assessTransportSecurity(config: {
  sseStream?: string;
  sseContentType?: string;
  wsHeaders?: Record<string, string>;
  origin?: string;
  allowedOrigins?: string[];
  mcpMessage?: string;
  mcpSignature?: string;
  hmacSecret?: string;
  tlsUrl?: string;
  tlsProtocol?: string;
  tlsCipher?: string;
  tlsCertExpiry?: Date;
  tlsCertIssuer?: string;
  tlsCertSubject?: string;
  tlsSelfSigned?: boolean;
}): TransportSecurityReport {
  // SSE validation
  const sseResult: SSEValidationResult = config.sseStream
    ? validateSSEStream(config.sseStream)
    : { valid: true, issues: [] };

  // Append Content-Type check if provided
  if (config.sseContentType !== undefined || config.sseStream) {
    const ctIssue = validateSSEContentType(config.sseContentType);
    if (ctIssue) {
      (sseResult.issues as SSEIssue[]).push(ctIssue);
      // Re-evaluate validity
      if (ctIssue.severity === 'critical') {
        (sseResult as { valid: boolean }).valid = false;
      }
    }
  }

  // WebSocket validation
  const wsResult: WebSocketSecurityResult = config.wsHeaders
    ? validateWebSocketSecurity(
        config.wsHeaders,
        config.origin,
        config.allowedOrigins
      )
    : { secure: true, issues: [] };

  // Message integrity
  let integrityResult: MessageIntegrityResult;
  if (config.mcpMessage && config.hmacSecret) {
    integrityResult = config.mcpSignature
      ? verifyMCPMessage(config.mcpMessage, config.mcpSignature, config.hmacSecret)
      : {
          valid: false,
          signaturePresent: false,
          signatureValid: false,
          tampered: true,
        };
  } else {
    integrityResult = {
      valid: true,
      signaturePresent: false,
      signatureValid: false,
      tampered: false,
    };
  }

  // TLS validation
  const tlsResult: TLSValidationResult = config.tlsUrl
    ? validateTLSConfig({
        url: config.tlsUrl,
        protocol: config.tlsProtocol,
        cipher: config.tlsCipher,
        certExpiry: config.tlsCertExpiry,
        certIssuer: config.tlsCertIssuer,
        certSubject: config.tlsCertSubject,
        selfSigned: config.tlsSelfSigned,
      })
    : { secure: true, issues: [] };

  const overallSecure =
    sseResult.valid &&
    wsResult.secure &&
    integrityResult.valid &&
    tlsResult.secure;

  return {
    sse: sseResult,
    websocket: wsResult,
    integrity: integrityResult,
    tls: tlsResult,
    overallSecure,
    timestamp: new Date().toISOString(),
  };
}
