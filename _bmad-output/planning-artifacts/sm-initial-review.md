# BU-TPI Security Review - Initial Assessment

**Document ID:** SM-REV-2026-02-28-001
**Reviewer:** Bob (Technical Scrum Master, BMAD BMM Module)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Brownfield Security Assessment
**Date:** 2026-02-28

---

## Executive Summary

The BU-TPI (DojoLM) codebase is a comprehensive LLM red teaming and security testing platform focused on prompt injection detection based on the CrowdStrike TPI Taxonomy. The project consists of a monorepo structure with four main packages:

1. **bu-tpi** - Core TPI Security Scanner with 139+ detection patterns
2. **dojolm-web** - Next.js web UI for testing and visualization
3. **dojolm-scanner** - Shared scanner library
4. **bmad-cybersec** - BMAD security framework integration

### Overall Security Posture: **MODERATE CONCERN**

| Category | Status | Priority |
|----------|--------|----------|
| Authentication & Authorization | ⚠️ No Implementation | P0 |
| Input Validation | ✅ Good Practices | P1 |
| Binary File Processing | ⚠️ DoS Protections Added | P1 |
| Data Protection | ⚠️ Secrets in File Storage | P0 |
| API Security | ⚠️ Rate Limiting Only | P1 |
| Dependency Management | ⚠️ Outdated Dependencies | P2 |
| Logging & Audit | ⚠️ Minimal Implementation | P1 |
| Testing Coverage | ✅ Comprehensive | P2 |

### Key Findings Summary

**Critical (P0):**
- No authentication/authorization on web UI or API endpoints
- API keys stored in plaintext in file storage
- No secrets management implementation
- CORS allows all origins (`*`)

**High (P1):**
- Binary file processing has DoS protections but needs verification
- Rate limiting is memory-based (lost on restart)
- No audit logging for sensitive operations
- Error messages may leak implementation details

**Medium (P2):**
- Dependency updates needed (typescript, next.js, react)
- No input sanitization for some user-provided content
- File path traversal protection needs consistency review

---

## Codebase Overview

### Repository Structure

```
/Users/paultinp/BU-TPI/
├── packages/
│   ├── bu-tpi/              # Core TPI Security Scanner
│   │   ├── src/
│   │   │   ├── scanner.ts           # Detection engine (139 patterns)
│   │   │   ├── serve.ts             # HTTP server (port 8089)
│   │   │   ├── scanner-binary.ts    # Binary file scanner
│   │   │   ├── metadata-parsers.ts   # EXIF/PNG/MP3/WAV parsers
│   │   │   └── types.ts             # Type definitions
│   │   ├── fixtures/                # 300+ test artifacts
│   │   └── tools/                   # Test suites
│   ├── dojolm-web/         # Next.js Web UI
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   └── api/              # API routes (17 endpoints)
│   │   │   ├── components/           # React components
│   │   │   └── lib/                  # Business logic
│   │   ├── data/llm-results/         # File-based data storage
│   │   └── package.json
│   ├── dojolm-scanner/      # Shared scanner package
│   └── bmad-cybersec/       # BMAD framework integration
├── _bmad-output/            # Review artifacts (this document)
└── package.json             # Monorepo root
```

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.7.3 |
| Frontend | React/Next.js | 19.2.3 / 16.1.6 |
| Scanner | Pure TypeScript | Zero runtime deps |
| Storage | File-based JSON | Custom implementation |
| Test Runner | Node.js built-in, Vitest | - |

### Key Dependencies

**Security-Critical Dependencies:**
- `exifr@7.1.3` - EXIF metadata extraction
- `music-metadata@11.12.1` - Audio metadata parsing
- `png-chunks-extract@1.0.0` - PNG chunk parsing
- `@anthropic-ai/sdk` (not found - potential missing dependency)

**Development Dependencies:**
- `typescript@5.7.3`
- `vitest@1.6.1`
- `tsx@4.19.2`

---

## Epics

### Epic 1: Authentication and Authorization Implementation

**Priority:** P0 - CRITICAL
**Risk Level:** HIGH
**Description:** The application currently has no authentication or authorization mechanism. All API endpoints are publicly accessible, and the web UI has no user authentication.

**Business Impact:**
- Unauthorized access to LLM testing infrastructure
- Potential abuse of resources (API tokens, compute)
- Data exposure of test results and configurations
- Compliance violations for security tooling

**Stories:**

#### Story 1.1: Design Authentication Strategy

