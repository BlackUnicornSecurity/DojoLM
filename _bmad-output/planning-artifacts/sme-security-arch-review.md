# Security Architecture Assessment - BU-TPI (DojoLM)

**Document ID:** SME-SEC-ARCH-2026-02-28-001
**Reviewer:** Bastion (Security Architect, BMAD Cybersec Team)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Security Architecture Assessment
**Date:** 2026-02-28
**Reference:** SM-REV-2026-02-28-001 (Initial Technical Review)

---

## Executive Summary

The BU-TPI (DojoLM) platform is a sophisticated LLM security testing framework with excellent domain-specific detection capabilities. However, from a security architecture perspective, the platform exhibits significant gaps in foundational security controls that would prevent safe production deployment.

**Overall Security Maturity:** **FOUNDATIONAL - CRITICAL GAPS EXIST**

| Architecture Domain | Current State | Risk Level | Priority |
|---------------------|---------------|------------|----------|
| Authentication | Not Implemented | CRITICAL | P0 |
| Authorization | Not Implemented | CRITICAL | P0 |
| Cryptographic Protections | Minimal (hashing only) | HIGH | P0 |
| Zero-Trust Network Segmentation | Not Applicable (monolith) | MEDIUM | P1 |
| Input Validation | Good (binary parsers) | LOW | P2 |
| Secrets Management | Plaintext file storage | CRITICAL | P0 |
| Audit & Logging | Minimal | HIGH | P1 |
| API Security | Basic headers only | HIGH | P1 |

**Key Finding:** The platform has strong domain security (prompt injection detection) but weak infrastructure security. This creates an asymmetric risk profile where the testing tool itself could become a target.

---

## Part 1: STRIDE Threat Modeling

### Threat Model Summary

| Threat Category | Likelihood | Impact | Mitigation Status |
|-----------------|------------|--------|-------------------|
| **S**poofing | HIGH | CRITICAL | No authentication implemented |
| **T**ampering | MEDIUM | HIGH | No integrity controls on data |
| **R**epudiation | HIGH | MEDIUM | No audit logging |
| **I**nformation Disclosure | MEDIUM | HIGH | Secrets in plaintext, wildcard CORS |
| **D**enial of Service | LOW | MEDIUM | Basic rate limiting (memory-based) |
| **E**levation of Privilege | HIGH | CRITICAL | No authorization framework |

### Detailed STRIDE Analysis

#### S - Spoofing (Identity Threats)

**Threat Scenarios:**
1. Unauthorized users accessing the platform as any user (no authentication)
2. API endpoint abuse through anonymous access
3. Model configuration impersonation
4. Test case result manipulation

**Current Mitigations:** NONE

**Attack Surface:**
```
/api/llm/models        - CRUD on LLM configs (includes API keys)
/api/llm/execute       - Execute tests (consume API quota)
/api/llm/batch         - Batch execution (potential DoS)
/api/scan              - Text scanning
/api/scan-fixture      - Binary file scanning
```

**Recommendations:**
- Implement authentication before any production deployment
- Consider API gateway integration for centralized auth
- Implement mutual TLS for service-to-service communication

---

#### T - Tampering (Data Integrity Threats)

**Threat Scenarios:**
1. Modification of test results in file storage
2. Injection of malicious test cases
3. Manipulation of model configurations
4. Tampering with fixture files

**Current Mitigations:** LIMITED
- Content hashing for deduplication (SHA-256 in file-storage.ts:127-129)
- File write atomicity (tmp file + rename in file-storage.ts:108-110)

**Attack Surface:**
```typescript
// Location: /packages/dojolm-web/src/lib/storage/file-storage.ts
// Current: No signature verification, no HMAC on sensitive data
// Vulnerability: Files can be modified without detection
```

**Recommendations:**
- Implement HMAC signing for all test execution results
- Add digital signatures for model configurations
- Consider append-only log for audit trail integrity
- Implement WORM (Write Once Read Many) storage for completed tests

---

#### R - Repudiation (Non-Repudiation Threats)

**Threat Scenarios:**
1. Users denying execution of costly tests
2. Denial of API key usage
3. Disputes over test results authenticity
4. Lack of forensic evidence for incidents

**Current Mitigations:** NONE
- No user attribution in execution records
- No audit log for security-relevant events
- No non-repudiation mechanisms

