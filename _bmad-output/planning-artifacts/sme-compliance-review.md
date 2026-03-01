# BU-TPI Compliance Assessment Report

**Document ID:** SME-COMPLIANCE-2026-02-28-001
**Reviewer:** Sentinel - Risk & Regulatory Compliance Expert
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Regulatory Compliance Assessment
**Date:** 2026-02-28

---

## Executive Summary

The BU-TPI (DojoLM) codebase has been evaluated for compliance against major regulatory frameworks including SOC 2, GDPR, ISO 27001, and NIST. The assessment reveals **significant compliance gaps** that must be addressed before production deployment, particularly in authentication, audit logging, data protection, and privacy controls.

### Overall Compliance Posture: **SIGNIFICANT CONCERNS**

| Framework | Compliance Level | Critical Gaps | Priority |
|-----------|------------------|--------------|----------|
| SOC 2 Type II | ~20% | Audit trails, access controls, change management | P0 |
| GDPR | ~30% | Data minimization, consent, DPIA, data subject rights | P0 |
| ISO 27001 | ~25% | ISMS policies, risk assessment, access controls | P0 |
| NIST CSF | ~35% | Detect, Respond, Recover functions | P1 |
| NIST SP 800-53 | ~30% | Audit, Access Control, System Communications | P0 |

### Key Findings Summary

**Critical (P0) - Compliance Blockers:**
1. **No Authentication/Authorization** - Violates SOC 2 CC6.1, ISO 27001 A.9, GDPR Article 32
2. **No Audit Trail** - Violates SOC 2 CC7.2, ISO 27001 A.12.3, GDPR Article 30
3. **API Keys in Plaintext** - Violates SOC 2 CC6.6, ISO 27001 A.10.1, GDPR Article 32
4. **No Data Retention Policy** - Violates SOC 2 CC6.1, GDPR Article 5(1)(e)
5. **No Privacy Controls** - Violates GDPR Articles 12-23, SOC 2 CC6.7
6. **CORS Wildcard (*)** - Violates SOC 2 CC7.3, NIST SP 800-53 SC-8

**High (P1) - Significant Concerns:**
7. Non-persistent rate limiting
8. No incident response procedures documented
9. No security training documentation
10. No vendor risk management process

---

## Compliance Framework Mapping

### SOC 2 Type II Compliance Matrix

| SOC 2 Criteria | Status | Evidence | Gap | Priority |
|----------------|--------|----------|-----|----------|
| **CC6.1 - Logical Access Controls** | FAIL | No authentication implemented | Implement full auth system with MFA | P0 |
| **CC6.2 - Logical Access Policies** | FAIL | No access policies documented | Create access control policy | P0 |
| **CC6.6 - Encryption at Rest** | FAIL | API keys stored in plaintext | Encrypt secrets, use KMS | P0 |
| **CC6.7 - Privacy/PII** | FAIL | No privacy controls | Implement privacy-by-design | P0 |
| **CC7.2 - System Monitoring** | PARTIAL | Basic rate limiting only | Comprehensive audit logging | P0 |
| **CC7.3 - System Boundaries** | FAIL | CORS allows all origins | Restrict CORS to allowlist | P1 |
| **CC8.1 - Change Management** | PARTIAL | Git history exists | Formal change process | P1 |
| **A1.2 - Board Oversight** | N/A | N/A (pre-production) | Document for production | P2 |

### GDPR Article Compliance

| GDPR Article | Status | Gap | Priority |
|--------------|--------|-----|----------|
| **Article 5 - Data Minimization** | FAIL | Storing full test responses | Minimize stored data | P0 |
| **Article 12-23 - Data Subject Rights** | FAIL | No DSAR process | Implement rights mechanisms | P0 |
| **Article 25 - Privacy by Design** | FAIL | No DPIA conducted | Conduct DPIA | P0 |
| **Article 28 - Processors** | FAIL | No DPA templates | Create DPA process | P1 |
| **Article 30 - Records of Processing** | FAIL | No ROPA maintained | Create ROPA | P0 |
| **Article 32 - Security of Processing** | FAIL | Multiple gaps | Address security findings | P0 |
| **Article 33 - Breach Notification** | FAIL | No breach process | Implement breach procedures | P0 |

