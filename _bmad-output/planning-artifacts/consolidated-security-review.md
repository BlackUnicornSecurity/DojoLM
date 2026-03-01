# BU-TPI Security Review - Consolidated Assessment

**Document ID:** CONSOLIDATED-2026-02-28-001
**Consolidated By:** Bob (Technical Scrum Master, BMAD BMM Module)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Date:** 2026-02-28
**Review Type:** Consolidated SME Security Assessment

---

## Executive Summary

The BU-TPI (DojoLM) codebase has undergone comprehensive security review by nine Subject Matter Experts (SMEs) across architecture, security architecture, penetration testing, compliance, web application security, threat intelligence, QA, business analysis, and cloud security. This document consolidates all findings, recommendations, and remediation roadmaps into a unified working document.

### Overall Security Posture: **CRITICAL - PRODUCTION BLOCKER**

| Assessment Dimension | Score | Status |
|---------------------|-------|--------|
| Authentication & Authorization | 0/10 | NOT IMPLEMENTED |
| Secrets Management | 1/10 | CRITICAL GAPS |
| API Security | 3/10 | SIGNIFICANT GAPS |
| Data Protection | 2/10 | PLAINTEXT STORAGE |
| Audit & Logging | 2/10 | MINIMAL IMPLEMENTATION |
| Input Validation | 6/10 | PARTIAL PROTECTIONS |
| Binary Parser Security | 7/10 | GOOD PROTECTIONS |
| Dependency Security | 5/10 | NEEDS IMPROVEMENT |
| Compliance Readiness | 2/10 | SIGNIFICANT GAPS |
| Cloud Readiness | 1/10 | NOT READY |

### Risk Score: **9.2/10 (CRITICAL)**

The platform has **CRITICAL vulnerabilities** that must be addressed before any production deployment. The combination of no authentication, plaintext API key storage, and wildcard CORS creates an unacceptable risk profile.

---

## SME Contributors

| SME | Role | Organization | Focus Area |
|-----|------|--------------|------------|
| Bob | Technical Scrum Master | BMAD BMM Module | Initial Assessment & Coordination |
| Winston | System Architect | BMAD BMM Module | Architecture & Storage |
| Bastion | Security Architect | BMAD Cybersec Team | Security Architecture & STRIDE |
| Ghost | Offensive Security Expert | BMAD Cybersec Team | Penetration Testing & Exploitation |
| Sentinel | Risk & Compliance Expert | BMAD Cybersec Team | SOC 2, GDPR, ISO 27001 |
| Weaver | Web Application Security Specialist | BMAD Cybersec Team | OWASP Top 10, API Security |
| Cipher | Threat Intelligence Specialist | BMAD Cybersec Team | Threat Actor Analysis, ATT&CK |
| Quinn | QA Engineer | BMAD BMM Module | Testing Strategy & Quality Gates |
| Mary | Business Analyst | BMAD BMM Module | Business Impact & Prioritization |
| Nimbus | Cloud Security Architect | BMAD Cybersec Team | Cloud, IaC, Container Security |

---

## Consolidated Findings by Priority

### P0 - CRITICAL (Production Blockers)

**All 9 SMEs agree on the following P0 findings:**

| ID | Finding | Affected Files | SME Consensus | Business Impact |
|----|---------|----------------|---------------|----------------|
| P0-001 | No Authentication/Authorization | All API routes | 100% agreement | Blocks enterprise sales, unlimited API abuse |
| P0-002 | Plaintext API Key Storage | file-storage.ts:159-180 | 100% agreement | API key theft, financial liability |
| P0-003 | API Key Exposure in GET Responses | /api/llm/models/route.ts | 100% agreement | Credential exfiltration |
| P0-004 | Wildcard CORS Configuration | serve.ts:108 | 100% agreement | CSRF attacks, data exfiltration |
| P0-005 | No Audit Logging | Entire codebase | Elevated by Compliance SME | Compliance violation, no forensic capability |
| P0-006 | SSRF via baseUrl Parameter | local-models/route.ts | Identified by Pentest/Web SMEs | Internal network scanning |
| P0-007 | No Session Management | Not implemented | Elevated by Security Arch SME | No user tracking, unlimited access |
| P0-008 | No Secrets Management Integration | Configuration | Elevated by Cloud SME | Credential exposure in deployments |
| P0-009 | Hardcoded Credentials in Deploy Script | deploy-majutsu.sh:12 | Cloud SME finding | Direct credential leakage |

### P1 - HIGH

| ID | Finding | Affected Files | SME(s) | Notes |
|----|---------|----------------|--------|-------|
| P1-001 | Memory-based Rate Limiting | serve.ts:77 | All | Lost on restart, abuse potential |
| P1-002 | Missing CSP Headers | next.config.ts | Web SME | XSS vulnerability |
| P1-003 | Verbose Error Messages | All API routes | All SMEs | Information disclosure |
| P1-001 | No Request Validation Schema | API routes | Arch/Web SMEs | Injection vulnerability |
| P1-005 | No Digital Signatures on Results | file-storage.ts | Security Arch/QA SMEs | Tampering risk |
| P1-006 | Binary Parser DoS Protections Need Verification | metadata-parsers.ts | Pentest/QA SMEs | Protections exist, need testing |
| P1-007 | No Persistent Rate Limiting | serve.ts | All SMEs | Per-user limits needed |
| P1-008 | Missing Security Headers | next.config.ts | Web/Cloud SMEs | HSTS, Permissions-Policy |
| P1-009 | No API Versioning | All routes | Arch SME | Breaking changes risk |
| P1-010 | No Input Sanitization | Test case creation | Web/Pentest SMEs | XSS/Injection risks |
| P1-011 | No Threat Detection/Alerting | Entire system | Threat Intel SME | Blind to compromises |
| P1-012 | No CI/CD Security Pipeline | .github/ | Cloud/QA SMEs | No automated security checks |
| P1-013 | Supply Chain Security Gaps | package.json files | Threat Intel SME | Dependency poisoning risk |

