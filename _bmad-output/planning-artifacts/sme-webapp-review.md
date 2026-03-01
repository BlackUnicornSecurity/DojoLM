# BU-TPI Web Application Security Assessment

**Document ID:** SME-WEB-2026-02-28-001
**Reviewer:** Weaver (Web Application Security Specialist, BMAD Cybersec Team)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Web Application Security (OWASP Top 10 Focus)
**Date:** 2026-02-28

---

## Executive Summary

This report provides a comprehensive web application security assessment of the BU-TPI (DojoLM) platform, focusing on OWASP Top 10 (2021) vulnerabilities, API security, CORS/CSP configurations, input validation patterns, session management, and secure coding practices.

### Overall Security Posture: **HIGH CONCERN**

| Category | Status | Priority | SM Agreement |
|----------|--------|----------|--------------|
| A01: Broken Access Control | CRITICAL | P0 | Agreed |
| A02: Cryptographic Failures | CRITICAL | P0 | Agreed |
| A03: Injection | MEDIUM | P1 | Partial Coverage |
| A04: Insecure Design | HIGH | P1 | Needs Review |
| A05: Security Misconfiguration | HIGH | P1 | Agreed |
| A06: Vulnerable Components | MEDIUM | P2 | Agreed |
| A07: Auth Failures | CRITICAL | P0 | Agreed |
| A08: Data Integrity Failures | MEDIUM | P2 | Partial Coverage |
| A09: Logging/Monitoring | HIGH | P1 | Agreed |
| A10: Server-Side Request Forgery | MEDIUM | P2 | Not Evaluated |

### Key Security Strengths

1. **Good Input Validation**: API routes implement basic input validation with size limits
2. **React XSS Protection**: Framework-based rendering prevents most XSS vectors
3. **Binary Parser Hardening**: DoS protections implemented in metadata parsers
4. **Type Safety**: TypeScript usage reduces many injection risks
5. **Some Security Headers**: X-Content-Type-Options, X-Frame-Options configured

### Critical Security Gaps

1. **No Authentication/Authorization**: Complete absence of access control
2. **Plaintext API Key Storage**: Secrets stored without encryption
3. **Overly Permissive CORS**: Wildcard origin allows cross-site attacks
4. **Missing CSP Headers**: No Content-Security-Policy implementation
5. **No Session Management**: Untracked user sessions
6. **Detailed Error Messages**: Information disclosure via stack traces

---

## OWASP Top 10 (2021) Analysis

### A01:2021 - Broken Access Control [CRITICAL]

**Finding:** CRITICAL - No access control mechanisms implemented

**Evidence:**

```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/app/api/llm/models/route.ts:21-48
export async function GET(request: NextRequest) {
  try {
    // NO AUTHENTICATION CHECK
    let models = await fileStorage.getModelConfigs();
    return NextResponse.json(models); // Returns API keys in plaintext
  }
}
```

All 17 API endpoints lack authentication checks:
- `/api/llm/models` - Exposes all model configurations including API keys
- `/api/llm/execute` - Allows unauthorized LLM API usage
- `/api/llm/batch` - Enables resource exhaustion attacks
- `/api/llm/results` - Exposes all test execution data
- `/api/scan` - Public scanning service

**Impact:**
- Unauthorized LLM API key exposure
- Financial liability from leaked API quota
- Unauthorized access to test infrastructure
- Data exfiltration of all test results

**Recommendations per Epic:**

**Epic 1 (Authentication & Authorization):**
1. Implement authentication middleware before any production deployment
2. Add JWT session tokens with short expiry (15 minutes)
3. Implement RBAC with roles: Admin, Operator, Viewer, Auditor
4. Secure all API endpoints with `requireAuth()` wrapper

**Code Pattern Required:**
```typescript
// Create: packages/dojolm-web/src/lib/middleware/auth.ts
export async function requireAuth(request: NextRequest): Promise<Session | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

// Apply to all routes:
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... route logic
}
```

---

### A02:2021 - Cryptographic Failures [CRITICAL]

**Finding:** CRITICAL - API keys stored in plaintext

**Evidence:**

```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts:159-180
async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
  const configs = await this.getModelConfigs();
  const updatedConfig: LLMModelConfig = {
    ...config,
    apiKey,  // <- STORED IN PLAINTEXT
  };
  await writeJSON(PATHS.models, configs);  // <- PLAINTEXT JSON
}
```