**Acceptance Criteria:**
- Authentication mechanism selected (JWT, OAuth2, API Keys, SSO)
- Multi-factor support requirements defined
- Session management approach documented
- Password policy defined (if username/password auth)

**Review Steps:**
1. Evaluate deployment environment (on-prem vs cloud)
2. Assess integration requirements with existing SSO
3. Define user roles (admin, operator, viewer, auditor)
4. Document authentication flow diagrams

**Files to Review:**
- `/Users/paultinp/BU-TPI/packages/dojolm-web/src/app/api/**/*`
- `/Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts`

#### Story 1.2: Implement API Authentication Middleware

**Acceptance Criteria:**
- All API routes require valid authentication
- Support for multiple auth mechanisms (API key, JWT)
- Rate limiting tied to authenticated users
- Failed authentication attempts logged

**Review Steps:**
1. Review Next.js middleware capabilities
2. Design authentication wrapper for API routes
3. Implement token validation logic
4. Add authentication error handling

**Files to Create/Modify:**
- Create: `packages/dojolm-web/src/lib/middleware/auth.ts`
- Modify: All API routes in `packages/dojolm-web/src/app/api/**/route.ts`
- Modify: `packages/bu-tpi/src/serve.ts`

#### Story 1.3: Implement Role-Based Access Control (RBAC)

**Acceptance Criteria:**
- Role definitions: Admin, Operator, Viewer, Auditor
- Permission matrix documented
- Role assignment mechanism
- Authorization checks on all sensitive operations

**Review Steps:**
1. Define permission matrix for all operations
2. Design role storage mechanism
3. Implement authorization decorators/middleware
4. Test permission enforcement

**Files to Create:**
- Create: `packages/dojolm-web/src/lib/auth/rbac.ts`
- Create: `packages/dojolm-web/src/lib/auth/permissions.ts`

#### Story 1.4: Secure Session Management

**Acceptance Criteria:**
- Secure cookie configuration (HttpOnly, Secure, SameSite)
- Session timeout implementation
- Session revocation capability
- Concurrent session limits

**Review Steps:**
1. Review Next.js session handling
2. Design session storage strategy
3. Implement session lifecycle management
4. Add session monitoring

**Files to Modify:**
- `packages/dojolm-web/src/app/layout.tsx`
- `packages/dojolm-web/src/lib/auth/session.ts`

---

### Epic 2: Secrets Management and Data Protection

**Priority:** P0 - CRITICAL
**Risk Level:** HIGH
**Description:** API keys and sensitive configuration are currently stored in plaintext in the file-based storage system. This poses a significant security risk.

**Business Impact:**
- API key exposure if filesystem is compromised
- Potential unauthorized use of paid LLM APIs
- Credential leakage in backups
- Compliance violations

**Stories:**

#### Story 2.1: Implement Secrets Encryption at Rest

**Acceptance Criteria:**
- All API keys encrypted before storage
- Encryption key management strategy defined
- Secure key rotation mechanism
- HSM or KMS integration consideration

**Review Steps:**
1. Evaluate encryption libraries (Node.js built-in crypto vs external)
2. Design key storage strategy
3. Implement encryption/decryption wrapper
4. Test with various key formats

**Files to Modify:**
- `packages/dojolm-web/src/lib/storage/file-storage.ts`
- `packages/dojolm-web/src/lib/providers/openai.ts` (and other providers)

**Code Location - Current Plaintext Storage:**
```typescript
// File: packages/dojolm-web/src/lib/storage/file-storage.ts:154-180
async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
  const configs = await this.getModelConfigs();
  // ... apiKey stored in plaintext
  const updatedConfig: LLMModelConfig = {
    ...config,
    apiKey,  // <- PLAINTEXT
    // ...
  };
  await writeJSON(PATHS.models, configs);  // <- PLAINTEXT JSON
}
```

#### Story 2.2: Implement Secrets Management Integration

**Acceptance Criteria:**
- Integration with vault/secrets manager
- Environment-based configuration
- Runtime secret retrieval
- Audit logging for secret access

**Review Steps:**
1. Evaluate secrets managers (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault)
2. Design integration pattern
3. Implement secret provider interface
4. Add secret caching with TTL

**Files to Create:**
- Create: `packages/dojolm-web/src/lib/secrets/provider.ts`
- Create: `packages/dojolm-web/src/lib/secrets/vault.ts`

#### Story 2.3: Secure Environment Configuration

**Acceptance Criteria:**
- No hardcoded credentials
- Environment variable validation
- Configuration file encryption
- Secrets rotation documentation