**Missing Audit Events:**
```
WHO (user_id)     WHAT (action)           WHEN (timestamp)     RESULT
-------------------------------------------------------------------------
unknown          create_model_config     2026-02-28T...       success
unknown          execute_test            2026-02-28T...       success
unknown          delete_test_results     2026-02-28T...       success
unknown          export_all_data         2026-02-28T...       success
```

**Recommendations:**
- Implement immutable audit log (append-only)
- Sign audit entries with private key
- Include user identity in all execution records
- Implement SIEM integration for alerting

---

#### I - Information Disclosure (Data Privacy Threats)

**Threat Scenarios:**
1. API key exposure through model listing endpoint
2. CORS misconfiguration enabling data exfiltration
3. Error messages leaking implementation details
4. Test prompt/response data exposure

**Current Mitigations:** PARTIAL
- Security headers present (X-Content-Type-Options, X-Frame-Options)
- CSP on fixture routes
- BUT: Wildcard CORS (`Access-Control-Allow-Origin: *`)
- BUT: API keys in plaintext storage
- BUT: Detailed error messages to client

**Critical Code Locations:**

```typescript
// Location: /packages/bu-tpi/src/serve.ts:108
// SEVERITY: HIGH
res.setHeader('Access-Control-Allow-Origin', '*');  // WILDCARD
```

```typescript
// Location: /packages/dojolm-web/src/app/api/llm/models/route.ts:29
// SEVERITY: CRITICAL - Returns API keys to all users
return NextResponse.json(models);  // Includes apiKey field
```

```typescript
// Location: /packages/dojolm-web/src/lib/storage/file-storage.ts:159-180
// SEVERITY: CRITICAL - API keys stored in plaintext
const updatedConfig: LLMModelConfig = {
  ...config,
  apiKey,  // <- PLAINTEXT
};
await writeJSON(PATHS.models, configs);  // <- PLAINTEXT JSON
```

**Recommendations:**
- P0: Remove API keys from model listing endpoint
- P0: Implement API key encryption at rest
- P0: Restrict CORS to specific origins
- P1: Implement generic error messages
- P1: Add data classification and handling policies

---

#### D - Denial of Service (Availability Threats)

**Threat Scenarios:**
1. Large file upload attacks (mitigated)
2. Resource exhaustion through batch execution
3. Decompression bomb attacks (mitigated)
4. Parser DoS through malicious files

**Current Mitigations:** GOOD
- File size limits (50MB for binary files in serve.ts:344)
- Decompression bomb protection (MAX_DECOMPRESSED_SIZE: 10MB)
- Rate limiting (120 req/min per IP, memory-based)
- Timeout enforcement (5000ms for binary parsing)
- Iteration limits (MAX_GIF_ITERATIONS: 100,000)
- SVG size limits (MAX_SVG_SIZE: 10MB)

**Residual Risks:**
```
Location: /packages/bu-tpi/src/serve.ts:77-90
// Issue: Rate limiting is memory-based, lost on restart
const rateLimits = new Map<string, { count: number; resetAt: number }>();

Location: /packages/dojolm-web/src/lib/llm-execution.ts:235
// Issue: Batch execution has CONCURRENT_LIMIT=5, but no per-user quota
```

**Recommendations:**
- P1: Implement persistent rate limiting (Redis/database)
- P1: Add per-user resource quotas
- P2: Implement circuit breaker for LLM provider calls
- P2: Add request queuing with priority levels

---

#### E - Elevation of Privilege (Authorization Threats)

**Threat Scenarios:**
1. Anonymous users accessing admin functions
2. Unauthorized model configuration changes
3. Privilege escalation through missing RBAC
4. Cross-tenant data access (if multi-tenant)

**Current Mitigations:** NONE
- No role-based access control
- No permission framework
- No separation of duties

**Attack Surface:**
```
All endpoints are equally accessible to all users:
- Model CRUD (includes API key management)
- Test execution (resource consumption)
- Batch operations (potential DoS)
- Data export (data exfiltration)
- Result deletion (data destruction)
```

**Recommendations:**
- P0: Implement RBAC before production deployment
- P0: Define permission matrix for all operations
- P1: Implement principle of least privilege
- P1: Add admin/operator/viewer role separation

---

## Part 2: Security Control Recommendations by Epic