### ISO 27001:2022 Control Mapping

| Control | Status | Gap | Priority |
|---------|--------|-----|----------|
| **A.5.1 - Policies for Information Security** | FAIL | No ISMS policies | Create policy suite | P0 |
| **A.5.7 - Threat Intelligence** | PARTIAL | Scanner detection exists | Formal threat intel process | P1 |
| **A.8.2 - Privileged Access** | FAIL | No access control | Role-based access | P0 |
| **A.9.1 - Access Control Policy** | FAIL | No access policy | Document policy | P0 |
| **A.10.1 - Cryptographic Controls** | FAIL | No encryption | Encrypt sensitive data | P0 |
| **A.12.3 - Backup** | PARTIAL | File-based storage | Formal backup process | P1 |
| **A.12.4 - Logging** | FAIL | No comprehensive logging | Audit trail | P0 |
| **A.16.1 - Incident Management** | FAIL | No incident response | IR plan & team | P0 |

### NIST Cybersecurity Framework Functions

| Function | Subcategory | Status | Gap | Priority |
|----------|-------------|--------|-----|----------|
| **IDENTIFY** | Asset Management | PARTIAL | Package inventory exists | Comprehensive CMDB | P1 |
| **IDENTIFY** | Risk Assessment | FAIL | No formal risk assessment | Conduct risk assessment | P0 |
| **PROTECT** | Identity Management | FAIL | No IAM | Implement IAM | P0 |
| **PROTECT** | Data Security | FAIL | No data classification | Implement DLP | P0 |
| **DETECT** | Anomalous Activity | PARTIAL | Rate limiting only | SIEM integration | P1 |
| **RESPOND** | Incident Response | FAIL | No IR plan | Create IR playbook | P0 |
| **RECOVER** | Recovery Planning | FAIL | No DR plan | Create BCP/DRP | P1 |

---

## Control Gaps Analysis

### 1. Access Control Gaps (P0)

**Affected Frameworks:** SOC 2 CC6, ISO 27001 A.9, NIST AC, GDPR Article 32

**Current State:**
- File: `/packages/dojolm-web/src/app/api/llm/models/route.ts`
- No authentication on any endpoints
- API returns full model configs including API keys
- No role-based access control

**Code Evidence:**
```typescript
// Line 21-41: No authentication check
export async function GET(request: NextRequest) {
  try {
    let models = await fileStorage.getModelConfigs();
    // Returns all models including API keys
    return NextResponse.json(models);
  }
}
```

**Required Controls:**
1. Multi-factor authentication (MFA)
2. Role-based access control (RBAC)
3. Least privilege principle
4. Session timeout (15 minutes idle)
5. Account lockout after failed attempts

**Implementation Guidance:**
- Integrate with enterprise SSO (SAML/OIDC)
- Implement JWT with short TTL
- Session management with secure cookies (HttpOnly, Secure, SameSite=Strict)
- Audit all authentication events

---

### 2. Audit Logging Gaps (P0)

**Affected Frameworks:** SOC 2 CC7.2, ISO 27001 A.12.4, GDPR Article 30

**Current State:**
- Only basic console.error() logging present
- No structured audit trail
- No log retention policy
- No tamper-evident storage

**Evidence from BMAD Framework:**
The `bmad-cybersec` package includes comprehensive audit logging:
- File: `/packages/bmad-cybersec/validators/src/common/audit-logger.ts`
- Features: Session tracking, encryption support, archival scheduling
- **NOT INTEGRATED** with DojoLM web application

**Required Audit Events:**
| Event Category | Specific Events | Retention |
|----------------|-----------------|-----------|
| Authentication | Login success/failure, MFA, password changes | 90 days |
| Authorization | Access granted/denied, privilege escalations | 90 days |
| Configuration | Model CRUD, API key operations | 365 days |
| Data Access | Test case access, results queries | 90 days |
| System | Batch execution, export, delete operations | 365 days |