**Impact:**
- API keys exposed in `/data/llm-results/models.json`
- Credentials leaked in backups
- Violation of PCI-DSS, SOC 2, and GDPR requirements
- Potential unauthorized billing on LLM services

**Recommendations per Epic:**

**Epic 2 (Secrets Management):**
1. Implement AES-256-GCM encryption for API keys at rest
2. Use environment-specific encryption keys
3. Never return full API keys in GET responses (return only last 4 chars)
4. Implement key rotation mechanism

**Code Pattern Required:**
```typescript
// Create: packages/dojolm-web/src/lib/secrets/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

### A03:2021 - Injection [MEDIUM]

**Finding:** PARTIAL MITIGATION - Some protections exist, gaps remain

**Protections in Place:**

1. **TypeScript Type Safety** - Reduces injection risks
2. **React XSS Protection** - Automatic escaping of JSX content
3. **Input Size Limits** - 100KB max on scan endpoint

**Evidence of Good Practice:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/app/api/scan/route.ts:28-35
const MAX_SIZE = 100_000;
if (text.length > MAX_SIZE) {
  return NextResponse.json(
    { error: `Input too large: maximum ${MAX_SIZE} characters allowed` },
    { status: 413 }
  );
}
```

**Remaining Gaps:**

1. **No SQL Injection Protection** (if database added later)
2. **No Command Injection Validation** on baseUrl parameters
3. **Template Injection Risk** - No sanitization of user-provided prompts
4. **LDAP Injection Risk** - Not applicable currently

**Evidence of Risk:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/providers/openai.ts:86
const response = await fetch(`${baseUrl}/chat/completions`, {
  // baseUrl is user-controlled, could be malicious
});
```

**Recommendations per Epic:**

**Epic 7 (Input Validation):**
1. Implement Zod schemas for all API inputs
2. Add URL validation for baseUrl parameters
3. Sanitize prompt content before display
4. Implement allowlist for permitted domains

**Code Pattern Required:**
```typescript
// Create: packages/dojolm-web/src/lib/validation/schemas.ts
import { z } from 'zod';

export const modelConfigSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  provider: z.enum(['openai', 'anthropic', 'ollama', ...]),
  model: z.string().min(1).max(100),
  baseUrl: z.string().url().optional().superRefine((val, ctx) => {
    if (val) {
      const url = new URL(val);
      // Block internal IPs
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Internal URLs not allowed',
        });
      }
    }
  }),
});
```

---

### A04:2021 - Insecure Design [HIGH]

**Finding:** HIGH - Missing security-by-design principles

**Issues Identified:**

1. **No Threat Model** - No documented threat analysis
2. **No Security Architecture** - Ad-hoc security implementation
3. **No Rate Limiting Design** - Memory-based limits lost on restart
4. **No Fail-Safe Design** - Errors expose details

**Evidence:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts:77
const rateLimits = new Map<string, { count: number; resetAt: number }>();
// Lost on server restart - allows rate limit bypass
```

**Recommendations:**

1. **Create Threat Model** documenting:
   - Asset inventory (API keys, test results, models)
   - Threat actors (external attackers, insiders)
   - Attack surfaces (API, web UI, file uploads)
   - Security controls per component

2. **Implement Persistent Rate Limiting** using Redis or database

3. **Design for Failure**:
   - Generic error messages
   - Safe defaults (deny all, then allow)
   - Graceful degradation

---

### A05:2021 - Security Misconfiguration [HIGH]

**Finding:** HIGH - Multiple security configuration issues

**1. Wildcard CORS Configuration**

**Evidence:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts:108
res.setHeader('Access-Control-Allow-Origin', '*');  // <- WILDCARD
```

**Impact:** Any website can make requests to the API, enabling CSRF attacks.

**2. Missing Content-Security-Policy**

**Evidence:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/next.config.ts:48-72
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        // NO CSP HEADER
      ],
    },
  ];
}
```

**Impact:** No protection against XSS, clickjacking (partial), or data injection.

**3. Detailed Error Messages**