### P2 - MEDIUM

| ID | Finding | Affected Files | SME(s) | Notes |
|----|---------|----------------|--------|-------|
| P2-001 | Outdated Dependencies | package.json files | All SMEs | Known vulnerability risk |
| P2-002 | No Infrastructure as Code | N/A | Cloud SME | Reproducibility issue |
| P2-003 | No Performance Testing | N/A | QA SME | Scalability unknown |
| P2-004 | No E2E Testing | N/A | QA/Web SMEs | Integration risks |
| P2-005 | No SBOM Generation | N/A | Cloud SME | Supply chain transparency |
| P2-006 | Container Security Gaps | Dockerfile | Cloud SME | Hardening needed |
| P2-007 | No Incident Response Procedures | N/A | All SMEs | Unprepared for incidents |
| P2-008 | Limited Web UI Test Coverage | Components/ | QA SME | <5% coverage |
| P2-009 | No Fuzzing Integration | Parsers | QA/Pentest SMEs | Proactive testing |
| P2-010 | Path Traversal Protection Review | serve.ts:134-137 | Pentest SME | Edge cases exist |

---

## Updated Epics

### Epic 1: Authentication & Authorization

**Priority:** P0 - CRITICAL
**Rationale:** All 9 SMEs identified this as the #1 blocker for production. Without authentication, the platform is completely exposed to unauthorized access, API abuse, and data exfiltration.

**Affected Files:**
- `/packages/dojolm-web/src/app/api/**/*` (all 17 API routes)
- `/packages/bu-tpi/src/serve.ts`
- `/packages/dojolm-web/src/lib/storage/file-storage.ts`

**Stories (Updated with SME Feedback):**

#### Story 1.1: Design Authentication Strategy
**Acceptance Criteria:**
- Select authentication mechanism (NextAuth.js with OAuth2/OIDC recommended by Security Arch SME)
- Define Multi-factor Authentication requirements (MFA for admin access)
- Session management approach documented (15-minute idle timeout, 8-hour absolute)
- Password policy defined (if username/password auth): min 12 chars, complexity

**Implementation Estimates:** 3-5 days (Architect SME)

**Testing Requirements (QA SME):**
- Login flow tests (success, failure, lockout)
- Token validation tests (expired, invalid, revoked)
- Session management tests (timeout, concurrent limits)
- MFA challenge tests

**Compliance Mapping (Compliance SME):**
- SOC 2 CC6.1, CC6.2 - Logical Access Controls
- ISO 27001 A.9.1, A.9.2, A.9.3, A.9.4 - Access Control
- GDPR Article 32 - Security of Processing

#### Story 1.2: Implement API Authentication Middleware
**Acceptance Criteria:**
- All API routes require valid authentication
- Support for multiple auth mechanisms (JWT, API Key for service accounts)
- Rate limiting tied to authenticated users (not IP-based)
- Failed authentication attempts logged with IP/UserAgent

**Implementation Estimates:** 3-5 days (Web/Security Arch SMEs)

**Testing Requirements:**
- Unauthenticated access returns 401
- Invalid tokens return 401
- Expired tokens return 401
- Rate limits enforced per-user

**Security Recommendations (Pentest SME):**
- Implement account lockout after 5 failed attempts
- Add progressive delays on failures
- Log all authentication events

#### Story 1.3: Implement Role-Based Access Control (RBAC)
**Acceptance Criteria:**
- Role definitions: Admin, Operator, Viewer, Auditor (Security Arch SME recommendation)
- Permission matrix documented (see below)
- Role assignment mechanism
- Authorization checks on all sensitive operations

**Permission Matrix (Security Arch SME):**

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

**Implementation Estimates:** 5-7 days (Security Arch SME)

**Testing Requirements:**
- Permission enforcement per role
- Privilege escalation attempts blocked
- Role assignment only by Admin
- Auditor can view logs but nothing else

#### Story 1.4: Secure Session Management
**Acceptance Criteria:**
- Secure cookie configuration (HttpOnly, Secure, SameSite=Strict)
- Session timeout implementation (15 min idle, 8 hr absolute per Security Arch SME)
- Session revocation capability
- Concurrent session limits (3 per user per Web SME)
- Refresh token rotation

**Implementation Estimates:** 3-4 days (Web SME)

**Testing Requirements:**
- Session timeout enforced
- Session revocation works
- Concurrent limit enforced
- Refresh token rotation works

---

### Epic 2: Secrets Management & Data Protection

**Priority:** P0 - CRITICAL
**Rationale:** All SMEs identified plaintext API key storage as a critical vulnerability. This is the #2 priority after authentication.

**Affected Files:**
- `/packages/dojolm-web/src/lib/storage/file-storage.ts:159-180`
- `/packages/dojolm-web/data/llm-results/models.json`
- `/packages/dojolm-web/src/app/api/llm/models/route.ts`

**Stories (Updated with SME Feedback):**