**Recommended Implementation:**
```typescript
// Integrate BMAD audit logger into API routes
import { AuditLogger } from '@bmad-cybersec/audit';

// Example for model creation
AuditLogger.log(
  'llm_models',
  'MODEL_CREATED',
  {
    modelId: newModel.id,
    provider: newModel.provider,
    userId: session.user.id,
    ip: request.ip
  },
  'INFO'
);
```

---

### 3. Data Protection & Encryption Gaps (P0)

**Affected Frameworks:** SOC 2 CC6.6, ISO 27001 A.10.1, GDPR Article 32

**Current State:**
- API keys stored in plaintext JSON files
- File: `/packages/dojolm-web/src/lib/storage/file-storage.ts:159-180`
- No encryption at rest or in transit
- No key management system

**Code Evidence:**
```typescript
// Lines 159-180: API key stored in plaintext
async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
  const updatedConfig: LLMModelConfig = {
    ...config,
    apiKey,  // <- PLAINTEXT STORAGE
    // ...
  };
  await writeJSON(PATHS.models, configs);  // <- PLAINTEXT JSON
}
```

**Required Controls:**
1. **Encryption at Rest:** AES-256 for all sensitive data
2. **Encryption in Transit:** TLS 1.3 only
3. **Key Management:** AWS KMS, Azure Key Vault, or HashiCorp Vault
4. **Key Rotation:** Quarterly automatic rotation
5. **Secrets Injection:** Runtime-only, no file storage

**Implementation Recommendations:**
- Use envelope encryption (DEK + KEK)
- Never log secrets, even encrypted
- Separate admin and data encryption keys
- Implement key escrow for disaster recovery

---

### 4. Privacy & GDPR Compliance Gaps (P0)

**Affected Frameworks:** GDPR Articles 5, 12-23, 25, 30, 32

**Current State:**
- No privacy policy
- No consent management
- No data subject rights implementation
- No DPIA conducted
- PII detection exists in BMAD but not integrated

**Privacy Findings:**

| Privacy Principle | Current State | Required Action |
|-------------------|---------------|-----------------|
| Lawfulness, Fairness, Transparency | N/A | Draft privacy notice |
| Purpose Limitation | FAIL | Define data purposes |
| Data Minimization | FAIL | Review stored data fields |
| Accuracy | PARTIAL | Test results accurate |
| Storage Limitation | FAIL | Define retention periods |
| Integrity & Confidentiality | FAIL | See security gaps |
| Accountability | FAIL | Implement compliance program |

**PII Handling Analysis:**

**Data Stored by DojoLM:**
- Test prompts (may contain synthetic PII)
- LLM responses (may contain generated PII)
- Model configurations (API keys - credentials)
- Execution metadata (timestamps, scores)

**Existing PII Detection (Not Integrated):**
- File: `/packages/bmad-cybersec/validators/src/guards/pii/patterns.ts`
- Comprehensive patterns: US_PATTERNS, EU_PATTERNS, COMMON_PATTERNS
- Includes SSN, IBAN, credit cards, email, DOB, etc.

**Required Privacy Controls:**
1. **Data Classification:** Label data by sensitivity
2. **Consent Management:** Capture and record consent
3. **Data Subject Rights:** Implement DSAR portal
4. **Breach Notification:** 72-hour notification process
5. **DPO Functions:** Appoint or document DPO role
6. **International Transfers:** Assess cross-border data flows

---

### 5. Data Retention Policy Gaps (P0)

**Affected Frameworks:** SOC 2 CC6.1, GDPR Article 5(1)(e), ISO 27001 A.12.3

**Current State:**
- File: `/packages/dojolm-web/src/lib/storage/file-storage.ts:451-469`
- Has `clearOldExecutions(retentionDays)` function
- No documented policy
- Default 90-day retention hardcoded

**Code Evidence:**
```typescript
// Lines 451-469: Basic cleanup but no policy
async clearOldExecutions(retentionDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  // ... deletes without logging
}
```

