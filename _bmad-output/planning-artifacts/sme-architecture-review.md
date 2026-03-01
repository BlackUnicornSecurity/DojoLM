# BU-TPI Architecture Review - SME Assessment

**Document ID:** SME-ARCH-2026-02-28-001
**Reviewer:** Winston (System Architect, BMAD BMM Module)
**Review Of:** SM-REV-2026-02-28-001 (Initial Security Review)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Date:** 2026-02-28
**Review Scope:** Architecture, Storage, API Design, Monorepo Structure, Integration Patterns

---

## Executive Summary

The BU-TPI (DojoLM) codebase demonstrates a well-structured monorepo with clear separation of concerns. The architecture shows strength in modular design and type safety, but has significant gaps in security integration despite having relevant frameworks available in the monorepo.

### Overall Architecture Assessment: **MODERATE WITH GAPS**

| Area | Score | Status |
|------|-------|--------|
| Storage Architecture | 6/10 | Needs database migration path |
| API Design | 7/10 | Good patterns, missing middleware |
| Monorepo Structure | 8/10 | Well organized, underutilized integration |
| Technology Stack | 8/10 | Modern, appropriate choices |
| Integration Patterns | 5/10 | Framework exists but not integrated |

### Critical Architectural Observations

**Strengths:**
1. Clean storage abstraction with `IStorageBackend` interface enabling future database migration
2. Comprehensive type definitions in `llm-types.ts` with 541 lines of well-documented interfaces
3. Shared scanner package (`@dojolm/scanner`) properly separated
4. BMAD security framework (auth, RBAC, audit logging) already present in monorepo but not integrated

**Concerns:**
1. File-based storage has scalability limitations and security risks (plaintext API keys)
2. No authentication/authorization implementation despite `bmad-cybersec` providing these capabilities
3. Rate limiting is in-memory only - lost on restart
4. CORS configured with wildcard origins
5. API execution engine (`llm-execution.ts`) has no security checks before calling external LLMs

---

## 1. Storage Architecture Analysis

### Current Implementation: File-Based JSON Storage

**Location:** `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts`

**Architecture Assessment:**

| Aspect | Current State | Assessment |
|--------|--------------|------------|
| Abstraction | `IStorageBackend` interface defined | Excellent - enables migration |
| Data Format | JSON files on disk | Adequate for development, not production |
| Concurrency | File-level locking via atomic rename | Basic - may have race conditions |
| Scalability | 10,000 execution index limit | Limited - will bottleneck |
| Security | Plaintext API keys stored | Critical vulnerability |
| Query Capability | In-memory filtering | O(n) performance - poor scale |

**Storage Path Structure:**
```
data/llm-results/
├── models.json              # LLM model configs with API keys (plaintext)
├── test-cases.json          # Test case definitions
├── executions/
│   ├── index.json           # Max 10,000 entries
│   └── {execId}.json        # Individual execution records
├── batches/
│   ├── index.json
│   └── {batchId}.json
└── models/
    └── {modelId}.json       # Model execution summaries
```

### Critical Concerns

**1. API Key Storage (P0)**
```typescript
// File: packages/dojolm-web/src/lib/storage/file-storage.ts:159-180
async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
  // ...
  const updatedConfig: LLMModelConfig = {
    ...config,
    apiKey,  // <- STORED IN PLAINTEXT
  };
  await writeJSON(PATHS.models, configs);  // <- PLAINTEXT JSON
}
```

**Recommendation:** Implement encryption at rest using:
- Node.js built-in `crypto` module with AES-256-GCM
- Environment-based encryption key
- Key rotation mechanism

**2. Scalability Limits**

Current architecture has built-in limits:
- Execution index: 10,000 entries (hardcoded)
- Batch operations: Single-threaded file writes
- Query performance: O(n) on every query

**Migration Path Recommendation:**

```
Phase 1 (Immediate): Add encryption layer to FileStorage
Phase 2 (Short-term): Implement SQLiteStorage using IStorageBackend
Phase 3 (Medium-term): PostgreSQL for production deployments
```

**3. Concurrency Issues**

File-based storage uses atomic rename for writes, but:
- Multiple concurrent writes may still race
- Read-during-write consistency not guaranteed
- No transaction support for multi-file operations