#### Story 2.1: Implement Secrets Encryption at Rest
**Acceptance Criteria:**
- All API keys encrypted before storage
- AES-256-GCM encryption (Security Arch & Pentest SMEs agree)
- Environment-based encryption key management
- Key rotation mechanism (quarterly per Compliance SME)
- Never return full API keys in GET responses (Pentest SME critical finding)

**Implementation Pattern (Security Arch SME):**
```typescript
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted += cipher.final('utf8');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}
```

**Implementation Estimates:** 3-5 days (Security Arch SME)

**Testing Requirements (QA SME):**
- Encryption at rest verified
- Decryption works correctly
- Key rotation works
- Encrypted data cannot be read without key

**Compliance Mapping:**
- SOC 2 CC6.6 - Encryption at Rest
- ISO 27001 A.10.1 - Cryptographic Controls
- GDPR Article 32 - Security of Processing

#### Story 2.2: Implement Secrets Management Integration
**Acceptance Criteria:**
- Integration with vault/secrets manager (Cloud SME recommends AWS Secrets Manager/Azure Key Vault)
- Environment-based configuration
- Runtime secret retrieval
- Audit logging for secret access
- KMS integration for production (Cloud SME)

**Implementation Estimates:** 5-7 days (Cloud/Security Arch SMEs)

**Testing Requirements:**
- Secrets retrieved from vault
- Secrets not logged
- Audit events generated
- Fallback to environment for dev

#### Story 2.3: Secure Environment Configuration
**Acceptance Criteria:**
- No hardcoded credentials
- Environment variable validation on startup
- Configuration file encryption
- Secrets rotation documentation
- Remove credentials from deploy-majutsu.sh (Cloud SME P0 finding)

**Critical Fix (Cloud SME):**
```bash
# File: team/QA-tools/deploy-majutsu.sh
# REMOVE THESE LINES:
MAJUTSU_PASSWORD="majutsu"  # Line 12 - PLAINTEXT PASSWORD
sshpass -p "$MAJUTSU_PASSWORD" ssh ... # Line 49 - PASSWORD IN ENV
```

**Implementation Estimates:** 2-3 days (Cloud SME)

---

### Epic 3: Binary File Processing Security

**Priority:** P1 - HIGH (Elevated from P1 based on Pentest/QA SME feedback)

**Rationale:** Good protections exist (DoS limits, timeouts) but need verification and additional hardening per Pentest and QA SMEs.

**Affected Files:**
- `/packages/bu-tpi/src/metadata-parsers.ts`
- `/packages/bu-tpi/src/scanner-binary.ts`

**Stories (Updated with SME Feedback):**

#### Story 3.1: Verify DoS Protections in Binary Parsers
**Acceptance Criteria:**
- All size limits verified and tested (QA SME requirement)
- Timeout enforcement verified
- Decompression bomb protection confirmed
- Resource exhaustion tests pass

**Current Protections (Architect SME):**
```typescript
const LIMITS = {
  MAX_DECOMPRESSED_SIZE: 10 * 1024 * 1024,     // 10MB
  MAX_SVG_SIZE: 10 * 1024 * 1024,
  MAX_DATA_URIS: 100,
  MAX_EXTRACTED_TEXT: 1_000_000,
  MAX_METADATA_FIELDS: 1_000,
  MAX_GIF_ITERATIONS: 100_000,
  MAX_METADATA_VALUE_SIZE: 10_000,
};
```

**Implementation Estimates:** 2-3 days (QA SME with test cases)

**Testing Requirements:**
- Oversized file tests (all formats)
- Malformed file tests
- Timeout tests
- Memory limit tests

#### Story 3.2: Additional Parser Hardening
**Acceptance Criteria:**
- Input validation on all parser inputs
- Recursive depth limits
- Memory allocation caps
- Graceful failure modes

**Implementation Estimates:** 3-4 days (Pentest SME)

**Testing Requirements:**
- Edge case tests for each parser
- Memory monitoring tests
- Crash recovery tests

#### Story 3.3: Binary File Quarantine System (P2 - Lower Priority)
**Acceptance Criteria:**
- Suspicious files quarantined
- Sandboxed parsing environment (worker threads per Web SME)
- File type validation
- Malformed file handling

**Implementation Estimates:** 5-7 days (Pentest/Security Arch SMEs)

---

### Epic 4: API Security Hardening

**Priority:** P1 - HIGH

**Rationale:** Multiple critical gaps including CORS, SSRF, input validation, and error handling.

**Affected Files:**
- `/packages/bu-tpi/src/serve.ts`
- `/packages/dojolm-web/src/app/api/**/*`
- `/packages/dojolm-web/next.config.ts`

**Stories (Updated with SME Feedback):**

#### Story 4.1: CORS Configuration Review
**Acceptance Criteria:**
- CORS policy restricted to specific origins (all SMEs)
- Credential handling configured
- Preflight caching appropriate
- Wildcard origins removed (CRITICAL per all SMEs)

**Current Issue (All SMEs):**
```typescript
// File: packages/bu-tpi/src/serve.ts:108
res.setHeader('Access-Control-Allow-Origin', '*');  // <- MUST FIX
```

**Recommended Fix:**
```typescript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
function getCorsOrigin(requestOrigin: string): string | null {
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null;
}
```

**Implementation Estimates:** 1 day (Web SME)

**Testing Requirements:**
- Allowed origins work
- Disallowed origins blocked
- Preflight requests handled

#### Story 4.2: Request Validation Framework
**Acceptance Criteria:**
- Schema validation for all inputs (Zod recommended by Arch/Web SMEs)
- Type coercion prevention
- SQL injection prevention (future-proofing)
- Command injection prevention