### Epic 1: Authentication Architecture

**Recommendation: Implement OAuth2/OIDC with SAML Fallback**

Given the cybersecurity tooling nature of DojoLM, the recommended authentication approach:

#### Primary Recommendation: Next-Auth.js with Enterprise Providers

```typescript
// Recommended Architecture
// File: packages/dojolm-web/src/lib/auth/config.ts

import { NextAuthOptions } from 'next-auth';
import { Auth0Provider, AzureADProvider } from 'next-auth/providers';

export const authConfig: NextAuthOptions = {
  providers: [
    // Primary: SSO integration
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      issuer: process.env.AUTH0_ISSUER,
    }),
    // Fallback for enterprise environments
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    // Map enterprise groups to roles
    async jwt({ token, account }) {
      if (account) {
        const groups = account?.groups || [];
        token.roles = mapGroupsToRoles(groups);
      }
      return token;
    },
  },
};
```

#### Alternative: API Key + JWT for Service Accounts

```typescript
// For programmatic access and CI/CD integration
// File: packages/dojolm-web/src/lib/auth/api-keys.ts

import { sign, verify } from 'jsonwebtoken';
import { createHash, timingSafeEqual } from 'crypto';

export class ApiKeyAuth {
  // Hash-based API key storage
  private static hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  // Generate API key: dojolm_pk_<random>
  static generateApiKey(): string {
    const prefix = 'dojolm_pk_';
    const random = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${random}`;
  }

  // Validate API key and return JWT
  static async validateKey(key: string): Promise<string | null> {
    const hashed = this.hashApiKey(key);
    const stored = await db.apiKeys.findFirst({ where: { hashedKey: hashed } });

    if (!stored || !stored.enabled) return null;

    // Return JWT with user's roles
    return sign({
      sub: stored.userId,
      roles: stored.roles,
      type: 'api_key',
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
}
```

#### Authentication Flow Diagram

```
                     +-------------------+
                     |   User Browser    |
                     +-------------------+
                              |
                              v
                     +-------------------+
                     |   NextAuth.js     |
                     |   (/api/auth/*)   |
                     +-------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+----------------+  +----------------+  +----------------+
|   Auth0/OIDC   |  |   Azure AD     |  |   API Keys    |
|   (Primary)    |  |   (Enterprise) |  |   (Service)   |
+----------------+  +----------------+  +----------------+
        |                     |                     |
        +---------------------+---------------------+
                              |
                              v
                     +-------------------+
                     |   JWT Token       |
                     |   (Session)       |
                     +-------------------+
```

**Implementation Priority:**

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Next-Auth.js integration, Auth0/OIDC provider | 2 weeks |
| Phase 2 | Session middleware, route protection | 1 week |
| Phase 3 | API key authentication, JWT validation | 1 week |
| Phase 4 | MFA support, session management | 2 weeks |

---

### Epic 2: Authorization Patterns (RBAC)

**Recommendation: Attribute-Based Access Control (ABAC) Implementation**

#### Recommended RBAC Model

```typescript
// File: packages/dojolm-web/src/lib/auth/rbac.ts

/**
 * Permission definitions for DojoLM
 * Follows principle of least privilege
 */
export enum Permission {
  // Model Management
  MODEL_VIEW = 'model:view',
  MODEL_CREATE = 'model:create',
  MODEL_UPDATE = 'model:update',
  MODEL_DELETE = 'model:delete',
  MODEL_USE = 'model:use',

  // Test Execution
  TEST_EXECUTE = 'test:execute',
  TEST_BATCH = 'test:batch',
  TEST_VIEW_RESULTS = 'test:view_results',
  TEST_DELETE_RESULTS = 'test:delete_results',

  // Test Case Management
  TESTCASE_VIEW = 'testcase:view',
  TESTCASE_CREATE = 'testcase:create',
  TESTCASE_UPDATE = 'testcase:update',
  TESTCASE_DELETE = 'testcase:delete',

  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT = 'system:audit',
  SYSTEM_EXPORT = 'system:export',
  SYSTEM_CONFIG = 'system:config',
}

/**
 * Role definitions with permission sets
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Viewer: Read-only access
  viewer: [
    Permission.MODEL_VIEW,
    Permission.TESTCASE_VIEW,
    Permission.TEST_VIEW_RESULTS,
  ],

  // Operator: Can execute tests, manage test cases
  operator: [
    ...ROLE_PERMISSIONS.viewer,
    Permission.MODEL_USE,
    Permission.TEST_EXECUTE,
    Permission.TEST_BATCH,
    Permission.TESTCASE_CREATE,
    Permission.TESTCASE_UPDATE,
  ],

  // Admin: Full access except audit
  admin: [
    ...ROLE_PERMISSIONS.operator,
    Permission.MODEL_CREATE,
    Permission.MODEL_UPDATE,
    Permission.MODEL_DELETE,
    Permission.TEST_DELETE_RESULTS,
    Permission.TESTCASE_DELETE,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_EXPORT,
  ],

  // Auditor: Read-only access to all data including audit logs
  auditor: [
    Permission.SYSTEM_AUDIT,
    Permission.MODEL_VIEW,
    Permission.TEST_VIEW_RESULTS,
    Permission.TESTCASE_VIEW,
  ],
};

/**
 * Resource-based access control
 * Extendable for multi-tenancy
 */
export interface ResourceContext {
  resourceType: 'model' | 'test_case' | 'execution' | 'batch';
  resourceId?: string;
  ownerId?: string;
  tags?: Record<string, string>;
}

/**
 * Authorization checker function
 * Use in API route handlers
 */
export function authorize(
  user: User,
  permission: Permission,
  context?: ResourceContext
): boolean {
  // Check role-based permissions
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];

  if (!userPermissions.includes(permission)) {
    return false;
  }

  // Check resource ownership (if applicable)
  if (context?.ownerId && user.role !== 'admin') {
    return context.ownerId === user.id;
  }

  return true;
}

/**
 * API route middleware wrapper
 */
export function withAuth(permission: Permission) {
  return async (request: NextRequest) => {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authorize(session.user, permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Proceed to handler
  };
}
```

#### Permission Matrix

| Operation | Viewer | Operator | Admin | Auditor |
|-----------|--------|----------|-------|---------|
| View models | X | X | X | X |
| Create models | | | X | |
| Update models | | | X | |
| Delete models | | | X | |
| Use models (execute tests) | | X | X | |
| Create test cases | | X | X | |
| Execute tests | | X | X | |
| View results | X | X | X | X |
| Delete results | | | X | |
| Export data | | | X | |
| View audit logs | | | | X |
| System configuration | | | X | |

**Implementation Priority:**

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Permission model, role definitions | 1 week |
| Phase 2 | Authorization middleware, route protection | 1 week |
| Phase 3 | Resource ownership, multi-tenancy support | 2 weeks |

---

### Epic 3: Zero-Trust Network Segmentation

**Current State:** Not applicable (monolithic deployment)

**Recommendation: Service Segmentation for Future Architecture**

#### Recommended Network Architecture

```
                              Internet
                                 |
                          [WAF/DDoS Protection]
                                 |
                    +-----------------------------+
                    |      API Gateway / CDN      |
                    |    (TLS Termination)         |
                    +-----------------------------+
                                 |
                    +-----------------------------+
                    |   Authentication Service    |
                    |   (OAuth2/OIDC Provider)    |
                    +-----------------------------+
                                 |
        +------------------------+------------------------+
        |                        |                        |
+----------------+    +----------------+    +----------------+
|  Web Frontend  |    |   API Service  |    |  Scanner Service|
|  (Next.js)     |    |   (Next.js)    |    |  (Node.js)      |
|  Port: 3000    |    |  Port: 3001    |    |  Port: 8089     |
+----------------+    +----------------+    +----------------+
        |                        |                        |
        +------------------------+------------------------+
                                 |
                    +-----------------------------+
                    |     Database Layer          |
                    |   (PostgreSQL + Redis)      |
                    +-----------------------------+
```

#### Network Security Controls

**1. Service-to-Service Authentication:**
```typescript
// File: packages/dojolm-web/src/lib/auth/mtls.ts

import { createSecureServer } from 'http';
import { Server } from 'socket.io';

export function createServiceServer(options: {
  cert: string;
  key: string;
  ca: string;
  requireClientCert: boolean;
}) {
  return createSecureServer({
    cert: fs.readFileSync(options.cert),
    key: fs.readFileSync(options.key),
    ca: options.ca ? fs.readFileSync(options.ca) : undefined,
    requestCert: options.requireClientCert,
    rejectUnauthorized: true,
  });
}
```

**2. API Gateway Integration:**
```yaml
# File: infrastructure/kong.yml
# Example Kong configuration for DojoLM

services:
  - name: dojolm-api
    url: http://dojolm-api:3001
    routes:
      - name: api-routes
        paths:
          - /api
    plugins:
      # JWT authentication
      - name: jwt
      # Rate limiting per user
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
      # Request size limits
      - name: request-size-limiting
        config:
          allowed_payload_size: 50
```

**3. Security Zones:**
```
Zone 0 (DMZ):
  - Load balancer / API Gateway
  - Static content delivery
  - External authentication callbacks

Zone 1 (Application):
  - Web frontend (Next.js)
  - API service
  - Scanner service

Zone 2 (Data):
  - PostgreSQL database
  - Redis cache
  - File storage (encrypted)

Zone 3 (Admin):
  - Admin console
  - Audit log viewer
  - Backup systems
```

**Implementation Priority:**

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Network architecture design | 1 week |
| Phase 2 | API gateway integration | 2 weeks |
| Phase 3 | mTLS for service-to-service | 2 weeks |

---

### Epic 4: Cryptographic Implementations

**Current State:** Minimal (SHA-256 hashing for deduplication only)

**Recommendations:**

#### 4.1 API Key Encryption at Rest

```typescript
// File: packages/dojolm-web/src/lib/crypto/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encryption service for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly TAG_LENGTH = 16;

  constructor(private readonly masterKey: Buffer) {
    if (masterKey.length !== this.KEY_LENGTH) {
      throw new Error('Master key must be 32 bytes');
    }
  }

  /**
   * Encrypt sensitive data (e.g., API keys)
   * Returns base64-encoded ciphertext with IV and auth tag
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, this.masterKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();

    // Format: iv (16) + tag (16) + ciphertext (variable)
    const combined = Buffer.concat([iv, tag, ciphertext]);
    return combined.toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertextB64: string): string {
    const combined = Buffer.from(ciphertextB64, 'base64');

    const iv = combined.subarray(0, this.IV_LENGTH);
    const tag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
    const ciphertext = combined.subarray(this.IV_LENGTH + this.TAG_LENGTH);

    const decipher = createDecipheriv(this.ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    return plaintext.toString('utf8');
  }

  /**
   * Hash API key for storage comparison
   * Uses scrypt for key derivation (one-way)
   */
  hashApiKey(apiKey: string): string {
    const salt = randomBytes(this.SALT_LENGTH);
    const derivedKey = scryptSync(
      apiKey,
      salt,
      this.KEY_LENGTH
    );
    return Buffer.concat([salt, derivedKey]).toString('base64');
  }

  /**
   * Verify API key against stored hash
   */
  verifyApiKey(apiKey: string, storedHash: string): boolean {
    const combined = Buffer.from(storedHash, 'base64');
    const salt = combined.subarray(0, this.SALT_LENGTH);
    const storedKey = combined.subarray(this.SALT_LENGTH);

    const derivedKey = scryptSync(apiKey, salt, this.KEY_LENGTH);
    return timingSafeEqual(storedKey, derivedKey);
  }
}

// Singleton instance with master key from environment
export const encryptionService = new EncryptionService(
  Buffer.from(process.env.ENCRYPTION_MASTER_KEY || '', 'base64')
);
```

#### 4.2 Digital Signatures for Audit Trail

```typescript
// File: packages/dojolm-web/src/lib/crypto/signatures.ts

import { createSign, createVerify } from 'crypto';

/**
 * Digital signature service for audit trail integrity
 */
export class SignatureService {
  constructor(
    private readonly privateKey: string,
    private readonly publicKey: string
  ) {}

  /**
   * Sign an audit entry
   */
  sign(entry: AuditEntry): string {
    const payload = JSON.stringify({
      ...entry,
      signature: undefined, // Exclude signature from payload
    });

    const signer = createSign('SHA256');
    signer.update(payload);
    signer.end();

    return signer.sign(this.privateKey, 'base64');
  }

  /**
   * Verify an audit entry signature
   */
  verify(entry: AuditEntry): boolean {
    const payload = JSON.stringify({
      ...entry,
      signature: undefined,
    });

    const verifier = createVerify('SHA256');
    verifier.update(payload);
    verifier.end();

    return verifier.verify(this.publicKey, entry.signature, 'base64');
  }
}
```

#### 4.3 Master Key Management

```typescript
// File: packages/dojolm-web/src/lib/crypto/key-management.ts

/**
 * Key management strategies
 */

// Option 1: Environment Variable (Development)
export const getMasterKeyFromEnv = (): Buffer => {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY not set');
  }
  return Buffer.from(key, 'base64');
};

// Option 2: AWS KMS (Production)
export const getMasterKeyFromKMS = async (): Promise<Buffer> => {
  const { KMSClient, DecryptCommand } = require('@aws-sdk/client-kms');
  const client = new KMSClient({ region: process.env.AWS_REGION });

  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(process.env.ENCRYPTED_MASTER_KEY, 'base64'),
  });

  const response = await client.send(command);
  return response.Plaintext;
};

