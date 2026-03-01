# Business Analysis Assessment: SM Security Review Plan
# BU-TPI (DojoLM) LLM Red Teaming Platform

**Document ID:** SME-BA-2026-02-28-001
**Author:** Mary (Business Analyst, BMAD BMM Module)
**Reviewer:** Bob (Technical Scrum Master, BMAD BMM Module)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Business Requirements & Risk Assessment
**Date:** 2026-02-28

---

## Executive Summary

This business analysis reviews the Security Master (SM) security review plan for the BU-TPI codebase from a business requirements perspective. The platform is a comprehensive LLM red teaming and security testing tool focused on prompt injection detection based on the CrowdStrike TPI Taxonomy and OWASP LLM Top 10.

**Overall Business Risk Assessment: HIGH PRIORITY FOR REMEDIATION**

The security findings present significant business risks that must be addressed before any production deployment involving real API keys or sensitive testing data. However, several findings can be de-prioritized based on deployment context.

**Key Business Insight:** This is fundamentally a **security testing tool**, not a consumer application. The business requirements for security differ significantly from typical SaaS products.

---

## Business Risk Assessment

### Critical Business Risks (P0) - Immediate Action Required

| Risk | Business Impact | Affected Users | Compliance |
|------|----------------|----------------|------------|
| **No Authentication/Authorization** | Unauthorized testing costs, API key theft, data exposure | All users | HIPAA/GDPR violation if testing sensitive prompts |
| **Plaintext API Key Storage** | Direct financial liability (API quota theft), credential leakage | Platform administrators | SOC 2 violation, PCI-DSS applicability |
| **Wildcard CORS (`*`)** | CSRF attacks, third-party data exfiltration | All users | OWASP A01:2021 violation |

### High Business Risks (P1) - Short-term Action Required

| Risk | Business Impact | Affected Users | Mitigation Cost |
|------|----------------|----------------|-----------------|
| **No Audit Logging** | No forensic capability, cannot investigate abuse | Administrators, auditors | Medium |
| **Memory-based Rate Limiting** | Abuse through server restart, DoS vulnerability | All users | Low-Medium |
| **Generic Error Messages Missing** | Information disclosure, debugging difficulty | Support team | Low |

### Medium Business Risks (P2) - Can be Deferred

| Risk | Business Impact | Affected Users | Mitigation Cost |
|------|----------------|----------------|-----------------|
| **Outdated Dependencies** | Known vulnerabilities, supply chain risk | All users | Medium |
| **Path Traversal Protection Review** | Potential unauthorized file access | All users | Low |

---

## User Impact Analysis

### Authentication Changes Impact

**Current State:** Open access to all functionality
**Proposed State:** Authenticated access with role-based permissions

**User Experience Impacts:**

| User Type | Current Experience | Post-Authentication Impact | Mitigation |
|-----------|-------------------|---------------------------|------------|
| **Security Researchers** | Immediate testing, no friction | Additional login step | SSO integration, session persistence |
| **Development Teams** | Quick prototyping, easy sharing | Credential management overhead | API key alternative, team accounts |
| **External Evaluators** | Cannot access without invitation | Clear access control | Guest/external user roles |
| **Automated Testing Scripts** | Direct API calls | Authentication tokens required | Service account API keys |

**Recommendation:** Implement authentication in phases:
1. **Phase 1:** Optional authentication with clear warnings for unauthenticated users
2. **Phase 2:** Required authentication for persistent operations (saving models, viewing history)
3. **Phase 3:** Required authentication for all operations

### Secrets Management Impact

**Current State:** API keys stored in `data/llm-results/models.json` (plaintext)
**Business Impact:** Organizations cannot safely store cloud LLM credentials

**User Experience Impacts:**
- **Positive:** Enables enterprise adoption with secure credential storage
- **Negative:** Additional setup complexity for self-hosted deployments

**Recommendation:** Support multiple credential management patterns:
1. **Enterprise:** HashiCorp Vault/AWS Secrets Manager integration
2. **Team/Small Business:** Environment variables with encryption at rest
3. **Individual:** Runtime-only credentials (not persisted)

### Rate Limiting Impact

**Current State:** 120 requests/minute per IP, reset on server restart
**Business Impact:** Vulnerable to abuse through server restart

**User Experience Impacts:**
- Testing against local models (Ollama) should have higher/no limits
- Cloud LLM testing should respect provider rate limits
- Batch operations need separate quota calculation