### Epic-Specific Recommendations

**Epic 2 (Secrets Management):**
1. Create `EncryptedFileStorage` wrapper around `FileStorage`
2. Implement field-level encryption for `apiKey` field
3. Add key management interface for rotation

**Epic 4 (API Security):**
1. Add query result caching layer
2. Implement read-through cache with TTL
3. Add database query optimization prep (index planning)

---

## 2. API Design Patterns and Scalability

### Current API Architecture

**Framework:** Next.js 16.1.6 with App Router
**Number of Endpoints:** 17 API routes
**Pattern:** Functional route handlers (Next.js App Router convention)

### API Endpoint Inventory

| Endpoint | Method | Purpose | Security Concern |
|----------|--------|---------|------------------|
| `/api/scan` | GET/POST | Text scanning | Input size limited to 100KB |
| `/api/scan-fixture` | GET | Fixture scanning | Path traversal protection present |
| `/api/read-fixture` | GET | Read fixture | Path traversal protection present |
| `/api/fixtures` | GET | Fixture manifest | No auth required |
| `/api/stats` | GET | Scanner statistics | No auth required |
| `/api/llm/models` | GET/POST | Model CRUD | **Returns API keys** |
| `/api/llm/models/[id]` | PUT/PATCH/DELETE | Model operations | No auth required |
| `/api/llm/execute` | POST | Single test | **Calls LLM directly** |
| `/api/llm/batch` | POST | Batch execution | **No rate limiting** |
| `/api/llm/results` | GET | Query results | No auth required |
| `/api/llm/test-cases` | GET/POST | Test case CRUD | No auth required |
| `/api/llm/seed` | POST | Data seeding | No auth required |
| `/api/llm/local-models` | GET | Local models | No auth required |
| `/api/llm/coverage` | GET | Coverage report | No auth required |
| `/api/llm/reports` | GET | Report generation | No auth required |
| `/api/llm/export` | GET | Data export | **Data exfiltration risk** |
| `/api/tests` | POST | Test execution | No auth required |

### Critical API Security Gaps

**1. No Authentication Middleware (P0)**

Despite Next.js supporting middleware, no authentication wrapper exists:

```typescript
// Current: Direct export without auth check
export async function POST(request: NextRequest) {
  const body = await request.json();
  // ... directly processes request
}

// Recommended pattern (using available BMAD auth):
import { requireAuth } from '@bmad-cybersec/auth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... process request
}
```

**2. Model Config Returns API Keys (P0)**

```typescript
// File: packages/dojolm-web/src/lib/storage/file-storage.ts:149-151
async getModelConfigs(): Promise<LLMModelConfig[]> {
  const data = await readJSON<LLMModelConfig[]>(PATHS.models);
  return data || [];  // <- Returns full configs including API keys
}
```

**Recommendation:** Implement projection:
```typescript
async getModelConfigs(includeSecrets = false): Promise<LLMModelConfig[]> {
  const data = await readJSON<LLMModelConfig[]>(PATHS.models);
  if (!includeSecrets) {
    return data.map(({ apiKey, ...rest }) => rest);
  }
  return data || [];
}
```

**3. No Rate Limiting on LLM Execution (P1)**

The `/api/llm/execute` endpoint calls external LLM APIs with no rate limiting:
```typescript
// File: packages/dojolm-web/src/app/api/llm/execute/route.ts:80-83
const execution = await executeSingleTest(model, testCase);
// No rate limit check before calling external API
```

**External LLM Rate Limiter Recommendation:**
```typescript
class LLMRateLimiter {
  private perModelLimits = new Map<string, TokenBucket>();
  private globalLimit: TokenBucket;

  async checkLimit(modelId: string): Promise<boolean> {
    // Check both per-model and global limits
  }
}
```

### Scalability Concerns

**1. Batch Execution Concurrency**

```typescript
// File: packages/dojolm-web/src/lib/llm-execution.ts:235
const CONCURRENT_LIMIT = 5;  // Hardcoded limit
```

Concerns:
- Fixed limit doesn't scale with server capacity
- No backpressure mechanism
- Single server only (no distributed execution)

**2. Caching Implementation**