**Zod Schema Example (Web SME):**
```typescript
const modelConfigSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  provider: z.enum(['openai', 'anthropic', 'ollama', ...]),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(20).max(200).optional(),
  baseUrl: z.string().url().refine((val) => {
    // Block internal IPs - SSRF prevention
    const url = new URL(val);
    return !['localhost', '127.0.0.1', '169.254.169.254'].includes(url.hostname);
  }),
});
```

**Implementation Estimates:** 3-5 days (Web SME)

**Testing Requirements:**
- Invalid input rejected
- SQL injection attempts blocked
- Command injection blocked
- SSRF attempts blocked

#### Story 4.3: Error Handling Security
**Acceptance Criteria:**
- Generic error messages to users (all SMEs)
- Detailed errors logged only (server-side)
- Stack traces never exposed
- Error code standardization

**Implementation Pattern (Web SME):**
```typescript
function handleError(error: unknown): NextResponse {
  logger.error('Detailed error:', error);  // Server-side only
  return NextResponse.json(
    { error: 'An error occurred. Please try again.' },
    { status: 500 }
  );
}
```

**Implementation Estimates:** 2-3 days (Web SME)

#### Story 4.4: Rate Limiting Enhancement
**Acceptance Criteria:**
- Persistent rate limiting (Redis/database backed)
- Per-user rate limits (after Epic 1)
- Tiered rate limits by role
- Rate limit bypass detection

**Current Issue (All SMEs):**
```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();
// Lost on server restart - allows rate limit bypass
```

**Implementation Estimates:** 3-5 days (Arch/Web SMEs)

**Testing Requirements:**
- Rate limits persist across restarts
- Per-user limits work
- Bypass attempts detected

#### Story 4.5: SSRF Protection (NEW from Pentest/Web SMEs)
**Acceptance Criteria:**
- URL allowlist for baseUrl parameter
- Private IP range blocking
- Cloud metadata service blocking

**Implementation (Web/Pentest SMEs):**
```typescript
const PRIVATE_IP_PATTERNS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./, /^169\.254\./, /^::1$/, /^fe80::/, /^fc00:/,
];

function validateBaseUrl(baseUrl: string): boolean {
  const url = new URL(baseUrl);
  return !PRIVATE_IP_PATTERNS.some(pattern => pattern.test(url.hostname));
}
```

**Implementation Estimates:** 2-3 days (Web SME)

---

### Epic 5: Logging and Audit Trail

**Priority:** P0 - CRITICAL (Elevated from P1 by Compliance SME)

**Rationale:** Essential for compliance (SOC 2, GDPR), forensic capability, and threat detection. All SMEs agree this is critical.

**Stories (Updated with SME Feedback):**

#### Story 5.1: Design Audit Logging Schema
**Acceptance Criteria:**
- Event types defined (auth, config, execution, admin)
- Logging schema standardized (Compliance SME format)
- Retention policy defined (90 days to 7 years per data type)
- PII handling documented

**Log Schema (Consolidated from Security Arch & Compliance SMEs):**
```typescript
interface AuditLogEntry {
  timestamp: string;           // ISO 8601
  event_id: string;            // From event catalog
  event_name: string;          // Human-readable
  category: string;            // auth, config, data, system
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  user_id?: string;            // Authenticated user
  session_id: string;
  ip_address: string;
  user_agent?: string;
  resource_id?: string;
  resource_type?: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  details: Record<string, unknown>;
  correlation_id?: string;
  signature?: string;           // HMAC for integrity
}
```

**Implementation Estimates:** 2-3 days (Security Arch/Compliance SMEs)

#### Story 5.2: Implement Audit Logging
**Acceptance Criteria:**
- All security events logged
- Log integrity protection (HMAC signing per Security Arch SME)
- Structured log format
- Log rotation implemented
- BMAD audit logger integration (Arch SME notes it exists but unused)

**Critical Events to Log (Compliance SME):**
| Event Category | Specific Events | Retention |
|----------------|-----------------|-----------|
| Authentication | Login success/failure, MFA, session changes | 90 days |
| Authorization | Access granted/denied, privilege escalations | 90 days |
| Configuration | Model CRUD, API key operations | 365 days |
| Data Access | Test case access, results queries | 90 days |
| System | Batch execution, export, delete operations | 365 days |
| Security | Security events, PII detected | 365 days |

**Implementation Estimates:** 5-7 days (Security Arch SME)

**Testing Requirements:**
- All events logged correctly
- Log integrity verified
- Rotation works
- Query capability exists

**Compliance Mapping:**
- SOC 2 CC7.2, CC7.3, CC7.4 - System Monitoring
- ISO 27001 A.12.4 - Logging
- GDPR Article 30 - Records of Processing

#### Story 5.3: Audit Log Review Interface
**Acceptance Criteria:**
- Admin-only audit log viewer (RBAC enforced)
- Filtering and search capabilities
- Export functionality
- Tamper-evidence indicators

**Implementation Estimates:** 3-5 days (Web SME)

---

### Epic 6: Dependency and Supply Chain Security

**Priority:** P2 - MEDIUM (Elevated to P1 by Threat Intel SME)

**Rationale:** Supply chain is a high-risk vector for LLM platforms. Automated scanning needed.

**Stories (Updated with SME Feedback):**