**Recommendation:** Implement tiered rate limiting:
- **Free tier:** 100 requests/hour per IP
- **Authenticated:** 1,000 requests/hour per user
- **Local models:** No limit (no external cost)
- **Batch mode:** Reserve quota, progress notifications

---

## Requirements Validation

### Business Logic Validation

**Finding:** The current architecture supports the core business requirements:

| Requirement | Status | Notes |
|-------------|--------|-------|
| LLM model testing against security prompts | ✅ Implemented | 17 API endpoints cover full workflow |
| OWASP LLM Top 10 coverage | ✅ Implemented | Test cases categorized by LLM01-LLM10 |
| CrowdStrike TPI coverage | ✅ Implemented | Test cases categorized by TPI-01 to TPI-20 |
| Multi-provider support | ✅ Implemented | 10 providers supported (OpenAI, Anthropic, Ollama, etc.) |
| Batch testing | ✅ Implemented | Up to 100 tests per batch |
| Results comparison | ✅ Implemented | Coverage maps, resilience scores |
| Report generation | ✅ Implemented | JSON, Markdown, PDF export |

**Gaps Identified:**
1. **No test case versioning** - Critical for reproducible research
2. **No collaborative testing features** - Team-based testing workflows
3. **No API usage tracking** - Cost management for cloud LLM usage
4. **No test result provenance** - Chain of custody for audit/compliance

### Data Handling Requirements

**Current Architecture:** File-based JSON storage in `data/llm-results/`

**Business Requirements Analysis:**

| Requirement | Current State | Risk | Recommendation |
|-------------|--------------|------|----------------|
| **Data persistence** | JSON files | Low - Simple but not scalable | Add database option for scale |
| **Data backup** | Filesystem backup | Medium - No built-in backup | Document backup procedures |
| **Data retention** | Manual cleanup | High - No automatic pruning | Implement retention policy |
| **Data isolation** | Single shared storage | High - No multi-tenancy | Add user/project scoping |
| **Data export** | API endpoints | Low - Export available | Consider bulk export |
| **Data deletion** | API exists | Low - Deletion supported | Add bulk deletion |

**Recommendation:** Add storage abstraction layer to support:
1. Development/Small deployments: File-based (current)
2. Team/Enterprise: PostgreSQL/MySQL database
3. Cloud: S3-compatible object storage for results

---

## Risk-Benefit Analysis for Security Investments

### Priority Reconciliation: SM vs. Business Perspective

| SM Priority | Finding | Business Priority | Rationale for Adjustment |
|-------------|---------|-------------------|---------------------------|
| P0 | No Authentication | **P0** | Agreed - Required for production |
| P0 | Plaintext Secrets | **P0** | Agreed - Required for production |
| P1 | Wildcard CORS | **P1** | Agreed - But lower if self-hosted only |
| P1 | Memory-based Rate Limiting | **P2** | Lower priority - Abuse detection can mitigate |
| P1 | No Audit Logging | **P0** | **ELEVATE** - Critical for enterprise sales |
| P2 | Outdated Dependencies | **P2** | Agreed - But not blocking |
| P1 | Binary Parser DoS | **P1** | Agreed - Important for public deployments |

### Investment Prioritization Matrix

**High Business Value, Low Effort (Quick Wins):**
1. **Generic error messages** (P1) - 1-2 days, reduces information disclosure
2. **CORS restriction to specific origins** (P1) - 1 day, removes CSRF risk
3. **Basic audit logging** (elevated to P0) - 3-5 days, enables compliance

**High Business Value, High Effort (Strategic Investments):**
1. **Authentication/Authorization** (P0) - 2-3 weeks, enables enterprise sales
2. **Secrets encryption at rest** (P0) - 1-2 weeks, required for production
3. **Persistent rate limiting** (P1) - 1 week, prevents abuse

**Low Business Value, Low Effort (Backlog):**
1. **Path traversal protection review** (P2) - 1-2 days, current protection adequate
2. **Dependency updates** (P2) - Ongoing maintenance, can automate

**Low Business Value, High Effort (Defer):**
1. **Comprehensive fuzzing framework** (P2) - 2-3 weeks, limited ROI for testing tool
2. **Binary file quarantine system** (P1) - 1-2 weeks, parser limits sufficient

---