```typescript
// File: packages/dojolm-web/src/lib/llm-execution.ts:295-322
export async function findCachedExecution(
  modelConfigId: string,
  prompt: string
): Promise<LLMTestExecution | null> {
  const { executions } = await fileStorage.queryExecutions({
    modelConfigId,
    limit: 1000,  // <- Scans 1000 records each time
  });
  // Linear search through results
}
```

**Recommendation:** Add Redis or dedicated cache layer.

### Epic-Specific Recommendations

**Epic 1 (Authentication):**
1. Implement Next.js middleware wrapper using BMAD AuthManager
2. Add `requireAuth` decorator for API routes
3. Implement role-based route protection

**Epic 4 (API Security):**
1. Add request validation schema (Zod)
2. Implement response filtering for sensitive fields
3. Add API versioning path (`/api/v1/...`)

---

## 3. Monorepo Structure Optimization

### Current Monorepo Layout

```
/Users/paultinp/BU-TPI/
├── packages/
│   ├── bu-tpi/              # Core TPI scanner (standalone)
│   ├── dojolm-scanner/      # Shared scanner library
│   ├── dojolm-web/          # Next.js web application
│   └── bmad-cybersec/       # BMAD security framework
├── package.json             # Root workspace config
└── serve.js                 # Development server
```

### Package Dependencies Analysis

```
bu-tpi
  Zero runtime dependencies
  Pure TypeScript scanner

dojolm-scanner
  Zero dependencies
  Builds to dist/
  Imported by: dojolm-web

dojolm-web
  Depends on: @dojolm/scanner
  Next.js 16.1.6
  React 19.2.3

bmad-cybersec
  Independent framework
  Exports: auth, audit, validators, hooks
  NOT imported by dojolm-web (gap identified)
```

### Integration Gap Analysis

**Critical Finding:** BMAD security framework is NOT integrated into dojolm-web

Available but unused:
- `AuthManager` class with RBAC support
- `BMADAuditLogger` with encryption
- `RBACManager` for role-based permissions
- Audit event tracking

**Dependency Graph:**
```
Current State:
  bu-tpi (independent)
  dojolm-scanner (independent)
  dojolm-web --> @dojolm/scanner
  bmad-cybersec (independent, not used)

Recommended State:
  dojolm-web --> @dojolm/scanner
  dojolm-web --> @bmad-cybersec/auth
  dojolm-web --> @bmad-cybersec/audit
```

### Monorepo Optimization Recommendations

**1. Shared Configuration**

Create `packages/config/` for:
- TypeScript configuration
- ESLint rules
- Build scripts
- CI/CD workflows

**2. Internal Package Resolution**

Update root `package.json`:
```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces",
    "lint:all": "npm run lint --workspaces"
  }
}
```

**3. Integration Task for Epic 1**

Create integration layer:
```
packages/dojolm-web/src/lib/bmad-integration/
├── auth.ts              # BMAD AuthManager wrapper
├── audit.ts             # BMAD AuditLogger wrapper
└── middleware.ts        # Next.js middleware adapters
```

### Epic-Specific Recommendations

**Epic 1 (Authentication):**
1. Import `@bmad-cybersec/auth` in dojolm-web
2. Create Next.js middleware adapter
3. Configure AuthManager with environment variables

**Epic 5 (Audit Logging):**
1. Import `@bmad-cybersec/audit`
2. Configure BMADAuditLogger with file output
3. Add audit logging to all API routes

---

## 4. Technology Stack Assessment

### Frontend Stack

| Technology | Version | Assessment |
|------------|---------|------------|
| Next.js | 16.1.6 | Latest, good choice |
| React | 19.2.3 | Latest stable |
| TypeScript | 5.7.3 | Current, good |
| Tailwind CSS | 4.x | Latest |
| Radix UI | Multiple | Excellent choice for accessibility |

**Strengths:**
- Modern stack with latest versions
- Built-in accessibility via Radix UI
- Type safety throughout
- Good component organization

**Concerns:**
- Next.js metadata not customized (default values)
- No CSP headers configured
- No security-focused HTTP headers

### Backend/Runtime

| Technology | Version | Assessment |
|------------|---------|------------|
| Node.js | 20+ | Current LTS |
| TypeScript | 5.7.3 | Good |
| Scanner | Pure TypeScript | Excellent - zero deps |