#### Story 6.1: Dependency Audit & Scanning
**Acceptance Criteria:**
- All dependencies audited
- Vulnerabilities documented
- Update plan created
- License compliance verified
- Automated scanning in CI/CD (Cloud/QA SMEs)

**Implementation Estimates:** 2-3 days (QA/Cloud SMEs)

#### Story 6.2: SBOM Implementation
**Acceptance Criteria:**
- Software Bill of Materials generated
- SBOM format selected (CycloneDX recommended by Cloud SME)
- Automated SBOM generation
- SBOM verification process

**Implementation Estimates:** 2-3 days (Cloud SME)

#### Story 6.3: Dependency Pinning Strategy
**Acceptance Criteria:**
- Lockfile strategy documented
- Automated dependency updates (Dependabot)
- Security update workflow
- Vulnerability monitoring

**Implementation Estimates:** 2 days (QA SME)

---

### Epic 7: Input Validation and Sanitization

**Priority:** P1 - HIGH

**Rationale:** XSS, injection, and input validation gaps identified by Web and Pentest SMEs.

**Stories (Updated with SME Feedback):**

#### Story 7.1: Standardize Input Validation
**Acceptance Criteria:**
- Validation library selected (Zod)
- Common validators implemented
- Validation error standardization
- Type safety maintained

**Implementation Estimates:** 3-4 days (Web SME)

#### Story 7.2: XSS Prevention in Web UI
**Acceptance Criteria:**
- All user content sanitized
- CSP headers configured
- Dangerous functions avoided
- React XSS prevention verified

**CSP Implementation (Web SME):**
```typescript
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ')
}
```

**Implementation Estimates:** 2-3 days (Web SME)

#### Story 7.3: Test Case Content Sanitization
**Acceptance Criteria:**
- Test case prompt validation
- Special character handling
- Length limits enforced
- Malicious content detection

**Implementation Estimates:** 2-3 days (Web/Pentest SMEs)

---

### Epic 8: Testing Coverage and Quality

**Priority:** P2 - MEDIUM (with critical gaps noted)

**Rationale:** Good coverage in scanner (7,117+ tests), but security testing gaps in web UI.

**Stories (Updated with SME Feedback):**

#### Story 8.1: Security Test Suite
**Acceptance Criteria:**
- Security-focused test cases
- Authentication/authorization tests
- Input validation tests
- DoS protection tests

**Implementation Estimates:** 5-7 days (QA SME with Security Arch input)

#### Story 8.2: Penetration Testing Framework
**Acceptance Criteria:**
- Penetration test scenarios defined
- Automated penetration tests
- Security regression tests
- Reporting format standardized

**Implementation Estimates:** 5-7 days (Pentest SME)

#### Story 8.3: Fuzzing Integration
**Acceptance Criteria:**
- Fuzzing targets identified (binary parsers, API endpoints)
- Fuzzing framework selected (Jazzer.js recommended by QA SME)
- Fuzzing tests implemented
- Crash analysis process

**Implementation Estimates:** 5-7 days (QA/Pentest SMEs)

---

### Epic 9: Documentation and Compliance

**Priority:** P2 - MEDIUM

**Rationale:** Needed for compliance and onboarding.

**Stories (Updated with SME Feedback):**

#### Story 9.1: Security Documentation
**Acceptance Criteria:**
- Security architecture documented
- Threat model documented (STRIDE from Security Arch SME)
- Security controls documented
- Incident response plan created

**Implementation Estimates:** 3-5 days (Security Arch SME)

#### Story 9.2: Compliance Documentation
**Acceptance Criteria:**
- SOC 2 controls mapped
- GDPR compliance documented
- Data retention policy
- Privacy impact assessment (DPIA)
- ROPA (Records of Processing Activities)

**Implementation Estimates:** 5-7 days (Compliance SME)

#### Story 9.3: Security Playbook
**Acceptance Criteria:**
- Security review checklist
- Deployment security checklist
- Incident response runbook
- Security metrics defined

**Implementation Estimates:** 3-4 days (All SMEs)

---

### New Epic 10: Cloud & Infrastructure Security (From Cloud SME)

**Priority:** P0 - CRITICAL for cloud deployments

**Rationale:** Current cloud readiness is 16% (90-point gap). IaC, container security, and deployment security are critical gaps.

**Stories:**

#### Story 10.1: Infrastructure as Code Implementation
**Acceptance Criteria:**
- Terraform/CDK templates created
- VPC, security groups, ALB defined
- RDS, Redis, Secrets Manager configured
- State locking and validation enabled

**Implementation Estimates:** 5-7 days (Cloud SME)

#### Story 10.2: Container Security Hardening
**Acceptance Criteria:**
- Digest-pinned base images
- Security options (no-new-privileges, dropped capabilities)
- Health checks implemented
- Read-only root filesystem
- Image scanning pipeline

**Implementation Estimates:** 3-4 days (Cloud SME)

#### Story 10.3: CI/CD Security Pipeline
**Acceptance Criteria:**
- SAST (CodeQL, Semgrep)
- SCA (npm audit, Snyk)
- Container scanning (Trivy)
- IaC scanning (tfsec, Checkov)
- Secrets scanning (gitleaks)

**Implementation Estimates:** 3-5 days (Cloud/QA SMEs)

---

## Unified Remediation Roadmap

### Phase 1: Critical Security (P0) - Weeks 1-6

**Goal:** Establish baseline security for safe development