**Review Steps:**
1. Scan codebase for hardcoded secrets
2. Review `.env.example` completeness
3. Implement config validation on startup
4. Document secret rotation procedures

**Files to Review:**
- `packages/dojolm-web/.env.example`
- All provider files in `packages/dojolm-web/src/lib/providers/`

---

### Epic 3: Binary File Processing Security

**Priority:** P1 - HIGH
**Risk Level:** MEDIUM
**Description:** Binary file parsing for metadata extraction has been hardened against DoS attacks, but needs verification and additional hardening.

**Business Impact:**
- Potential DoS through malicious files
- Memory exhaustion attacks
- Decompression bomb vulnerabilities
- Parser escape vulnerabilities

**Stories:**

#### Story 3.1: Verify DoS Protections in Binary Parsers

**Acceptance Criteria:**
- All size limits verified and tested
- Timeout enforcement verified
- Decompression bomb protection confirmed
- Resource exhaustion tests pass

**Review Steps:**
1. Review LIMITS constants in metadata-parsers.ts
2. Test with oversized files
3. Test with malformed files
4. Verify timeout enforcement

**Files to Review:**
- `packages/bu-tpi/src/metadata-parsers.ts:44-60` (LIMITS constants)
- `packages/bu-tpi/src/scanner-binary.ts:44-78` (timeout enforcement)

**Current Protections:**
```typescript
// File: packages/bu-tpi/src/metadata-parsers.ts:44-60
const LIMITS = {
  MAX_DECOMPRESSED_SIZE: 10 * 1024 * 1024,     // 10MB
  MAX_SVG_SIZE: 10 * 1024 * 1024,               // 10MB
  MAX_DATA_URIS: 100,
  MAX_EXTRACTED_TEXT: 1_000_000,                // 1MB
  MAX_METADATA_FIELDS: 1_000,
  MAX_GIF_ITERATIONS: 100_000,
  MAX_METADATA_VALUE_SIZE: 10_000,              // 10KB
} as const;
```

#### Story 3.2: Additional Parser Hardening

**Acceptance Criteria:**
- Input validation on all parser inputs
- Recursive depth limits
- Memory allocation caps
- Graceful failure modes

**Review Steps:**
1. Test edge cases in each parser
2. Add input validation wrapper
3. Implement memory monitoring
4. Add parser-specific safeguards

**Files to Modify:**
- `packages/bu-tpi/src/metadata-parsers.ts`
- Parsers for: JPEG, PNG, WebP, GIF, SVG, MP3, WAV, OGG, FLAC, M4A, WMA

#### Story 3.3: Binary File Quarantine System

**Acceptance Criteria:**
- Suspicious files quarantined
- Sandboxed parsing environment
- File type validation
- Malformed file handling

**Review Steps:**
1. Design quarantine workflow
2. Implement file type verification
3. Add suspicious pattern detection
4. Create quarantine storage

---

### Epic 4: API Security Hardening

**Priority:** P1 - HIGH
**Risk Level:** MEDIUM
**Description:** API endpoints have basic security but need hardening including proper CORS, request validation, and response security.

**Business Impact:**
- CSRF attack exposure
- Data leakage through error messages
- API abuse through rate limit bypass
- Information disclosure

**Stories:**

#### Story 4.1: CORS Configuration Review

**Acceptance Criteria:**
- CORS policy restricted to specific origins
- Credential handling configured
- Preflight caching appropriate
- Wildcard origins removed

**Review Steps:**
1. Review all CORS configurations
2. Define allowed origins list
3. Implement origin validation
4. Test CORS preflight

**Files to Review:**
- `packages/bu-tpi/src/serve.ts:104-111`
- All API routes for CORS headers