// Option 3: Azure Key Vault (Production)
export const getMasterKeyFromAzure = async (): Promise<Buffer> => {
  const { SecretClient } = require('@azure/keyvault-secrets');
  const { DefaultAzureCredential } = require('@azure/identity');

  const client = new SecretClient(
    process.env.AZURE_KEYVAULT_URL,
    new DefaultAzureCredential()
  );

  const secret = await client.getSecret('encryption-master-key');
  return Buffer.from(secret.value, 'base64');
};
```

**Implementation Priority:**

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Encryption service, API key encryption | 1 week |
| Phase 2 | KMS integration, key rotation | 1 week |
| Phase 3 | Digital signatures for audit | 1 week |

---

### Epic 5: Defense-in-Depth Strategy

**Recommendation: Layered Security Controls**

#### Defense-in-Depth Architecture

```
Layer 1: Network Security
├── WAF/DDoS protection
├── Rate limiting (per-IP, per-user)
├── IP allowlisting (admin access)
└── Geo-fencing (optional)

Layer 2: Authentication & Authorization
├── MFA for admin access
├── OAuth2/OIDC integration
├── RBAC with least privilege
├── Session timeout & revocation
└── API key rotation

Layer 3: Application Security
├── Input validation & sanitization
├── Output encoding (XSS prevention)
├── CSRF tokens
├── Security headers (CSP, HSTS, etc.)
└── Dependency scanning (SBOM)