| Week | Focus | Deliverables | SME Owner | Effort |
|------|-------|--------------|-----------|--------|
| 1-2 | Authentication | NextAuth.js integration, OAuth2/OIDC providers, JWT middleware | Security Arch | 10 days |
| 1-2 | Secrets Encryption | AES-256-GCM implementation, key management, API key protection | Security Arch | 8 days |
| 3-4 | Authorization | RBAC model, permission middleware, role enforcement | Security Arch | 8 days |
| 3-4 | Audit Logging | Event schema, BMAD integration, log storage, query API | Security Arch | 10 days |
| 5-6 | CORS & Headers | CORS restrictions, CSP implementation, security headers | Web SME | 5 days |
| 5-6 | Error Handling | Generic errors, server-side logging, no stack traces | Web SME | 3 days |

**Exit Criteria:**
- [ ] All API endpoints require authentication
- [ ] API keys encrypted at rest
- [ ] API keys never returned in GET responses
- [ ] Wildcard CORS removed
- [ ] Basic audit logging operational
- [ ] RBAC implemented for all operations

**Total Estimated Effort:** 44 days (~9 weeks with 1 FTE)

### Phase 2: High Priority (P1) - Weeks 7-12

**Goal:** Strengthen security posture

| Week | Focus | Deliverables | SME Owner | Effort |
|------|-------|--------------|-----------|--------|
| 7-8 | Input Validation | Zod schemas, SSRF protection, URL validation | Web SME | 8 days |
| 7-8 | Rate Limiting | Persistent rate limiting, per-user quotas, Redis integration | Arch SME | 5 days |
| 9 | XSS Prevention | CSP headers, content sanitization, React security | Web SME | 4 days |
| 9 | Binary Parser Verification | DoS protection tests, malformed file tests, fuzzing | QA/Pentest | 5 days |
| 10-11 | API Security | API versioning, request signing, OpenAPI docs | Arch SME | 8 days |
| 10-11 | Security Testing | Auth test suite, API security tests, secrets tests | QA SME | 8 days |
| 12 | Threat Detection | Security event logging, alerting, SIEM integration | Threat Intel | 7 days |

**Exit Criteria:**
- [ ] Comprehensive input validation
- [ ] Persistent per-user rate limiting
- [ ] CSP implemented
- [ ] Security test suite passing
- [ ] Threat detection operational

**Total Estimated Effort:** 45 days (~9 weeks with 1 FTE)

### Phase 3: Medium Priority (P2) - Weeks 13-18

**Goal:** Defense-in-depth and compliance

| Week | Focus | Deliverables | SME Owner | Effort |
|------|-------|--------------|-----------|--------|
| 13-14 | Cloud Infrastructure | IaC templates, container hardening, CI/CD security | Cloud SME | 12 days |
| 13-14 | Supply Chain | SBOM generation, dependency scanning, automated updates | Threat Intel | 6 days |
| 15-16 | Compliance Documentation | SOC 2 mapping, GDPR documentation, DPIA, ROPA | Compliance | 12 days |
| 15-16 | Digital Signatures | Audit log signing, result verification, tamper evidence | Security Arch | 5 days |
| 17-18 | Incident Response | IR playbooks, escalation procedures, tabletop exercises | All SMEs | 8 days |
| 17-18 | Advanced Testing | E2E tests, fuzzing, penetration testing framework | QA/Pentest | 10 days |

**Exit Criteria:**
- [ ] Cloud deployment ready
- [ ] SBOM automated
- [ ] Compliance documentation complete
- [ ] Incident response procedures tested
- [ ] Penetration testing completed

**Total Estimated Effort:** 53 days (~11 weeks with 1 FTE)

---

## Cross-Cutting Concerns

### 1. Authentication Spans Multiple Epics
- **Epic 1** - Core authentication implementation
- **Epic 2** - Secrets protection requires auth first
- **Epic 4** - Rate limiting requires user identity
- **Epic 5** - Audit logging requires user attribution

### 2. Secrets Management Affects Multiple Areas
- **Epic 2** - Core secrets management
- **Epic 9** - Documentation of secrets procedures
- **Epic 10** - Cloud secrets manager integration
- **All Epics** - Environment configuration

### 3. Audit Logging Required Everywhere
- **All API Operations** - Must be logged
- **All Configuration Changes** - Must be logged
- **All Data Access** - Must be logged (Compliance requirement)

### 4. Input Validation Applies to All Inputs
- **API Routes** - Request body validation
- **Web UI** - Form input sanitization
- **File Uploads** - Type and size validation
- **URL Parameters** - SSRF prevention

### 5. Error Handling Consistency
- **All Components** - Generic errors to users
- **All Components** - Detailed errors to logs
- **All Components** - No stack traces exposed

---

## Quick Wins

**High ROI, Low Effort items identified by Architect SME:**

| Quick Win | Effort | ROI | Priority |
|----------|--------|-----|----------|
| Generic error messages | 1-2 days | High | P1 |
| CORS restriction to specific origins | 1 day | Critical | P0 |
| Basic audit logging | 3-5 days | Critical | P0 |
| Remove API keys from GET responses | 1 day | Critical | P0 |
| Add security headers (HSTS, X-Frame-Options) | 1 day | High | P1 |
| Implement npm audit in CI/CD | 1 day | Medium | P2 |

---

## Dependencies

**Epic Dependency Graph:**