**Scanner Architecture Strengths:**
- Zero runtime dependencies
- Pure pattern matching (139+ patterns)
- Text normalization for evasion detection
- Binary metadata parsing (EXIF, PNG, MP3, WAV)

### External Dependencies

**Security-Critical Dependencies:**

| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| exifr | 7.1.3 | EXIF extraction | Medium (file parsing) |
| music-metadata | 11.12.1 | Audio metadata | Medium (file parsing) |
| png-chunks-extract | 1.0.0 | PNG parsing | Medium (file parsing) |

**Concern:** File parsing dependencies are vulnerable to:
- Decompression bombs
- Memory exhaustion
- Parser escape bugs

### Technology Stack Recommendations

**1. Add Security Headers Middleware**

```typescript
// packages/dojolm-web/src/lib/middleware/security.ts
export function setSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  response.headers.set('Content-Security-Policy', CSP_POLICY);
}
```

**2. Configure CSP**

```typescript
// packages/dojolm-web/src/app/layout.tsx
export const metadata: Metadata = {
  title: "DojoLM - LLM Security Testing",
  description: "Red teaming platform for LLM safety testing",
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
  }
};
```

**3. Add API Versioning**

Restructure API routes:
```
/api/v1/llm/models
/api/v1/llm/execute
/api/v1/scan
```

---

## 5. Integration Patterns

### Current Integration State

**Scanner Integration:**
```
dojolm-web imports: @dojolm/scanner
Scanner provides: scan() function
Usage: Response scanning for prompt injection patterns
```

**BMAD Framework Integration:**
```
Status: NOT INTEGRATED
Available: AuthManager, RBACManager, AuditLogger
Gap: No imports, no configuration
```

### Recommended Integration Architecture

```
                  +---------------------+
                  |    dojolm-web      |
                  |                     |
                  |  +---------------+  |
                  |  | API Routes    |  |
                  |  +---------------+  |
                  |         |           |
+-----------------v---------+-----------v----------------+
|              Middleware Layer                            |
|  +----------------+  +----------------+  +-------------+|
|  | Auth Middleware|  | Audit Logger   |  | Validation  ||
|  | (BMAD)         |  | (BMAD)         |  | (Zod)       ||
|  +----------------+  +----------------+  +-------------+|
+---------------------+-------------------+---------------+
                          |                   |
              +-----------v--------+  +-------v-----------+
              | FileStorage        |  | @dojolm/scanner   |
              | (with encryption)  |  |                   |
              +--------------------+  +-------------------+
```

### Epic 1 Integration Recommendations

**Step 1: Install BMAD as dependency**

```bash
cd packages/dojolm-web
npm install ../bmad-cybersec
```

**Step 2: Create auth configuration**

```typescript
// packages/dojolm-web/src/lib/config/auth.ts
import { createAuthManager } from '@bmad-cybersec/auth';

export const authManager = createAuthManager({
  tokenExpiry: parseInt(process.env.AUTH_TOKEN_EXPIRY || '3600'),
  secretKey: process.env.AUTH_SECRET || 'CHANGE-ME',
  enableRBAC: true,
});
```

**Step 3: Create Next.js middleware wrapper**

```typescript
// packages/dojolm-web/src/lib/middleware/auth-middleware.ts
import { authManager } from '@/lib/config/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await authManager.validateAuthToken(token);
}

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    (request as any).auth = auth;
    return handler(request);
  };
}
```

**Step 4: Apply to API routes**

```typescript
// packages/dojolm-web/src/app/api/llm/execute/route.ts
import { withAuth } from '@/lib/middleware/auth-middleware';

export const POST = withAuth(async (request: NextRequest) => {
  // ... existing code
});
```

### Epic 2 (Secrets) Integration

```typescript
// packages/dojolm-web/src/lib/secrets/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-bytes-long!!', 'utf8').slice(0, 32);

export function encryptApiKey(apiKey: string): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

export function decryptApiKey(encrypted: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Epic 5 (Audit Logging) Integration

```typescript
// packages/dojolm-web/src/lib/audit/audit-logger.ts
import { createAuditLogger } from '@bmad-cybersec/audit';