**Evidence:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/app/api/llm/models/route.ts:105-109
return NextResponse.json(
  { error: 'Failed to create model', message: error instanceof Error ? error.message : String(error) },
  // ^^^ Exposes internal error details
  { status: 500 }
);
```

**Recommendations per Epic:**

**Epic 4 (API Security Hardening):**

**1. CORS Configuration:**
```typescript
// Create allowlist of allowed origins
const ALLOWED_ORIGINS = [
  'https://dojolm.example.com',
  'https://admin.example.com',
];

function getCorsOrigin(origin: string): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

// In headers:
res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(request.headers.get('origin')) || 'null');
```

**2. CSP Implementation:**
```typescript
// Update next.config.ts headers:
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Required for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ')
}
```

**3. Generic Error Messages:**
```typescript
// Create error handler that logs details, returns generic message
function handleError(error: unknown): NextResponse {
  console.error('Detailed error:', error);  // Server-side only
  return NextResponse.json(
    { error: 'An error occurred. Please try again.' },
    { status: 500 }
  );
}
```

---

### A06:2021 - Vulnerable/Outdated Components [MEDIUM]

**Finding:** MEDIUM - Some outdated dependencies

**Dependencies Status:**

| Package | Current | Latest | Security Issues |
|---------|---------|--------|-----------------|
| React | 19.2.3 | 19.x | No known CVEs |
| Next.js | 16.1.6 | Latest | Check advisories |
| TypeScript | 5.7.3 | Latest | No known CVEs |
| exifr | 7.1.3 | Latest | Monitor for updates |

**Recommendations:**

1. Run `npm audit` weekly in CI/CD
2. Automate dependency updates with Dependabot
3. Generate SBOM for supply chain transparency
4. Monitor security advisories for all dependencies

**Epic 6 (Dependency Security):**
- Implement automated security scanning
- Create SBOM using CycloneDX format
- Set up vulnerability alerting

---

### A07:2021 - Identification and Authentication Failures [CRITICAL]

**Finding:** CRITICAL - No authentication implemented

**Evidence:** See A01 (Broken Access Control) above

**Additional Gaps:**

1. **No Password Policy** - (if username/password auth added)
2. **No Multi-Factor Authentication** - Recommended for admin access
3. **No Session Timeout** - Sessions never expire
4. **No Concurrent Session Limits** - Unlimited sessions per user
5. **No Account Lockout** - Brute force protection missing

**Recommendations:**

**Epic 1.4 (Secure Session Management):**
- Implement 15-minute session timeout
- Add refresh token rotation
- Limit concurrent sessions (3 per user)
- Implement progressive delays on failed auth

---

### A08:2021 - Software and Data Integrity Failures [MEDIUM]

**Finding:** PARTIAL - Some protections, gaps remain

**Protections in Place:**

1. **Content Hashing** - SHA-256 for deduplication
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts:127-129
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
```