## Compliance Business Justifications

### Regulatory Compliance Impact Assessment

| Regulation/Standard | Applicability | Current Gap | Remediation Cost | Business Impact |
|--------------------|---------------|-------------|------------------|-----------------|
| **SOC 2 Type II** | High (B2B sales) | No audit logging, no access controls | High | Blocks enterprise sales |
| **GDPR** | Medium (EU users) | No data deletion verification, no consent tracking | Medium | Limits EU market |
| **HIPAA** | Low (unless healthcare prompts tested) | No encryption at rest | Medium | Niche market impact |
| **PCI DSS** | Low (no payment data) | N/A | N/A | Not applicable |
| **ISO 27001** | Medium (enterprise sales) | No formal security controls | High | Preferred but not required |
| **NIST AI RMF** | High (AI safety focus) | Partial alignment | Low | Market differentiation |

### Minimum Viable Security (MVS) for Different Deployment Models

| Deployment Model | MVS Requirements | Business Case |
|------------------|------------------|---------------|
| **Local/Development Only** | Basic input validation, file permissions | Individual researchers |
| **Team/Internal Cloud** | Authentication, secrets encryption, audit logging | Small security teams |
| **SaaS/Public** | All P0 + P1 items + compliance documentation | Commercial product |
| **Enterprise On-Prem** | All above + SSO integration, RBAC, audit export | Large enterprises |

**Recommendation:** Develop security tiers aligned with deployment models to avoid over-engineering for small-scale use cases.

---

## Recommendations for Stakeholder Communication

### Executive Summary for Leadership

```
BU-TPI Security Status: ACTION REQUIRED BEFORE PRODUCTION

Critical Findings (2):
- No user authentication - anyone can access the platform
- API keys stored in plaintext - credential theft risk

High Priority Findings (3):
- No audit logging - cannot track who did what
- Rate limiting resets on restart - vulnerable to abuse
- Wildcard CORS setting - cross-site attack risk

Business Impact:
- Cannot sell to enterprise customers without audit logging
- API key theft could result in unexpected cloud LLM costs
- No accountability for testing activities

Recommended Actions:
1. Implement authentication (Priority: CRITICAL)
2. Encrypt API keys at rest (Priority: CRITICAL)
3. Add audit logging (Priority: CRITICAL for enterprise sales)

Timeline: 4-6 weeks for critical items
Budget: Estimated 2-3 developer weeks
```

### Technical Summary for Engineering Team

```
Security Review Priorities (Re-ordered for Business Value):

Week 1-2 (CRITICAL):
1. Authentication middleware with role-based access
2. API key encryption at rest (Node.js crypto or KMS)
3. Basic audit logging for all state-changing operations

Week 3-4 (HIGH):
4. Restrict CORS to specific origins
5. Implement generic error responses
6. Add persistent rate limiting (Redis or filesystem)

Week 5-6 (MEDIUM):
7. Path traversal protection verification
8. Secrets management integration (optional for MVP)
9. Audit log viewer UI

Deferred:
- Dependency updates (can parallelize)
- Fuzzing framework (low ROI)
- Binary quarantine (parser limits sufficient)

Technical Debt to Track:
- File-based storage needs abstraction layer
- No multi-tenancy support
- Test result versioning missing
```

### User Communication for Existing Users

```
Platform Security Updates - What to Expect

Dear DojoLM Users,

We're enhancing platform security to enable team collaboration and
enterprise features. Here's what's changing:

Phase 1 (Immediate):
- Warning banners for unauthenticated access
- Optional account creation for saving your work

Phase 2 (Coming Soon):
- Secure API key storage (your keys will be encrypted)
- Activity tracking for compliance and debugging

Phase 3 (Future):
- Team workspaces for shared testing
- SSO integration for enterprise users

What You Need to Do:
- No action required if you're testing locally
- For cloud LLM testing, consider re-entering API keys
  after the security update

Your Feedback:
- What authentication methods work best for your workflow?
- Do you need offline/local-only mode?

Thank you for being part of the DojoLM security community!
```

---

## Prioritization Rationale

### Business Value Framework

The following framework was used to prioritize security findings:

**Factors:**
1. **Revenue Impact** - Does this block sales?
2. **Cost Impact** - Does this create financial liability?
3. **User Impact** - Does this affect user experience negatively?
4. **Compliance** - Is this required for regulations?
5. **Effort** - How much development time is required?