Layer 4: Data Security
├── Encryption at rest (AES-256-GCM)
├── Encryption in transit (TLS 1.3)
├── Field-level encryption (API keys)
├── Data retention policies
└── Secure backup & recovery

Layer 5: Audit & Monitoring
├── Immutable audit logs
├── SIEM integration
├── Anomaly detection
├── Alerting & incident response
└── Security metrics & reporting
```

#### Security Control Catalog

| Control Category | Control | Implementation Status | Priority |
|------------------|---------|----------------------|----------|
| Preventive | Authentication | Not Implemented | P0 |
| Preventive | Authorization | Not Implemented | P0 |
| Preventive | Input Validation | Partial | P1 |
| Preventive | Encryption at Rest | Not Implemented | P0 |
| Preventive | Rate Limiting | Memory-based only | P1 |
| Detective | Audit Logging | Minimal | P1 |
| Detective | Monitoring | Not Implemented | P2 |
| Detective | Anomaly Detection | Not Implemented | P2 |
| Corrective | Backup/Recovery | Not Implemented | P2 |
| Corrective | Incident Response | Not Documented | P2 |

#### Security Monitoring Recommendations

```typescript
// File: packages/dojolm-web/src/lib/monitoring/security-events.ts

/**
 * Security event types for monitoring
 */