2. **Atomic File Writes** - Prevents corruption
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts:108-110
const tmpPath = `${filePath}.tmp`;
await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
await fs.rename(tmpPath, filePath);
```

**Missing Protections:**

1. **No Digital Signatures** - Results can be tampered
2. **No Audit Trail** - Changes not logged
3. **No Immutable Logs** - Logs can be modified
4. **No Code Signing** - No verification of deployment integrity

**Recommendations:**

**Epic 5 (Logging and Audit Trail):**
- Implement write-once audit logs
- Add digital signatures for critical records
- Create immutable log storage
- Implement tamper-evidence indicators

---

### A09:2021 - Security Logging and Monitoring Failures [HIGH]

**Finding:** HIGH - Minimal logging implementation

**Current State:**

```typescript
// Only basic console.error logging
console.error('Error executing test:', error);
```

**Missing:**

1. **No Structured Logging** - Difficult to parse and analyze
2. **No Audit Trail** - Security events not tracked
3. **No Alerting** - No real-time threat detection
4. **No Log Aggregation** - Logs scattered across components
5. **No Retention Policy** - Logs may be deleted prematurely

**Events That Should Be Logged:**

| Event Type | Examples | Priority |
|------------|----------|----------|
| Authentication | Login attempts, failures, token refresh | HIGH |
| Authorization | Permission denials, privilege escalation | HIGH |
| Configuration | Model changes, API key operations | HIGH |
| Data Access | Bulk exports, sensitive data queries | MEDIUM |
| System | Errors, crashes, resource exhaustion | MEDIUM |

**Recommendations:**

**Epic 5.2 (Implement Audit Logging):**

```typescript
// Create: packages/dojolm-web/src/lib/logging/audit.ts
export interface AuditEvent {
  timestamp: string;
  eventType: 'auth' | 'config' | 'data' | 'system';
  userId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const logPath = join(AUDIT_LOG_DIR, `${event.timestamp.slice(0, 10)}.jsonl`);
  const signedEvent = {
    ...event,
    signature: signEvent(event), // HMAC for integrity
  };
  await fs.appendFile(logPath, JSON.stringify(signedEvent) + '\n');
}
```

---

### A10:2021 - Server-Side Request Forgery (SSRF) [MEDIUM]

**Finding:** MEDIUM - Potential SSRF through baseUrl parameter

**Evidence:**

```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/providers/openai.ts:86-88
const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
const response = await fetch(`${baseUrl}/chat/completions`, {
  // baseUrl is user-controlled
```

**Attack Vectors:**

1. **Internal Network Scanning:**
   - `baseUrl: http://169.254.169.254/latest/meta-data/` (AWS metadata)
   - `baseUrl: http://localhost:8080/internal-admin`

2. **Cloud Metadata Access:**
   - GCP: `http://metadata.google.internal/computeMetadata/v1/`
   - Azure: `http://169.254.169.254/metadata/`
   - AWS: `http://169.254.169.254/latest/meta-data/`

**Recommendations:**

1. **Implement URL Allowlist:**
```typescript
const ALLOWED_BASE_URLS = [
  'https://api.openai.com',
  'https://api.anthropic.com',
  'http://localhost:11434',  // Ollama
];

function validateBaseUrl(baseUrl: string): boolean {
  const url = new URL(baseUrl);
  return ALLOWED_BASE_URLS.some(allowed =>
    url.hostname === new URL(allowed).hostname
  );
}
```

2. **Block Private IP Ranges:**
```typescript
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80::/,
  /^fc00:/,
];
```

---

## API Security Recommendations

### REST API Security

**Current State:**

| Endpoint | Auth | Input Validation | Rate Limit | Error Handling |
|----------|------|------------------|------------|----------------|
| GET /api/llm/models | No | Basic | Memory-only | Detailed |
| POST /api/llm/models | No | Basic | Memory-only | Detailed |
| POST /api/llm/execute | No | Basic | Memory-only | Detailed |
| POST /api/llm/batch | No | Basic | Memory-only | Detailed |
| GET /api/llm/results | No | Basic | Memory-only | Detailed |
| POST /api/scan | No | Good | Memory-only | Good |
| GET /api/fixtures | No | N/A | Memory-only | Good |

**Recommendations:**

1. **Implement API Gateway Pattern:**
   - Centralized authentication
   - Unified request validation
   - Consistent rate limiting
   - Standardized error responses

2. **Add API Versioning:**
   ```
   /api/v1/llm/models
   /api/v2/llm/models
   ```

3. **Implement Request Signing:**
   - HMAC signatures for sensitive operations
   - Timestamp validation to prevent replay attacks

4. **Add OpenAPI/Swagger Documentation:**
   - Document all endpoints
   - Include security schemes
   - Generate client SDKs

---

## Frontend Security Hardening

### React/Next.js Security

**Strengths:**
- React's automatic XSS escaping
- No use of `dangerouslySetInnerHTML` found
- No `eval()` or `innerHTML` usage detected

**Gaps:**

1. **Missing HTTP Security Headers:**
```typescript
// Required additions to next.config.ts:
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
},
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
},
{
  key: "Permissions-Policy",
  value: "geolocation=(), microphone=(), camera=()"
}
```

2. **No Subresource Integrity (SRI)**
   - Add SRI hashes for CDN resources

3. **No Referrer Policy**
   - Current: `origin-when-cross-origin` (acceptable)
   - Recommended: `strict-origin-when-cross-origin`

### Client-Side Data Handling

**Risk:** Sensitive data in browser memory

**Findings:**
```typescript
// File: /Users/paultinp/BU-TPI/packages/dojolm-web/src/components/llm/ModelForm.tsx:42
const [formData, setFormData] = useState({
  apiKey: model?.apiKey || '',  // Stored in React state
});
```

**Recommendations:**
1. Never store API keys in client-side state
2. Use secure session storage only
3. Implement auto-clear on idle
4. Add inactivity timeout (5 minutes)

---

## Session Management

### Current State: **NOT IMPLEMENTED**

**Required Implementation:**

**1. Session Configuration:**
```typescript
export interface SessionConfig {
  timeout: number;        // 15 minutes
  refreshThreshold: number; // 5 minutes
  maxConcurrent: number;  // 3 sessions
  refreshTokenExpiry: number; // 7 days
}
```

**2. Session Storage:**
- Use HttpOnly, Secure, SameSite cookies
- Store session ID server-side (Redis/database)
- Never store sensitive data in cookies

**3. Session Lifecycle:**
```
Login -> Create Session -> Issue Token
   |
Activity -> Refresh Token -> Extend Expiry
   |
Timeout -> Invalidate -> Require Re-auth
```

---

## Error Handling and Information Disclosure

### Current Issues

**Verbose Error Messages:**
```typescript
// EXPOSES INTERNAL DETAILS
{ error: 'Failed to create model', message: error.message }
```

**Recommended Pattern:**
```typescript
// Create error classes
export class ApplicationError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public userMessage: string,
    public internalDetails?: string
  ) {
    super(message);
  }
}

// In error handler:
function handleError(error: unknown): NextResponse {
  if (error instanceof ApplicationError) {
    logger.error(error.internalDetails || error.message);
    return NextResponse.json(
      { error: error.userMessage },
      { status: error.statusCode }
    );
  }
  // Generic error for unexpected issues
  logger.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}
```

---

## Secure Coding Recommendations per Epic

### Epic 1: Authentication & Authorization

**Priority:** P0 - CRITICAL

**Implementation Steps:**

1. **Week 1:** Design auth architecture
   - Choose: NextAuth.js vs custom JWT
   - Define: Role hierarchy and permissions
   - Document: Authentication flows

2. **Week 2:** Implement authentication
   - JWT middleware creation
   - Login/logout endpoints
   - Token refresh mechanism

3. **Week 3:** Implement authorization
   - RBAC permission matrix
   - Authorization decorators
   - Permission checks per endpoint

4. **Week 4:** Testing and hardening
   - Auth test suite
   - Penetration testing
   - Security review

**File Changes:**
- Create: `src/lib/middleware/auth.ts`
- Create: `src/lib/middleware/rbac.ts`
- Create: `src/lib/auth/jwt.ts`
- Create: `src/lib/auth/permissions.ts`
- Modify: All API routes in `src/app/api/`

---

### Epic 2: Secrets Management

**Priority:** P0 - CRITICAL

**Implementation Steps:**

1. **Week 1:** Encryption implementation
   - AES-256-GCM wrapper
   - Key management strategy
   - Migration script for existing data

2. **Week 2:** Secrets integration
   - Vault integration (HashiCorp/AWS)
   - Environment-based config
   - Secret rotation procedure

3. **Week 3:** API key protection
   - Never return full keys
   - Mask in logs
   - Audit key access

**File Changes:**
- Create: `src/lib/secrets/encryption.ts`
- Create: `src/lib/secrets/vault.ts`
- Create: `src/lib/secrets/provider.ts`
- Modify: `src/lib/storage/file-storage.ts`
- Modify: `src/app/api/llm/models/route.ts`

---

### Epic 3: Binary File Security

**Priority:** P1 - HIGH

**Current Protections (Good):**
- Size limits (50MB max)
- Decompression bomb protection
- Timeout enforcement
- Parser-specific safeguards

**Additional Recommendations:**

1. **File Type Validation:**
```typescript
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
]);

function validateFileType(buffer: Buffer, filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  const magic = buffer.subarray(0, 4);
  // Verify magic bytes match extension
  return MAGIC_SIGNATURES[ext.toUpperCase()] &&
         magic.equals(Buffer.from(MAGIC_SIGNATURES[ext.toUpperCase()]));
}
```

2. **Sandboxed Parsing:**
- Run parsers in worker threads
- Limit memory per parser
- Implement process isolation

---

### Epic 4: API Security Hardening

**Priority:** P1 - HIGH

**Implementation Checklist:**

- [ ] Restrict CORS to specific origins
- [ ] Implement CSP headers
- [ ] Add request validation schemas (Zod)
- [ ] Generic error messages
- [ ] Persistent rate limiting (Redis)
- [ ] API request signing
- [ ] OpenAPI documentation

**CORS Configuration:**
```typescript
const CORS_CONFIG = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
```

---

### Epic 5: Logging & Audit Trail

**Priority:** P1 - HIGH

**Log Schema:**
```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  eventType: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
  signature: string; // HMAC for integrity
}
```

**Retention Policy:**
- INFO logs: 30 days
- WARN logs: 90 days
- ERROR/CRITICAL logs: 365 days
- Audit logs: 7 years (compliance)

---

### Epic 6: Dependency Security

**Priority:** P2 - MEDIUM

**Implementation:**

1. **Automated Scanning:**
```yaml
# .github/dependabot.yml
version: 2
dependabot:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

2. **SBOM Generation:**
```bash
npm install -g @cyclonedx/cyclonedx-npm
cyclonedx-npm --output-format json --output-file sbom.json
```

3. **CI/CD Integration:**
```yaml
- name: Run npm audit
  run: npm audit --audit-level=high

- name: Generate SBOM
  run: cyclonedx-npm --output sbom.json
```

---

### Epic 7: Input Validation

**Priority:** P1 - HIGH

**Zod Schema Examples:**
```typescript
import { z } from 'zod';

// Model configuration
export const modelConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  provider: z.enum(LLM_PROVIDERS),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(20).max(200).optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
});