**Required Retention Policy:**

| Data Type | Min Retention | Max Retention | Disposition |
|-----------|---------------|---------------|-------------|
| Audit Logs | 90 days | 7 years | Secure deletion |
| Test Executions | 30 days | 2 years | Anonymize after 90 days |
| Model Configs | N/A | Until deleted | Secure deletion |
| Session Data | 24 hours | 7 days | Auto-delete |
| Error Logs | 30 days | 1 year | Secure deletion |
| Backups | Per recovery objective | Per recovery objective | Secure deletion |

**Implementation Requirements:**
1. Document retention schedule
2. Automated deletion with verification
3. Legal hold process for litigation
4. Audit trail of all deletions
5. Secure deletion methods (NIST 800-88)

---

### 6. API Security Gaps (P1)

**Affected Frameworks:** SOC 2 CC7.3, NIST SP 800-53 SC-8, ISO 27001 A.13.1

**Current State:**
- File: `/packages/bu-tpi/src/serve.ts:108`
- CORS allows wildcard origins
- No API versioning
- No request signing

**Code Evidence:**
```typescript
// Line 108: Overly permissive CORS
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Required Controls:**
1. **Origin Validation:** Whitelist specific origins
2. **API Authentication:** Signed requests or tokens
3. **Rate Limiting:** Per-user, persistent storage
4. **Input Validation:** Schema validation (Zod already available)
5. **Response Filtering:** Strip sensitive fields

---

## Audit Trail Requirements

### Events to Log (Minimum Viable)

| Event ID | Event Name | Category | Severity | Retention |
|----------|------------|----------|----------|-----------|
| AUTH-001 | Login Success | Authentication | INFO | 90 days |
| AUTH-002 | Login Failure | Authentication | WARNING | 90 days |
| AUTH-003 | Account Lockout | Authentication | HIGH | 365 days |
| AUTH-004 | MFA Challenge | Authentication | INFO | 90 days |
| ACCESS-001 | API Access | Authorization | INFO | 90 days |
| ACCESS-002 | Access Denied | Authorization | WARNING | 90 days |
| CONFIG-001 | Model Created | Configuration | INFO | 365 days |
| CONFIG-002 | Model Updated | Configuration | INFO | 365 days |
| CONFIG-003 | Model Deleted | Configuration | HIGH | 365 days |
| CONFIG-004 | API Key Accessed | Configuration | HIGH | 365 days |
| DATA-001 | Test Case Created | Data | INFO | 90 days |
| DATA-002 | Test Case Deleted | Data | INFO | 90 days |
| EXEC-001 | Test Execution | System | INFO | 90 days |
| EXEC-002 | Batch Execution | System | INFO | 90 days |
| EXPORT-001 | Data Export | Data | HIGH | 365 days |
| DELETE-001 | Bulk Delete | Data | HIGH | 365 days |
| SEC-001 | Security Event Detected | Security | HIGH | 365 days |
| SEC-002 | PII Detected | Privacy | WARNING | 90 days |

### Log Format Standard

```typescript
interface AuditLogEntry {
  timestamp: string;           // ISO 8601
  event_id: string;            // From table above
  event_name: string;          // Human-readable
  category: string;            // Category from table
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  user_id?: string;            // Authenticated user (never null for user actions)
  session_id: string;          // Session identifier
  ip_address: string;          // Client IP
  user_agent?: string;         // Client user agent
  resource_id?: string;        // Affected resource
  resource_type?: string;      // Resource type
  action: string;              // Performed action
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  details: Record<string, unknown>;  // Additional context (PII redacted)
  correlation_id?: string;     // For tracing related events
}
```

### Log Protection Requirements

1. **Tamper Evidence:** Cryptographic hash chain (BMAD supports this)
2. **Access Control:** Write-only for application, read-only for auditors
3. **Backup:** Separate backup system
4. **Monitoring:** Alert on unusual patterns
5. **Analytics:** SIEM integration for correlation

---

## Compliance Evidence Collection Needs

### SOC 2 Evidence Requirements

| Control | Evidence Type | Collection Frequency | Storage |
|---------|---------------|---------------------|---------|
| Access Controls | Access review reports | Quarterly | Compliance bucket |
| Change Management | Change tickets with approval | Per change | Git + ticketing system |
| Encryption | Key rotation logs | Per rotation | KMS logs |
| Incident Response | Incident tickets | Per incident | IR system |
| Training | Training completion records | Per employee | HR system |
| Vendor Management | Due diligence questionnaires | Per vendor | Vendor system |
| Risk Assessment | Risk register | Annually | Compliance system |

### GDPR Evidence Requirements

| Requirement | Evidence | Retention | Location |
|-------------|----------|-----------|----------|
| Lawful Basis | Records of processing | Retention period | ROPA |
| Consent | Consent logs | Duration of processing | Consent DB |
| Data Subject Rights | DSAR logs | 3 years | Privacy system |
| DPIA | DPIA documentation | Retention period | Compliance system |
| Breaches | Breach log | 5 years | Incident system |
| Transfers | Transfer impact assessments | 5 years | Compliance system |

---

## Recommended Compliance Controls Per Epic

### Epic 1: Authentication and Authorization

**SOC 2 Controls:** CC6.1, CC6.2, CC6.7
**ISO Controls:** A.9.1, A.9.2, A.9.3, A.9.4
**NIST Controls:** AC-1, AC-2, AC-3, AC-6, AC-7, AC-14, IA-1, IA-2, IA-3

**Required Implementations:**
1. MFA for all admin access
2. Password policy (min 12 chars, complexity)
3. Session timeout (15 min idle, 8 hr absolute)
4. Account lockout (5 failed attempts, 30 min lockout)
5. Privileged access review (quarterly)
6. Just-in-time access for sensitive operations

---

### Epic 2: Secrets Management

**SOC 2 Controls:** CC6.1, CC6.6, CC6.7
**ISO Controls:** A.10.1, A.10.2
**NIST Controls:** SC-12, SC-13, SC-28, SC-39

**Required Implementations:**
1. Integration with AWS KMS / Azure Key Vault
2. Envelope encryption (RSA-4096 + AES-256)
3. Automatic key rotation (quarterly)
4. Secret injection at runtime only
5. No secrets in environment variables
6. Emergency access procedure

---

### Epic 3: Audit Logging

**SOC 2 Controls:** CC7.2, CC7.3, CC7.4
**ISO Controls:** A.12.3, A.12.4, A.14.2, A.16.1
**NIST Controls:** AU-1 through AU-12, IR-4, IR-5

**Required Implementations:**
1. Integrate BMAD audit logger across all APIs
2. Log schema compliance with above format
3. Tamper-evident log storage
4. SIEM integration
5. Log review process (weekly)
6. Alert on security events

---

### Epic 4: Data Protection & Privacy

**SOC 2 Controls:** CC6.1, CC6.6, CC6.7
**ISO Controls:** A.18.1 (Privacy)
**GDPR:** Articles 12-23, 25, 30, 32

**Required Implementations:**
1. Privacy policy and notice
2. Consent management platform
3. Data classification framework
4. PII detection (integrate BMAD PII guards)
5. DSAR request portal
6. Data minimization review
7. DPIA for high-risk processing

---

### Epic 5: Incident Response

**SOC 2 Controls:** CC8.1
**ISO Controls:** A.5.24, A.16.1, A.17.1
**NIST Controls:** IR-1 through IR-8, CP-1 through CP-10

**Required Implementations:**
1. Incident response plan (documented)
2. Incident classification matrix
3. Response team with roles
4. Escalation procedures
5. Breach notification procedures (GDPR 72-hour)
6. Post-incident reviews
7. Tabletop exercises (semi-annual)

---

## Compliance Roadmap

### Phase 1: Critical Controls (0-90 Days)

| Control | Owner | Deliverable | Deadline |
|---------|-------|-------------|----------|
| Authentication | Engineering | Auth system with MFA | Day 30 |
| Audit Logging | Engineering | Comprehensive audit trail | Day 45 |
| Encryption | Engineering | Secrets encryption at rest | Day 60 |
| Access Policy | Governance | Access control policy | Day 30 |
| Privacy Notice | Legal | GDPR-compliant privacy notice | Day 45 |
| Incident Response | Security | IR plan and team charter | Day 60 |

### Phase 2: Compliance Evidence (90-180 Days)

| Control | Owner | Deliverable | Deadline |
|---------|-------|-------------|----------|
| ROPA | Privacy | Records of Processing Activities | Day 120 |
| DPIA | Privacy | Data Protection Impact Assessment | Day 150 |
| DPA Templates | Legal | Data Processing Agreements | Day 120 |
| Training | HR | Security training program | Day 180 |
| Vendor Review | Procurement | Vendor risk assessment | Day 150 |

### Phase 3: Certification Readiness (180-365 Days)

| Control | Owner | Deliverable | Deadline |
|---------|-------|-------------|----------|
| SOC 2 Readiness | Compliance | SOC 2 Type I readiness | Day 270 |
| ISO 27001 Gap | Compliance | Gap analysis and remediation | Day 300 |
| Penetration Test | Security | Third-party pen test | Day 240 |
| BCP/DR Plan | Operations | Business Continuity Plan | Day 270 |
| Continuous Monitoring | Security | SIEM implementation | Day 300 |

---

## Priority Recommendations

### Immediate (P0) - Production Blockers

1. **DO NOT DEPLOY TO PRODUCTION** until authentication is implemented
2. **Encrypt all API keys** at rest and in transit
3. **Implement comprehensive audit logging** before any user data processing
4. **Restrict CORS** to specific origins only
5. **Document data retention policy** and implement automated cleanup

### High Priority (P1) - Compliance Foundation

1. Conduct GDPR DPIA
2. Draft and publish privacy policy
3. Implement RBAC with least privilege
4. Establish incident response procedures
5. Integrate BMAD audit logger across the application

### Medium Priority (P2) - Continuous Improvement

1. Conduct ISO 27001 gap analysis
2. Implement security awareness training
3. Establish vendor risk management program
4. Deploy SIEM for log correlation
5. Conduct third-party penetration test

---

## Appendix: Compliance Tool References

### BMAD Framework Components Available

The BMAD Cybersec package includes compliance-ready components:

| Component | Location | Usage |
|-----------|----------|-------|
| Audit Logger | `packages/bmad-cybersec/validators/src/common/audit-logger.ts` | Structured logging with tamper evidence |
| PII Detection | `packages/bmad-cybersec/validators/src/guards/pii/` | PII pattern matching for US/EU |
| Audit Encryption | `packages/bmad-cybersec/validators/src/observability/audit-encryption.ts` | Encrypt audit logs at rest |
| Audit Integrity | `packages/bmad-cybersec/validators/src/observability/audit-integrity.ts` | Cryptographic hash chaining |
| Anomaly Detection | `packages/bmad-cybersec/validators/src/observability/anomaly-detector.ts` | Behavioral analysis |

**Recommendation:** These components should be integrated into the DojoLM web application rather than building new implementations.

---

## Conclusion

The BU-TPI codebase demonstrates strong security awareness in the scanner and binary parsing components, but has significant compliance gaps in areas required for production deployment. The existing BMAD Cybersec framework provides many of the building blocks needed to address these gaps.

**Key Takeaway:** The application should NOT be deployed to production until at minimum the P0 items are addressed, particularly authentication, audit logging, and secrets encryption.

**Next Steps:**
1. Executive review of compliance findings
2. Resource allocation for Phase 1 implementations
3. Engagement with legal counsel for GDPR compliance
4. Selection of authentication and secrets management solutions
5. Development of compliance documentation suite

---

**Document Version:** 1.0
**Review Status:** Initial Assessment
**Next Review:** Upon completion of Phase 1 controls
**Reviewed By:** Sentinel - Risk & Regulatory Compliance Expert
**Date:** 2026-02-28