export enum SecurityEventType {
  // Authentication events
  AUTH_SUCCESS = 'auth.success',
  AUTH_FAILURE = 'auth.failure',
  MFA_CHALLENGE = 'auth.mfa.challenge',
  SESSION_REVOKED = 'auth.session.revoked',

  // Authorization events
  ACCESS_DENIED = 'authz.denied',
  PRIVILEGE_ESCALATION = 'authz.escalation',

  // Data events
  SENSITIVE_DATA_ACCESS = 'data.sensitive.access',
  DATA_EXPORT = 'data.export',
  DATA_DELETION = 'data.deletion',

  // Resource events
  API_KEY_CREATED = 'resource.api_key.created',
  MODEL_CONFIG_CHANGED = 'resource.model.changed',
  BATCH_EXECUTION = 'resource.batch.executed',

  // Anomaly events
  RATE_LIMIT_EXCEEDED = 'anomaly.rate_limit',
  UNUSUAL_ACCESS_PATTERN = 'anomaly.access_pattern',
  LARGE_BATCH_REQUEST = 'anomaly.large_batch',
}

/**
 * Security event emitter
 */
export class SecurityEventLogger {
  constructor(private siemClient?: SiemClient) {}

  log(event: SecurityEvent): void {
    // Add timestamp and correlation ID
    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      correlation_id: this.generateCorrelationId(),
      hostname: os.hostname(),
      environment: process.env.NODE_ENV,
    };