**Current Implementation (Overly Permissive):**
```typescript
// File: packages/bu-tpi/src/serve.ts:104-111
function setCommonHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');  // <- WILDCARD
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

#### Story 4.2: Request Validation Framework

**Acceptance Criteria:**
- Schema validation for all inputs
- Type coercion prevention
- SQL injection prevention (if applicable)
- Command injection prevention

**Review Steps:**
1. Audit all API endpoints for validation
2. Implement schema validation (Zod already in dependencies)
3. Add sanitization layer
4. Test with malicious payloads

**Files to Create:**
- Create: `packages/dojolm-web/src/lib/validation/schemas.ts`
- Create: `packages/dojolm-web/src/lib/validation/middleware.ts`

#### Story 4.3: Error Handling Security

**Acceptance Criteria:**
- Generic error messages to users
- Detailed errors logged only
- Stack traces never exposed
- Error code standardization

**Review Steps:**
1. Review all error responses
2. Create error response templates
3. Implement error logging
4. Test error paths

**Files to Modify:**
- All API route error handlers
- `packages/dojolm-web/src/lib/providers/errors.ts`

#### Story 4.4: Rate Limiting Enhancement

**Acceptance Criteria:**
- Persistent rate limiting (Redis/database backed)
- Per-user rate limits
- Tiered rate limits by role
- Rate limit bypass detection

**Review Steps:**
1. Evaluate rate limiting storage options
2. Design per-user rate limiting
3. Implement rate limit bypass detection
4. Add rate limit monitoring

**Current Implementation (Memory-based, Lost on Restart):**
```typescript
// File: packages/bu-tpi/src/serve.ts:77-90
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;
```

---

### Epic 5: Logging and Audit Trail

**Priority:** P1 - HIGH
**Risk Level:** MEDIUM
**Description:** The application lacks comprehensive audit logging for security-relevant events.

**Business Impact:**
- No forensic capability for incidents
- Compliance violations
- Unable to detect abuse patterns
- Troubleshooting difficulties

**Stories:**

#### Story 5.1: Design Audit Logging Schema

**Acceptance Criteria:**
- Event types defined (auth, config, execution, admin)
- Logging schema standardized
- Retention policy defined
- PII handling documented

**Review Steps:**
1. Identify all audit-worthy events
2. Design event schema
3. Define retention requirements
4. Document PII handling approach

**Events to Log:**
- Authentication attempts (success/failure)
- Authorization failures
- Configuration changes
- Model additions/changes
- Test execution starts/ends
- API key operations

#### Story 5.2: Implement Audit Logging

**Acceptance Criteria:**
- All security events logged
- Log integrity protection
- Structured log format
- Log rotation implemented

**Review Steps:**
1. Select logging library (Winston, Pino)
2. Implement logging middleware
3. Add integrity checks
4. Configure log rotation

**Files to Create:**
- Create: `packages/dojolm-web/src/lib/logging/audit.ts`
- Create: `packages/dojolm-web/src/lib/logging/formatter.ts`

#### Story 5.3: Audit Log Review Interface

**Acceptance Criteria:**
- Admin-only audit log viewer
- Filtering and search capabilities
- Export functionality
- Tamper-evidence indicators

**Review Steps:**
1. Design audit UI components
2. Implement backend query API
3. Add export functionality
4. Implement tamper detection

---

### Epic 6: Dependency and Supply Chain Security

**Priority:** P2 - MEDIUM
**Risk Level:** MEDIUM
**Description:** Dependencies need updating and supply chain security practices need improvement.

**Business Impact:**
- Known vulnerabilities in dependencies
- Potential supply chain attacks
- License compliance issues
- Maintenance burden

**Stories:**

#### Story 6.1: Dependency Audit

**Acceptance Criteria:**
- All dependencies audited
- Vulnerabilities documented
- Update plan created
- License compliance verified

**Review Steps:**
1. Run `npm audit` with fix flag
2. Review outdated packages
3. Check license compatibility
4. Create update roadmap

**Files to Review:**
- All `package.json` files in monorepo

**Prioritized Updates:**
- React 19.2.3 → Latest stable
- Next.js 16.1.6 → Latest stable
- TypeScript 5.7.3 → Latest stable

#### Story 6.2: SBOM Implementation

**Acceptance Criteria:**
- Software Bill of Materials generated
- SBOM format selected (SPDX, CycloneDX)
- Automated SBOM generation
- SBOM verification process

**Review Steps:**
1. Evaluate SBOM tools
2. Implement generation pipeline
3. Add to CI/CD
4. Document verification process

#### Story 6.3: Dependency Pinning Strategy

**Acceptance Criteria:**
- Lockfile strategy documented
- Automated dependency updates
- Security update workflow
- Vulnerability monitoring

**Review Steps:**
1. Review current lockfile practices
2. Configure Dependabot/Renovate
3. Define update workflow
4. Set up vulnerability alerts

---

### Epic 7: Input Validation and Sanitization

**Priority:** P1 - HIGH
**Risk Level:** MEDIUM
**Description:** Input validation exists but needs consistency review and additional sanitization for user-provided content.

**Business Impact:**
- XSS potential in web UI
- Injection attacks through test cases
- Data integrity issues
- UI corruption

**Stories:**

#### Story 7.1: Standardize Input Validation

**Acceptance Criteria:**
- Validation library selected (Zod)
- Common validators implemented
- Validation error standardization
- Type safety maintained

**Review Steps:**
1. Review existing validation patterns
2. Design validation framework
3. Implement common validators
4. Add validation tests

**Files to Create:**
- Create: `packages/dojolm-web/src/lib/validation/common.ts`

#### Story 7.2: XSS Prevention in Web UI

**Acceptance Criteria:**
- All user content sanitized
- CSP headers configured
- Dangerous functions avoided
- React XSS prevention verified

**Review Steps:**
1. Audit all user-controlled content rendering
2. Implement sanitization library
3. Configure CSP
4. Test XSS payloads

**Files to Review:**
- All React components in `packages/dojolm-web/src/components/`
- `packages/dojolm-web/src/app/layout.tsx`

#### Story 7.3: Test Case Content Sanitization

**Acceptance Criteria:**
- Test case prompt validation
- Special character handling
- Length limits enforced
- Malicious content detection

**Review Steps:**
1. Review test case types and validation
2. Add prompt sanitization
3. Implement content validation
4. Test with edge cases

**Files to Review:**
- `packages/dojolm-web/src/lib/llm-types.ts`

---

### Epic 8: Testing Coverage and Quality

**Priority:** P2 - MEDIUM
**Risk Level:** LOW
**Description:** Test coverage is comprehensive (7,117+ tests) but security-specific testing needs enhancement.

**Business Impact:**
- Undetected security vulnerabilities
- Regression in security fixes
- Quality assurance gaps

**Stories:**

#### Story 8.1: Security Test Suite

**Acceptance Criteria:**
- Security-focused test cases
- Authentication/authorization tests
- Input validation tests
- DoS protection tests

**Review Steps:**
1. Audit existing security tests
2. Identify gaps
3. Add security test scenarios
4. Implement automated security testing

**Files to Review:**
- All test files in `packages/bu-tpi/tools/`
- Test files in `packages/dojolm-web/src/test/`

#### Story 8.2: Penetration Testing Framework

**Acceptance Criteria:**
- Penetration test scenarios defined
- Automated penetration tests
- Security regression tests
- Reporting format standardized

**Review Steps:**
1. Design penetration test scenarios
2. Implement test automation
3. Create reporting framework
4. Schedule regular tests

#### Story 8.3: Fuzzing Integration

**Acceptance Criteria:**
- Fuzzing targets identified
- Fuzzing framework selected
- Fuzzing tests implemented
- Crash analysis process

**Review Steps:**
1. Identify fuzzing targets (parsers, API endpoints)
2. Select fuzzing tool (Jest, custom)
3. Implement fuzzing harness
4. Set up continuous fuzzing

---

### Epic 9: Documentation and Compliance

**Priority:** P2 - MEDIUM
**Risk Level:** LOW
**Description:** Security documentation needs enhancement for compliance and onboarding.

**Business Impact:**
- Compliance violations
- Onboarding difficulties
- Security knowledge gaps

**Stories:**

#### Story 9.1: Security Documentation

**Acceptance Criteria:**
- Security architecture documented
- Threat model documented
- Security controls documented
- Incident response plan created

**Review Steps:**
1. Draft threat model
2. Document security controls
3. Create incident response plan
4. Review and approve

**Files to Create:**
- Create: `docs/security-architecture.md`
- Create: `docs/threat-model.md`
- Create: `docs/incident-response.md`

#### Story 9.2: Compliance Documentation

**Acceptance Criteria:**
- SOC 2 controls mapped
- GDPR compliance documented
- Data retention policy
- Privacy impact assessment

**Review Steps:**
1. Identify applicable regulations
2. Map controls to requirements
3. Create compliance documentation
4. Implement required controls

#### Story 9.3: Security Playbook

**Acceptance Criteria:**
- Security review checklist
- Deployment security checklist
- Incident response runbook
- Security metrics defined

**Review Steps:**
1. Create security review checklist
2. Document deployment procedures
3. Create incident runbooks
4. Define security metrics

---

## Detailed Findings

### Finding 1: No Authentication/Authorization

**Severity:** CRITICAL (P0)
**Category:** Authentication/Authorization
**Location:** All API endpoints, Web UI

**Description:**
The application has no authentication or authorization mechanism. All endpoints are publicly accessible without any credentials required.

**Evidence:**
```typescript
// File: packages/dojolm-web/src/app/api/llm/models/route.ts
export async function GET(request: NextRequest) {
  try {
    // No authentication check
    let models = await fileStorage.getModelConfigs();
    // Returns all models including API keys
    return NextResponse.json(models);
  }
}
```

**Impact:**
- Unauthorized access to LLM testing infrastructure
- API key exposure through model listing endpoint
- Unauthorized test execution
- Data tampering

**Recommendation:**
Implement Epic 1 (Authentication and Authorization) immediately before any production deployment.

---

### Finding 2: API Keys Stored in Plaintext

**Severity:** CRITICAL (P0)
**Category:** Data Protection
**Location:** `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts`

**Description:**
API keys are stored in plaintext in JSON files in the `data/llm-results` directory.

**Evidence:**
```typescript
// File: packages/dojolm-web/src/lib/storage/file-storage.ts:154-180
async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
  // ...
  const updatedConfig: LLMModelConfig = {
    ...config,
    apiKey,  // Stored as plaintext
    // ...
  };
  await writeJSON(PATHS.models, configs);  // Plaintext JSON write
}
```

**Impact:**
- API keys exposed if filesystem compromised
- Credentials leaked in backups
- Potential unauthorized API usage
- Financial liability for consumed API quota

**Recommendation:**
Implement Epic 2 (Secrets Management) with encryption at rest.

---

### Finding 3: Overly Permissive CORS Configuration

**Severity:** HIGH (P1)
**Category:** API Security
**Location:** `/Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts:108`

**Description:**
CORS is configured to allow all origins (`*`), enabling any website to make requests to the API.

**Evidence:**
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Impact:**
- CSRF attack exposure
- Data exfiltration from malicious sites
- API abuse through third-party origins

**Recommendation:**
Restrict CORS to specific, trusted origins. Implement origin allowlist.

---

### Finding 4: Rate Limiting Lost on Restart

**Severity:** HIGH (P1)
**Category:** DoS Protection
**Location:** `/Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts:77`

**Description:**
Rate limiting is stored in-memory (`Map`) and is lost when the server restarts, allowing abusive clients to reset their limits.

**Evidence:**
```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();
```

**Impact:**
- Rate limit bypass through server restart
- No persistent DoS protection
- Ability to abuse API quotas

**Recommendation:**
Implement persistent rate limiting using Redis, database, or filesystem-based tracking.

---

### Finding 5: Binary Parser DoS Protections

**Severity:** MEDIUM (P1)
**Category:** Input Validation
**Location:** `/Users/paultinp/BU-TPI/packages/bu-tpi/src/metadata-parsers.ts`

**Description:**
Binary parsers have implemented DoS protections (size limits, timeouts, iteration limits), but these need verification through testing.

**Evidence:**
```typescript
const LIMITS = {
  MAX_DECOMPRESSED_SIZE: 10 * 1024 * 1024,
  MAX_SVG_SIZE: 10 * 1024 * 1024,
  MAX_DATA_URIS: 100,
  MAX_EXTRACTED_TEXT: 1_000_000,
  MAX_METADATA_FIELDS: 1_000,
  MAX_GIF_ITERATIONS: 100_000,
  MAX_METADATA_VALUE_SIZE: 10_000,
} as const;
```

**Impact:**
- Potential DoS through malformed files
- Memory exhaustion attacks
- Parser escape vulnerabilities

**Recommendation:**
Verify protections through comprehensive testing. Implement Epic 3.3 (Binary File Quarantine).

---

### Finding 6: No Audit Logging

**Severity:** HIGH (P1)
**Category:** Logging/Monitoring
**Location:** Entire codebase

**Description:**
The application lacks comprehensive audit logging for security-relevant events.

**Evidence:**
No audit logging implementation found in codebase review.

**Impact:**
- No forensic capability for incidents
- Unable to detect abuse patterns
- Compliance violations
- Troubleshooting difficulties

**Recommendation:**
Implement Epic 5 (Logging and Audit Trail).

---

### Finding 7: Error Messages May Leak Information

**Severity:** MEDIUM (P1)
**Category:** Information Disclosure
**Location:** Multiple API routes

**Description:**
Error messages include implementation details that could aid attackers.

**Evidence:**
```typescript
// File: packages/dojolm-web/src/app/api/llm/models/route.ts
return NextResponse.json(
  { error: 'Failed to list models', message: error instanceof Error ? error.message : String(error) },
  { status: 500 }
);
```

**Impact:**
- Information disclosure about implementation
- Potential exposure of file paths
- Stack trace leakage

**Recommendation:**
Implement generic error messages for users. Log detailed errors server-side only.

---

### Finding 8: Outdated Dependencies

**Severity:** MEDIUM (P2)
**Category:** Dependency Management
**Location:** All package.json files

**Description:**
Several dependencies are outdated and may contain known vulnerabilities.

**Evidence:**
- TypeScript 5.7.3 (updates available)
- React 19.2.3 (updates available)
- Next.js 16.1.6 (updates available)

**Impact:**
- Known vulnerabilities in dependencies
- Missing security patches
- Potential supply chain risks

**Recommendation:**
Implement Epic 6 (Dependency and Supply Chain Security).

---

### Finding 9: Path Traversal Protection

**Severity:** MEDIUM (P2)
**Category:** Input Validation
**Location:** `/Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts:134-137`

**Description:**
Path traversal protection exists but should be verified for completeness.

**Evidence:**
```typescript
function isPathSafe(requestPath: string, basePath: string): boolean {
  const resolved = join(basePath, requestPath);
  return resolved.startsWith(basePath) && !requestPath.includes('..');
}
```

**Impact:**
- Potential directory traversal attacks
- Unauthorized file access
- Information disclosure

**Recommendation:**
Verify path traversal protection against all edge cases and encoding variations.

---

### Finding 10: No Secrets Management

**Severity:** HIGH (P1)
**Category:** Configuration Management
**Location:** Environment configuration

**Description:**
No integration with external secrets management. Configuration relies on environment files.

**Evidence:**
```bash
# File: packages/dojolm-web/.env.example
# Only example environment variables provided
# No actual secrets management integration
```

**Impact:**
- Manual secrets rotation required
- No centralized secrets management
- Potential secrets in version control

**Recommendation:**
Implement Epic 2.2 (Secrets Management Integration).

---

## Testing Coverage Assessment

### Existing Test Coverage

| Component | Test Files | Coverage | Quality |
|-----------|------------|----------|---------|
| Scanner Patterns | Multiple test files | High | Good |
| Binary Parsers | 8+ test files | High | Good |
| API Endpoints | Limited | Medium | Needs Review |
| Web UI Components | Basic tests | Low | Needs Review |
| Security Tests | None | None | Critical Gap |

### Test Files Identified

```
packages/bu-tpi/tools/
├── test-epic4.ts                 # EPIC 4 coverage test
├── test-epic4-s44-s45.ts         # EPIC 4 sub-tests
├── test-epic4-s46-s49.ts         # EPIC 4 sub-tests
├── test-epic8-session.ts         # Session simulator
├── test-epic8-tool-output.ts     # Tool output validation
├── test-false-positive.ts        # False positive verification
├── test-fp-check.ts              # FP check implementation
├── test-metadata.ts              # Metadata parser tests
├── test-regression.ts            # Full fixture regression
├── test-security-fixes.ts        # Security fix verification
└── verify-binary-scans.ts        # Binary scan verification
```

### Testing Gaps

1. **Authentication/Authorization Tests** - No tests (feature not implemented)
2. **Security Headers Tests** - Missing
3. **Input Validation Tests** - Incomplete
4. **DoS Protection Tests** - Basic only
5. **Penetration Tests** - None
6. **Fuzzing Tests** - None
7. **Audit Log Tests** - None (feature not implemented)

---

## Recommendations Summary

### Immediate Actions (P0)

1. **Implement Authentication/Authorization** - Critical for any production deployment
2. **Encrypt Secrets at Rest** - API keys must be encrypted
3. **Restrict CORS Configuration** - Remove wildcard origins
4. **Add Basic Audit Logging** - Start logging security events

### Short-term Actions (P1)

5. **Enhance Error Handling** - Generic errors to users, detailed logs server-side
6. **Persistent Rate Limiting** - Move beyond in-memory limits
7. **Verify Binary Parser Protections** - Comprehensive DoS testing
8. **Implement Audit Trail** - Full audit logging for compliance

### Medium-term Actions (P2)

9. **Update Dependencies** - Address known vulnerabilities
10. **Implement SBOM** - Supply chain transparency
11. **Security Test Suite** - Dedicated security testing
12. **Complete Documentation** - Security architecture and threat model

---

## SME Review Focus Areas

Based on this review, the following Subject Matter Expert (SME) reviews are recommended:

### Security SME Focus
1. Authentication architecture design
2. Secrets management strategy
3. API security hardening
4. Binary parser security verification
5. Threat model validation

### Architecture SME Focus
1. Monorepo structure optimization
2. Storage backend evaluation (file vs database)
3. Scalability considerations
4. Integration patterns with BMAD framework

### Compliance SME Focus
1. Data retention requirements
2. Privacy impact assessment
3. Audit logging requirements
4. Compliance mapping (SOC 2, GDPR, etc.)

---

## Appendices

### Appendix A: File Inventory

**Security-Critical Files:**
- `/Users/paultinp/BU-TPI/packages/bu-tpi/src/serve.ts` - HTTP server
- `/Users/paultinp/BU-TPI/packages/bu-tpi/src/scanner.ts` - Detection engine
- `/Users/paultinp/BU-TPI/packages/bu-tpi/src/scanner-binary.ts` - Binary scanner
- `/Users/paultinp/BU-TPI/packages/bu-tpi/src/metadata-parsers.ts` - Metadata extraction
- `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/storage/file-storage.ts` - Data storage
- `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/llm-execution.ts` - Test execution
- `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/providers/*.ts` - LLM providers

**API Endpoints (17 total):**
- `/api/scan` - Text scanning
- `/api/scan-fixture` - Fixture scanning
- `/api/read-fixture` - Fixture reading
- `/api/fixtures` - Fixture manifest
- `/api/stats` - Scanner statistics
- `/api/llm/models` - Model CRUD
- `/api/llm/execute` - Single test execution
- `/api/llm/batch` - Batch execution
- `/api/llm/results` - Results query
- `/api/llm/test-cases` - Test case management
- `/api/llm/seed` - Data seeding
- `/api/llm/local-models` - Local model listing
- `/api/llm/coverage` - Coverage reporting
- `/api/llm/reports` - Report generation
- `/api/llm/export` - Data export
- `/api/tests` - Test execution
- `/api/llm/models/[id]/*` - Model-specific operations

### Appendix B: TPI Coverage

The scanner implements comprehensive coverage of the CrowdStrike TPI taxonomy:

| TPI Story | Status | Patterns | Fixtures |
|-----------|--------|----------|----------|
| TPI-PRE-4 | ✅ | 3 | Yes |
| TPI-02 | ✅ | 6 | Yes |
| TPI-03 | ✅ | 5 | Yes |
| TPI-04 | ✅ | Covered | Yes |
| TPI-05 | ✅ | 3 | Yes |
| TPI-06 | ✅ | Covered | Yes |
| TPI-07 | ✅ | Covered | Yes |
| TPI-08 | ✅ | Covered | Yes |
| TPI-09 | ✅ | 9 | Yes |
| TPI-10 | ✅ | Decoders | Yes |
| TPI-11 | ✅ | Heuristics | Yes |
| TPI-12 | ✅ | 6 | Yes |
| TPI-13 | ✅ | Covered | Yes |
| TPI-14 | ✅ | 4 | Yes |
| TPI-15 | ✅ | 40 | Yes |
| TPI-17 | ✅ | 4 | Yes |
| TPI-18 | ✅ | Covered | Yes |
| TPI-19 | ✅ | Binary Analysis | Yes |
| TPI-20 | ✅ | Covered | Yes |
| TPI-21 | ✅ | 2 | Yes |

### Appendix C: Risk Matrix

| Finding | Likelihood | Impact | Risk Score | Priority |
|---------|------------|--------|------------|----------|
| No Authentication | High | Critical | 9 | P0 |
| Plaintext Secrets | Medium | Critical | 8 | P0 |
| Wildcard CORS | High | High | 8 | P1 |
| Memory-based Rate Limit | Medium | High | 7 | P1 |
| No Audit Logging | High | Medium | 7 | P1 |
| Binary Parser DoS | Low | High | 6 | P1 |
| Error Information Disclosure | Medium | Medium | 5 | P1 |
| Outdated Dependencies | Medium | Medium | 5 | P2 |
| Path Traversal | Low | Medium | 4 | P2 |
| No Secrets Management | Medium | Medium | 5 | P1 |

---

**End of Document**

**Next Steps:**
1. Review and prioritize findings with development team
2. Assign epics to sprints based on risk assessment
3. Schedule SME deep-dive sessions for critical areas
4. Begin implementation of P0 items immediately

**Contact:** Bob (Technical Scrum Master, BMAD BMM Module)
**Document Version:** 1.0
**Last Updated:** 2026-02-28