export const auditLogger = createAuditLogger({
  outputPath: process.env.AUDIT_LOG_PATH || './audit-logs',
  enableEncryption: true,
  enableArchival: true,
  retentionPeriod: 90,
});

// Usage in API routes
auditLogger.logEvent({
  eventType: 'api_call',
  resource: 'llm_execute',
  action: 'execute_test',
  result: 'success',
  severity: 'low',
  metadata: { modelId, testCaseId },
  userId: authContext.userId,
});
```

---

## 6. Technical Debt Priorities

### Critical Technical Debt (P0)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| No authentication | All API routes | Critical | Medium |
| Plaintext API keys | file-storage.ts | Critical | Low |
| Wildcard CORS | serve.ts, API routes | High | Low |
| No audit logging | All endpoints | High | Medium |

### High Priority Technical Debt (P1)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| In-memory rate limiting | serve.ts | Medium | Medium |
| Error message leakage | All API routes | Medium | Low |
| No request validation | API routes | Medium | Medium |
| BMAD framework unused | Monorepo | Medium | Low |

### Medium Priority Technical Debt (P2)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| Outdated dependencies | package.json files | Low | Low |
| No API versioning | All routes | Low | Medium |
| File storage scaling | file-storage.ts | Low | High |
| No integration tests | test/ | Low | High |

---

## 7. Non-Functional Security Considerations

### Performance

**Concerns:**
1. **Query Performance:** O(n) filtering on every query
   - Impact: Will degrade with >10,000 execution records
   - Mitigation: Implement database indexing when migrating

2. **Cache Performance:** Linear scan of 1000 records for cache lookup
   - Impact: Unnecessary CPU usage
   - Mitigation: Implement HashMap-based cache

3. **Batch Execution:** Fixed concurrency limit of 5
   - Impact: Underutilizes server capacity
   - Mitigation: Dynamic limit based on CPU/memory

**Recommendations:**
```typescript
// Implement query result caching
class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>();

  get(key: string, ttl: number = 60000) {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any, ttl: number = 60000) {
    this.cache.set(key, { data, expires: Date.now() + ttl });
  }
}
```

### Reliability

**Concerns:**
1. **Single Point of Failure:** File-based storage on single server
2. **No Replication:** No backup/replication strategy
3. **Atomic Writes:** Basic atomic rename, no transaction support

**Recommendations:**
1. Implement regular backup strategy for `data/llm-results`
2. Add health check endpoint for storage system
3. Implement graceful degradation when storage fails

### Maintainability

**Strengths:**
1. Excellent type coverage with TypeScript
2. Well-documented file headers with indexes
3. Clear separation of concerns (scanner, storage, execution)

**Concerns:**
1. Duplicate code between `bu-tpi/serve.ts` and `dojolm-web` APIs
2. No shared error handling utilities
3. Limited test coverage for security scenarios

**Recommendations:**
1. Extract common API utilities to shared package
2. Implement standardized error response factory
3. Add security-focused test suite

---

## 8. Epic-Specific Architecture Recommendations

### Epic 1: Authentication and Authorization

**Architecture Approach:**
- Use existing `@bmad-cybersec/auth` module
- Implement Next.js middleware wrapper
- Add role-based access control for API routes

**Implementation Order:**
1. Configure AuthManager with environment variables
2. Create authentication middleware adapter
3. Add `requireAuth` wrapper to sensitive routes
4. Implement RBAC for admin operations

**Files to Create:**
- `packages/dojolm-web/src/lib/config/auth.ts`
- `packages/dojolm-web/src/lib/middleware/auth-middleware.ts`
- `packages/dojolm-web/src/lib/permissions/roles.ts`

### Epic 2: Secrets Management

**Architecture Approach:**
- Field-level encryption for API keys in FileStorage
- Environment-based encryption key management
- Key rotation support

**Implementation Order:**
1. Implement encryption utilities
2. Create EncryptedFileStorage wrapper
3. Migrate existing API keys to encrypted format
4. Add key rotation endpoint (admin only)

**Files to Create:**
- `packages/dojolm-web/src/lib/secrets/encryption.ts`
- `packages/dojolm-web/src/lib/secrets/key-rotation.ts`
- `packages/dojolm-web/src/lib/storage/encrypted-file-storage.ts`

### Epic 3: Binary File Processing Security

**Architecture Assessment:**
- Current DoS protections are good (size limits, timeouts)
- LIMITS constants well-defined
- Timeout enforcement in scanner-binary.ts

**Additional Recommendations:**
1. Add sandbox for parsing (worker threads)
2. Implement file quarantine system
3. Add parser-specific memory limits

**Files to Modify:**
- `packages/bu-tpi/src/metadata-parsers.ts`
- `packages/bu-tpi/src/scanner-binary.ts`

### Epic 4: API Security Hardening

**Architecture Approach:**
1. Add request validation layer (Zod)
2. Implement response filtering
3. Add rate limiting per user
4. Configure CORS properly

**Files to Create:**
- `packages/dojolm-web/src/lib/validation/schemas.ts`
- `packages/dojolm-web/src/lib/validation/middleware.ts`
- `packages/dojolm-web/src/lib/rate-limiting/user-limiter.ts`

### Epic 5: Audit Logging

**Architecture Approach:**
- Use existing `@bmad-cybersec/audit` module
- Add audit logging middleware
- Implement log rotation and archival

**Files to Create:**
- `packages/dojolm-web/src/lib/audit/audit-logger.ts`
- `packages/dojolm-web/src/lib/audit/middleware.ts`

---

## 9. Architecture Strengths Summary

1. **Excellent Type Safety:** Comprehensive TypeScript definitions with 541 lines in llm-types.ts
2. **Clean Abstractions:** IStorageBackend interface enables database migration
3. **Modular Design:** Clear separation between scanner, storage, and execution layers
4. **Zero-Dependency Scanner:** Pure TypeScript implementation is excellent for security
5. **Monorepo Benefits:** Shared scanner package, BMAD framework available
6. **Well-Documented Code:** File headers with indexes and clear purpose statements

---

## 10. Architecture Concerns Summary

1. **Security Framework Not Integrated:** BMAD auth/audit modules exist but are unused
2. **File Storage Limitations:** Scalability and security issues with current implementation
3. **No Authentication:** Complete lack of auth despite availability in monorepo
4. **API Key Exposure:** Plaintext storage of sensitive credentials
5. **CORS Misconfiguration:** Wildcard origins allow all requests
6. **Rate Limiting Issues:** In-memory only, per-IP not per-user
7. **No Audit Trail:** Comprehensive audit framework exists but not used
8. **Error Information Disclosure:** Detailed error messages exposed to clients

---

## 11. Recommended Migration Path

### Phase 1: Immediate Security Hardening (Week 1-2)

1. Integrate BMAD authentication framework
2. Implement field-level encryption for API keys
3. Fix CORS configuration
4. Add generic error responses

### Phase 2: Production Readiness (Week 3-4)

1. Implement audit logging using BMAD framework
2. Add request validation middleware
3. Implement per-user rate limiting
4. Add security headers middleware

### Phase 3: Scalability Enhancement (Month 2)

1. Implement SQLite storage backend
2. Add caching layer (Redis or in-memory)
3. Implement query optimization
4. Add API versioning

### Phase 4: Advanced Features (Month 3+)

1. Database migration to PostgreSQL
2. Distributed execution support
3. Advanced RBAC configuration
4. Compliance reporting integration

---

## Conclusion

The BU-TPI codebase demonstrates solid architectural fundamentals with excellent type safety, clean abstractions, and modular design. The primary architectural concern is not a lack of capabilities, but rather the failure to integrate existing security frameworks from the BMAD monorepo.

**Key Takeaway:** The most significant architectural improvement would be integrating the existing `@bmad-cybersec/auth` and `@bmad-cybersec/audit` modules into `dojolm-web`, which would address multiple security concerns (authentication, authorization, audit logging) with minimal development effort.

The storage abstraction via `IStorageBackend` provides a clean migration path from file-based to database storage, allowing for incremental improvement without architectural disruption.

**Recommended First Action:** Prioritize Epic 1 (Authentication) by integrating the existing BMAD auth framework, as this provides the highest security return on investment with the lowest implementation effort.

---

**Reviewed By:** Winston (System Architect, BMAD BMM Module)
**Date:** 2026-02-28
**Next Review:** After Epic 1-2 completion
**Sign-off:** Approved for implementation with noted recommendations