    // Log to console (development)
    console.log(`[SECURITY] ${JSON.stringify(enrichedEvent)}`);

    // Send to SIEM (production)
    if (this.siemClient) {
      this.siemClient.send(enrichedEvent);
    }

    // Check for alert conditions
    this.checkAlerts(enrichedEvent);
  }

  private checkAlerts(event: SecurityEvent): void {
    // Trigger alerts for critical events
    if (event.type === SecurityEventType.ACCESS_DENIED) {
      if (event.count > 10) {
        this.sendAlert('Multiple access denied attempts', event);
      }
    }

    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      this.sendAlert('Rate limit exceeded', event);
    }
  }
}
```

---

## Part 3: Prioritized Security Roadmap

### Phase 1: Foundation (4-6 weeks) - P0 Items

**Goal:** Establish baseline security controls for safe development

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1-2 | Authentication Implementation | Next-Auth.js integration, OAuth2/OIDC providers |
| 1-2 | Session Management | Secure cookies, session timeout, revocation |
| 3-4 | Authorization Framework | RBAC model, permission middleware |
| 3-4 | API Key Encryption | Encryption service, key management |
| 5-6 | Secrets Management | KMS integration, secret rotation |
| 5-6 | Audit Logging | Event schema, log storage, query API |

**Exit Criteria:**
- All API endpoints require authentication
- API keys encrypted at rest
- Audit log captures security events
- Basic RBAC implemented

---

### Phase 2: Hardening (3-4 weeks) - P1 Items

**Goal:** Strengthen security posture

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1-2 | API Security | CORS restrictions, request validation, error handling |
| 1-2 | Rate Limiting | Persistent rate limiting (Redis), per-user quotas |
| 3 | Input Validation | Comprehensive validation framework |
| 3 | CSP Implementation | Content Security Policy for all routes |
| 4 | Security Monitoring | SIEM integration, alerting rules |

**Exit Criteria:**
- Wildcard CORS removed
- Persistent rate limiting
- Comprehensive input validation
- Security monitoring operational

---

### Phase 3: Advanced (4-5 weeks) - P2 Items

**Goal:** Defense-in-depth and compliance

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1-2 | Digital Signatures | Audit log signing, result verification |
| 1-2 | Network Segmentation | Service isolation, mTLS |
| 3 | Data Protection | Data classification, retention policies |
| 3 | Backup & Recovery | Secure backup, disaster recovery |
| 4-5 | Compliance Documentation | SOC 2 mapping, security policies |

**Exit Criteria:**
- Audit logs cryptographically signed
- Service-to-service mTLS
| Backup and recovery tested |
| Compliance documentation complete |

---

## Part 4: Architecture-Specific Recommendations

### Storage Architecture

**Current State:** File-based JSON storage with atomic writes

**Recommendations:**

1. **Short-term (Compatible with current architecture):**
   - Implement encryption wrapper for file-storage.ts
   - Add HMAC verification for all stored data
   - Implement audit log as append-only file

2. **Long-term (Migration path):**
   - Migrate to PostgreSQL for structured data
   - Use Redis for session and cache storage
   - Implement S3/GCS for encrypted file storage

```typescript
// File: packages/dojolm-web/src/lib/storage/encrypted-storage.ts

import { EncryptionService } from '../crypto/encryption';
import { FileStorage } from './file-storage';

/**
 * Encrypted storage wrapper
 * Transparently encrypts sensitive fields
 */
export class EncryptedStorage extends FileStorage {
  constructor(private encryption: EncryptionService) {
    super();
  }