```
Epic 1 (Auth/Authorization) - MUST BE FIRST
    |
    +-> Epic 2 (Secrets Management) - Requires RBAC for admin operations
    |       |
    |       +-> Epic 4 (API Security) - Requires auth for rate limiting
    |       |
    |       +-> Epic 5 (Audit Logging) - Requires user attribution
    |
    +-> Epic 3 (Binary Processing) - Can proceed in parallel
    |
    +-> Epic 7 (Input Validation) - Can proceed in parallel

Epic 6 (Dependencies) - Can proceed in parallel
Epic 8 (Testing) - Depends on implementation epics
Epic 9 (Documentation) - Can proceed in parallel
Epic 10 (Cloud) - Can proceed in parallel
```

**Critical Path:**
1. Epic 1 (Weeks 1-4) - BLOCKS everything else
2. Epic 2 (Weeks 3-6) - Parallel with Epic 1 completion
3. Epic 4 (Weeks 7-10) - Requires Epic 1
4. Epic 5 (Weeks 5-8) - Requires Epic 1

**Can Proceed in Parallel:**
- Epic 3 (Binary Security)
- Epic 6 (Dependencies)
- Epic 7 (Input Validation)
- Epic 9 (Documentation)
- Epic 10 (Cloud Infrastructure)

---

## Testing Strategy

**Consolidated from QA and Pentester SMEs:**

### Security Testing Pyramid

```
                    /\
                   /  \
                  / E2E \  (Playwright, 5%)
                 /------\
                /        \
               /Integration\  (Supertest, 25%)
              /            \
             /--------------\
            /     Unit Tests   \  (Vitest, 70%)
           /--------------------\
```

### Test Coverage Requirements by Epic

| Epic | Unit Tests | Integration Tests | Security Tests | E2E Tests |
|------|-----------|------------------|---------------|-----------|
| Epic 1: Auth | 90% | 80% | 100% | 60% |
| Epic 2: Secrets | 90% | 70% | 100% | N/A |
| Epic 3: Binary | 80% | 60% | 70% | N/A |
| Epic 4: API | 80% | 90% | 100% | 50% |
| Epic 5: Audit | 85% | 75% | 80% | N/A |

### Security Test Categories

**1. Authentication Tests (QA SME):**
- Login/logout flow
- Token validation
- Session management
- RBAC enforcement
- Account lockout

**2. API Security Tests (Pentest SME):**
- CORS configuration
- Input validation
- Rate limiting
- Error handling
- SSRF protection

**3. Secrets Tests (Security Arch SME):**
- Encryption at rest
- Key rotation
- Secret retrieval
- Leakage prevention

**4. Penetration Tests (Pentest SME):**
- Unauthenticated access attempts
- Privilege escalation attempts
- Injection attacks
- DoS attempts

### Quality Gates

**Pre-Commit (QA SME):**
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Unit tests pass
- [ ] Security-sensitive tests pass

**Pre-Merge (QA SME):**
- [ ] 80% unit test coverage
- [ ] 100% security test pass rate
- [ ] 100% integration test pass rate
- [ ] No critical vulnerabilities

**Pre-Deployment (QA/Cloud SMEs):**
- [ ] All quality gates pass
- [ ] Authentication implemented
- [ ] Secrets encrypted
- [ ] CORS restricted
- [ ] Security tests pass
- [ ] No critical vulnerabilities

---

## Compliance Requirements

**Consolidated from Compliance SME:**

### SOC 2 Type II Controls

| Control | Current | Required | Epic |
|---------|---------|---------|------|
| CC6.1 - Logical Access | FAIL | Implement auth system | Epic 1 |
| CC6.2 - Access Policies | FAIL | Create access policy | Epic 1 |
| CC6.6 - Encryption at Rest | FAIL | Encrypt secrets | Epic 2 |
| CC6.7 - Privacy/PII | FAIL | Privacy controls | Epic 5 |
| CC7.2 - System Monitoring | PARTIAL | Audit logging | Epic 5 |
| CC7.3 - System Boundaries | FAIL | CORS restriction | Epic 4 |
| CC8.1 - Change Management | PARTIAL | Formal change process | Epic 9 |

### GDPR Article Compliance

| Article | Current | Required | Epic |
|---------|---------|---------|------|
| Article 5 - Data Minimization | FAIL | Minimize stored data | Epic 2 |
| Article 12-23 - Data Subject Rights | FAIL | DSAR implementation | Epic 5 |
| Article 25 - Privacy by Design | FAIL | Conduct DPIA | Epic 9 |
| Article 30 - Records of Processing | FAIL | Create ROPA | Epic 9 |
| Article 32 - Security | FAIL | Address findings | All Epics |
| Article 33 - Breach Notification | FAIL | Breach procedures | Epic 9 |

### ISO 27001:2022 Controls

| Control | Current | Required | Epic |
|---------|---------|---------|------|
| A.5.1 - Policies | FAIL | Create policies | Epic 9 |
| A.8.2 - Privileged Access | FAIL | RBAC | Epic 1 |
| A.9.1 - Access Control | FAIL | Access policy | Epic 1 |
| A.10.1 - Cryptography | FAIL | Encryption | Epic 2 |
| A.12.4 - Logging | FAIL | Audit trail | Epic 5 |
| A.16.1 - Incident Management | FAIL | IR plan | Epic 9 |

---

## Deployment Model Considerations

**Consolidated from Business SME:**

### Minimum Viable Security (MVS) by Deployment Model

| Deployment Model | MVS Requirements | Business Case | Timeline |
|------------------|------------------|---------------|----------|
| **Local/Development Only** | File permissions, basic input validation | Individual researchers | 2 weeks |
| **Team/Internal Cloud** | Epic 1, Epic 2, Epic 5 (auth, secrets, audit) | Small security teams | 6 weeks |
| **SaaS/Public** | All P0 + P1 items + compliance documentation | Commercial product | 12 weeks |
| **Enterprise On-Prem** | All above + SSO integration, advanced RBAC | Large enterprises | 16 weeks |