// Test case
export const testCaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  prompt: z.string().min(1).max(10000),
  expectedBehavior: z.string().min(1).max(1000),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  enabled: z.boolean().default(true),
});
```

---

### Epic 8: Testing Coverage

**Priority:** P2 - MEDIUM

**Security Test Suite:**
```typescript
describe('API Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await fetch('/api/llm/models');
      expect(response.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      const token = generateExpiredToken();
      const response = await fetch('/api/llm/models', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should reject oversized payloads', async () => {
      const largeText = 'a'.repeat(100001);
      const response = await fetch('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ text: largeText })
      });
      expect(response.status).toBe(413);
    });

    it('should reject malicious URLs in baseUrl', async () => {
      const response = await createModel({
        baseUrl: 'http://169.254.169.254/metadata'
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const promises = Array(121).fill(null).map(() =>
        fetch('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ text: 'test' })
        })
      );
      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Web Security Testing Recommendations

### Automated Testing

**Tools to Integrate:**

1. **OWASP ZAP** - DAST scanning
   ```bash
   zap-baseline.py -t http://localhost:3000 -r zap-report.html
   ```

2. **Nuclei** - Vulnerability scanning
   ```bash
   nuclei -u http://localhost:3000 -s critical,high,medium
   ```

3. **Semgrep** - SAST scanning
   ```bash
   semgrep --config auto --severity ERROR --json
   ```

4. **npm audit** - Dependency scanning
   ```bash
   npm audit --audit-level=moderate --json
   ```

### Penetration Testing Checklist

**Authentication/Authorization:**
- [ ] Test public route access without auth
- [ ] Test JWT token manipulation
- [ ] Test session hijacking
- [ ] Test privilege escalation
- [ ] Test rate limit bypass

**Input Validation:**
- [ ] SQL injection payloads
- [ ] XSS payloads in all inputs
- [ ] SSRF via baseUrl parameter
- [ ] Command injection attempts
- [ ] Path traversal tests

**API Security:**
- [ ] Mass assignment attempts
- [ ] Parameter tampering
- [ ] CORS exploitation
- [ ] CSRF token validation
- [ ] API endpoint enumeration

**Data Security:**
- [ ] Sensitive data exposure
- [ ] API key leakage
- [ ] Test result access control
- [ ] Backup file access

---

## Summary of Critical Findings

| ID | Finding | Severity | Epic | Priority |
|----|---------|----------|------|----------|
| WEB-001 | No Authentication | CRITICAL | Epic 1 | P0 |
| WEB-002 | Plaintext API Keys | CRITICAL | Epic 2 | P0 |
| WEB-003 | Wildcard CORS | HIGH | Epic 4 | P1 |
| WEB-004 | Missing CSP | HIGH | Epic 4 | P1 |
| WEB-005 | Verbose Error Messages | MEDIUM | Epic 4 | P1 |
| WEB-006 | No Audit Logging | HIGH | Epic 5 | P1 |
| WEB-007 | SSRF via baseUrl | MEDIUM | Epic 4 | P1 |
| WEB-008 | Memory-based Rate Limiting | MEDIUM | Epic 4 | P1 |
| WEB-009 | No Session Management | CRITICAL | Epic 1 | P0 |
| WEB-010 | Missing HSTS Header | MEDIUM | Epic 4 | P2 |

---

## Immediate Actions Required

**Before ANY Production Deployment:**

1. **Implement Authentication** (Epic 1)
   - Create `requireAuth()` middleware
   - Apply to all API routes
   - Test authentication flows

2. **Encrypt API Keys** (Epic 2)
   - Implement AES-256-GCM encryption
   - Migrate existing plaintext keys
   - Never return full keys in API responses

3. **Restrict CORS** (Epic 4)
   - Remove wildcard `*`
   - Implement origin allowlist
   - Test cross-origin requests

4. **Add Basic Audit Logging** (Epic 5)
   - Log auth attempts (success/failure)
   - Log configuration changes
   - Log sensitive operations

---

## Compliance Considerations

**SOC 2 Requirements:**
- Access control monitoring
- Change management logging
- Data encryption at rest
- Incident response procedures

**GDPR Requirements:**
- Data minimization
- Right to erasure
- Data portability
- Breach notification

**PCI-DSS (if processing payments):**
- Strong cryptography
- Secure authentication
- Logging and monitoring
- Regular testing

---

## Recommendations Summary

### Short-term (1-2 Sprints)
1. Implement authentication middleware
2. Encrypt all secrets at rest
3. Restrict CORS configuration
4. Add CSP headers
5. Implement generic error handling

### Medium-term (3-4 Sprints)
6. Implement RBAC system
7. Add persistent rate limiting
8. Implement audit logging
9. Add SSRF protection
10. Create security test suite

### Long-term (5-6 Sprints)
11. Integrate secrets manager
12. Implement session management
13. Add security monitoring/alerting
14. Conduct penetration testing
15. Document security architecture

---

## SME Feedback on SM Plan

### Agreed Items (High Priority)

The SM correctly identified the following critical issues:
1. **No Authentication/Authorization** (P0) - Confirmed CRITICAL
2. **Plaintext Secrets Storage** (P0) - Confirmed CRITICAL
3. **Wildcard CORS** (P1) - Confirmed HIGH risk
4. **Memory-based Rate Limiting** (P1) - Confirmed issue
5. **Missing Audit Logging** (P1) - Confirmed gap

### Additional Findings

The following security issues were identified during this review:

1. **Missing CSP Headers** - Not in SM plan but HIGH priority
2. **SSRF via baseUrl** - New finding, MEDIUM priority
3. **No Session Management** - Covered in Epic 1 but needs emphasis
4. **Detailed Error Messages** - Partially covered but needs generic message pattern

### SM Plan Recommendations

**Strengths:**
- Comprehensive epic breakdown
- Good prioritization (P0/P1/P2)
- Clear acceptance criteria per story

**Gaps to Address:**
1. Add CSP implementation to Epic 4
2. Add SSRF protection to Epic 4
3. Expand Epic 1.4 with specific session timeout values
4. Add security header audit to Epic 9

---

## Conclusion

The BU-TPI web application has significant security vulnerabilities that must be addressed before production deployment. The most critical issues are the complete absence of authentication and the plaintext storage of API keys.

The SM's plan provides a solid foundation, but this review identifies additional security gaps, particularly around CSP implementation and SSRF protection.

**Recommendation:** Do NOT deploy to production without addressing all P0 findings and implementing authentication with proper session management.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-28
**Next Review:** After Epic 1 and Epic 2 completion

**Reviewed By:** Weaver (Web Application Security Specialist, BMAD Cybersec Team)
**Approved By:** [Pending]

---

## Appendix: Security Testing Commands

```bash
# Run dependency audit
npm audit --audit-level=moderate

# OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Run security-focused tests
npm test -- --testNamePattern="security|auth"

# Check for hardcoded secrets
git log --all --full-history --source -- "**/models.json"

# Scan for common vulnerabilities
semgrep --config auto --severity ERROR src/
```

---

**END OF DOCUMENT**