  async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
    // Encrypt API key before storage
    const encrypted = {
      ...config,
      apiKey: config.apiKey
        ? this.encryption.encrypt(config.apiKey)
        : undefined,
    };

    const saved = await super.saveModelConfig(encrypted);

    // Return with apiKey decrypted for immediate use
    return {
      ...saved,
      apiKey: config.apiKey, // Original, not encrypted
    };
  }

  async getModelConfigs(): Promise<LLMModelConfig[]> {
    const configs = await super.getModelConfigs();

    // Decrypt API keys for use
    return configs.map(config => ({
      ...config,
      apiKey: config.apiKey
        ? this.encryption.decrypt(config.apiKey)
        : undefined,
    }));
  }
}
```

### Scanner Service Security

**Current State:** Standalone HTTP server on port 8089

**Recommendations:**

1. **Internal Service Mode:**
   - Bind to localhost only
   - Require mTLS from API service
   - Add JWT authentication

```typescript
// File: packages/bu-tpi/src/serve-auth.ts

import { createServer } from 'https';
import { readFileSync } from 'fs';
import { verify } from 'jsonwebtoken';

/**
 * Create authenticated scanner server
 */
export function createAuthenticatedServer(options: {
  cert: string;
  key: string;
  ca: string;
}) {
  const server = createServer({
    cert: readFileSync(options.cert),
    key: readFileSync(options.key),
    ca: readFileSync(options.ca),
    requestCert: true,
    rejectUnauthorized: true,
  }, (req, res) => {
    // Verify JWT from client certificate
    const cert = req.socket.getPeerCertificate();
    const token = cert.subject.CN; // Common Name as token

    try {
      verify(token, process.env.JWT_SECRET);
      // Process request
    } catch {
      res.writeHead(403);
      res.end('Invalid certificate');
    }
  });

  return server;
}
```

2. **Embed Mode:**
   - Import scanner directly into API service
   - Eliminate network exposure
   - Shared memory execution

### Web Application Security

**Recommendations:**

1. **Content Security Policy:**
```typescript
// File: packages/dojolm-web/src/app/layout.tsx

export const metadata: Metadata = {
  other: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // For Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.openai.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
};
```

2. **Security Headers:**
```typescript
// File: packages/dojolm-web/next.config.ts

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Part 5: Compliance Considerations

### SOC 2 Type II Mapping

| Trust Principle | Current State | Gap | Recommendation |
|----------------|---------------|-----|----------------|
| Security | Partial | High | Implement all P0 controls |
| Availability | Partial | Medium | Add DR, backup verification |
| Processing Integrity | Partial | Medium | Add result signing, audit log |
| Confidentiality | Partial | High | Encrypt data at rest |
| Privacy | Partial | Medium | Add PII handling, data retention |

### GDPR Compliance

**Current Gaps:**
- No right to erasure implementation
- No data retention policy
- No consent management
- No DPIA (Data Protection Impact Assessment)

**Recommendations:**
1. Implement data export (exists) and deletion (partial)
2. Add privacy policy and consent management
3. Implement data retention and anonymization
4. Conduct DPIA for processing activities

---

## Conclusion

The BU-TPI (DojoLM) platform demonstrates strong domain expertise in prompt injection detection and LLM security testing. However, the infrastructure security posture is currently insufficient for production deployment.

**Critical Path to Production:**
1. P0: Implement authentication and authorization (6 weeks)
2. P0: Encrypt secrets at rest (2 weeks)
3. P1: Implement audit logging (2 weeks)
4. P1: API security hardening (2 weeks)

**Total Minimum Timeline:** 12 weeks for production-ready security posture

**Risk Summary:**
- Without authentication/authorization: **CRITICAL RISK**
- Without encryption: **HIGH RISK**
- Without audit logging: **COMPLIANCE RISK**

**Recommendation:** Do not deploy to production without addressing P0 items. The current state is appropriate for development/testing environments with restricted network access only.

---

**Reviewed by:** Bastion (Security Architect, BMAD Cybersec Team)
**Approved by:** [Pending Review]
**Next Review:** After P0 implementation completion

**Related Documents:**
- SM-REV-2026-02-28-001: Initial Technical Review
- TPI-THREAT-MODEL: Detailed Threat Model (to be created)
- SEC-CONTROLS: Security Control Matrix (to be created)