### Business Impact by Epic

| Epic | Revenue Impact | Cost Impact | Compliance Impact | User Impact |
|------|---------------|------------|------------------|-------------|
| Epic 1: Auth | Blocks enterprise sales | Medium | SOC 2 required | Negative (friction) |
| Epic 2: Secrets | Medium | High (API key theft) | SOC 2 required | Neutral |
| Epic 3: Binary | Low | Low | None | Neutral |
| Epic 4: API | Low | Medium | OWASP | Neutral |
| Epic 5: Audit | Blocks enterprise sales | Low | SOC 2/GDPR required | Neutral |
| Epic 6: Dependencies | Low | Low | None | Neutral |
| Epic 7: Input | Low | Low | OWASP | Neutral |
| Epic 8: Testing | Low | Medium | None | Positive (quality) |
| Epic 9: Docs | Low | Low | SOC 2/GDPR | Positive |
| Epic 10: Cloud | Enables cloud sales | High | SOC 2 | Positive |

---

## Summary and Recommendations

### Document Location
`/Users/paultinp/BU-TPI/_bmad-output/planning-artifacts/consolidated-security-review.md`

### Summary of Consolidated Findings

**P0 Findings:** 9 critical issues that block production
**P1 Findings:** 13 high-priority security gaps
**P2 Findings:** 10 medium-priority improvements

### Updated Epic Count

**Original Epics:** 9
**Updated Epics:** 10 (Added Epic 10: Cloud & Infrastructure Security)
**Total Stories:** ~50 stories across all epics

### Total Estimated Effort

| Phase | Duration | Effort (Days) | FTEs Needed |
|-------|----------|--------------|-------------|
| Phase 1 (P0) | 6 weeks | 44 | 1-2 |
| Phase 2 (P1) | 6 weeks | 45 | 1-2 |
| Phase 3 (P2) | 6 weeks | 53 | 1-2 |
| **TOTAL** | **18 weeks** | **142 days** | **1-2 FTEs** |

### Critical Next Steps

**Before ANY Production Deployment:**
1. Implement Epic 1 (Authentication and Authorization) - Weeks 1-4
2. Implement Epic 2 (Secrets Management) - Weeks 3-6 (parallel with Epic 1)
3. Implement CORS restriction and security headers - Week 5
4. Implement basic audit logging - Weeks 5-6

**Risk Assessment:**
- **Current Risk Level:** CRITICAL (9.2/10)
- **After Phase 1:** MEDIUM (4.5/10)
- **After Phase 2:** LOW (2.5/10)
- **After Phase 3:** MINIMAL (1.0/10)

---

## Appendices

### Appendix A: SME Review Documents Referenced

1. SM-REV-2026-02-28-001 - Initial Technical Review (Bob)
2. SME-ARCH-2026-02-28-001 - Architecture Review (Winston)
3. SME-SEC-ARCH-2026-02-28-001 - Security Architecture Review (Bastion)
4. SME-PENTEST-2026-02-28-001 - Penetration Testing Assessment (Ghost)
5. SME-COMPLIANCE-2026-02-28-001 - Compliance Assessment (Sentinel)
6. SME-WEB-2026-02-28-001 - Web Application Security Assessment (Weaver)
7. TI-REV-2026-02-28-001 - Threat Intelligence Assessment (Cipher)
8. QA-REV-2026-02-28-001 - QA Engineering Assessment (Quinn)
9. SME-BA-2026-02-28-001 - Business Analysis Assessment (Mary)
10. SME-CLOUD-2026-02-28-001 - Cloud Security Assessment (Nimbus)

### Appendix B: Priority Resolution Matrix

| Conflicting Recommendations | Resolution | Rationale |
|---------------------------|------------|-----------|
| Memory rate limiting priority | P2 (Business SME) vs P1 (others) | P2 - Monitoring can mitigate |
| BMAD framework integration | Use existing components | Architect SME efficiency finding |
| Secrets manager selection | AWS/Azure (Cloud) vs local (Arch) | Cloud for prod, local for dev |
| Authentication approach | NextAuth.js (Security Arch) | Industry standard, proven |

### Appendix C: File Inventory - Critical Security Files

**Files Requiring Immediate Modification:**

| File | Issue | Priority | Epic |
|------|-------|----------|------|
| `/packages/dojolm-web/src/lib/storage/file-storage.ts:159-180` | Plaintext API keys | P0 | Epic 2 |
| `/packages/dojolm-web/src/app/api/llm/models/route.ts` | Returns API keys | P0 | Epic 2 |
| `/packages/bu-tpi/src/serve.ts:108` | Wildcard CORS | P0 | Epic 4 |
| `/packages/dojolm-web/src/app/api/llm/local-models/route.ts` | SSRF vulnerability | P0 | Epic 4 |
| `/team/QA-tools/deploy-majutsu.sh:12` | Hardcoded password | P0 | Epic 2 |
| `/packages/dojolm-web/next.config.ts` | Missing CSP headers | P1 | Epic 4 |
| `/packages/bu-tpi/src/serve.ts:77` | Memory-based rate limiting | P1 | Epic 4 |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-28
**Next Review:** After Phase 1 completion
**Consolidated By:** Bob (Technical Scrum Master, BMAD BMM Module)

**END OF DOCUMENT**