**Priority Score Calculation:**
```
Priority = (Revenue Impact x 3) + (Cost Impact x 2) + (Compliance x 2) + User Impact - (Effort / 5)
```

**Re-Prioritized Findings:**

| Finding | Revenue | Cost | Compliance | User | Effort | Score | Priority |
|---------|---------|------|------------|------|--------|-------|----------|
| No audit logging | Blocks enterprise | Low | SOC 2 required | Neutral | 5 days | 15 | P0 |
| No authentication | Blocks enterprise | Medium | SOC 2 required | Negative | 15 days | 14 | P0 |
| Plaintext secrets | Medium | High | SOC 2 required | Neutral | 10 days | 14 | P0 |
| Wildcard CORS | Low | Low | OWASP | Neutral | 1 day | 5 | P1 |
| Memory rate limiting | Low | Medium | None | Neutral | 5 days | 4 | P2 |
| Outdated dependencies | Low | Low | None | Neutral | 2 days | 1 | P2 |

---

## Deployment Context Considerations

### Critical Question: What is the Target Deployment Model?

The business impact of security findings varies dramatically by deployment context:

**Scenario A: Local Development Only**
- Authentication: Optional
- Secrets management: Environment variables acceptable
- CORS: Localhost-only sufficient
- Audit logging: Basic file logging acceptable

**Scenario B: Internal Team Server**
- Authentication: Required (team accounts)
- Secrets management: Encryption at rest required
- CORS: Restrict to internal domains
- Audit logging: Required for accountability

**Scenario C: Public SaaS**
- Authentication: Required with SSO option
- Secrets management: Enterprise vault integration
- CORS: Strict origin allowlist
- Audit logging: Comprehensive with export

**Recommendation:** Confirm target deployment model before finalizing security priorities. A staged rollout (A → B → C) allows incremental security investment aligned with business value.

---

## Appendix: Business Process Analysis

### Current Business Workflows

**Workflow 1: Single Model Testing**
```
1. User configures model (API key entry)
2. User selects test cases
3. System executes tests
4. System displays results
5. User reviews scores
```

**Security Integration Points:**
- Step 1: API key encryption needed
- Step 3: Rate limiting per user
- Step 4: Prevent data leakage between users

**Workflow 2: Batch Testing**
```
1. User selects multiple models and test cases
2. System creates batch job
3. System executes tests in background
4. System updates progress
5. User views completed results
```

**Security Integration Points:**
- Step 2: Resource quota enforcement
- Step 4: Progress notification authorization
- Step 5: Result access control

**Workflow 3: Report Generation**
```
1. User configures report parameters
2. System aggregates results
3. System generates report (JSON/MD/PDF)
4. User downloads report
```

**Security Integration Points:**
- Step 2: Data access validation
- Step 3: Sensitive data redaction (if needed)
- Step 4: Download logging

---

## Conclusion and Next Steps

### Summary

The SM's security review identifies valid technical concerns, but the business priority differs from technical severity. Key adjustments:

1. **Elevate audit logging to P0** - Critical for enterprise sales
2. **Deprioritize memory-based rate limiting to P2** - Can be monitored/mitigated
3. **Add context-specific requirements** - Security needs vary by deployment model

### Action Items

**Immediate (This Week):**
- [ ] Confirm target deployment model(s) with product leadership
- [ ] Prioritize findings based on confirmed deployment context
- [ ] Estimate development effort for re-prioritized items

**Short-term (Next 2 Weeks):**
- [ ] Begin authentication/authorization design
- [ ] Implement basic audit logging framework
- [ ] Design secrets encryption approach

**Medium-term (Next 4-6 Weeks):**
- [ ] Complete P0 security implementations
- [ ] Begin P1 implementations
- [ ] Plan user communication for security changes

**Questions for Stakeholders:**
1. Is the target market individual researchers, teams, or enterprises?
2. What is the go-to-market timeline - can security be phased?
3. Are there specific compliance requirements (SOC 2, ISO 27001) for target customers?
4. What is the budget for security improvements?
5. Can we release a "security preview" with limited users to validate approach?

---

**Document Status:** Ready for Review
**Next Review:** After stakeholder confirmation of deployment model
**Contact:** Mary (Business Analyst, BMAD BMM Module)
**Document Version:** 1.0
**Last Updated:** 2026-02-28
