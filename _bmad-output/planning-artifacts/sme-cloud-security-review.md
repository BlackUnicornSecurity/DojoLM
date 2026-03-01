# BU-TPI Cloud Security Assessment

**Document ID:** SME-CLOUD-2026-02-28-001
**Reviewer:** Nimbus (Cloud Security Architect, BMAD Cybersec Team)
**Project:** DojoLM - LLM Red Teaming and Security Testing Platform
**Review Type:** Cloud Security & Infrastructure Assessment
**Date:** 2026-02-28

---

## Executive Summary

The BU-TPI (DojoLM) codebase demonstrates a **transitional cloud posture** with basic containerization implemented but significant gaps in enterprise cloud security practices. The project is currently architected for on-premises/internal deployment with plans for cloud migration, presenting both opportunities and security considerations.

### Overall Cloud Security Posture: **MODERATE - TRANSITIONAL**

| Cloud Security Domain | Status | Priority | Cloud Readiness |
|----------------------|--------|----------|-----------------|
| Container Security | Partial | P1 | 60% |
| Infrastructure as Code | Absent | P0 | 0% |
| CI/CD Security | Minimal | P1 | 20% |
| Secrets Management | Critical Gap | P0 | 10% |
| IAM & Access Control | Not Implemented | P0 | 0% |
| Network Security | Basic | P1 | 30% |
| Monitoring & Logging | Minimal | P1 | 20% |
| Compliance & Governance | Not Started | P2 | 0% |

### Key Cloud Security Findings

**Critical (P0):**
- No infrastructure as code (IaC) for reproducible deployments
- Secrets hardcoded in deployment scripts
- No cloud IAM integration or role-based access
- Missing secrets management for cloud environments
- Deployment script contains plaintext credentials

**High (P1):**
- Dockerfile security hardening gaps
- No container image scanning pipeline
- No CI/CD security controls (SAST, SCA, container scanning)
- Inadequate network security policies for cloud deployment
- Missing cloud-native monitoring and alerting

**Medium (P2):**
- No multi-region or high-availability considerations
- Missing disaster recovery procedures for cloud
- No cloud cost optimization or governance
- Limited observability for cloud-native debugging

---

## Part 1: Container Security Assessment

### 1.1 Dockerfile Analysis

**File Reviewed:** `/Users/paultinp/BU-TPI/packages/dojolm-web/Dockerfile`

#### Strengths

1. **Multi-stage build pattern** - Reduces final image size and attack surface
2. **Non-root user execution** - Creates and runs as `nextjs` user (uid 1001)
3. **Alpine-based images** - Uses `node:20-alpine` for minimal attack surface
4. **Explicit port declaration** - PORT 3000 documented

#### Critical Security Gaps

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No security context hardening | P1 | Dockerfile:29-62 | Add security-opt, read-only root fs |
| Missing base image pinning | P1 | Dockerfile:5, 29 | Use digest-pinned images |
| No health check defined | P1 | Dockerfile:62 | Add HEALTHCHECK instruction |
| No image signature verification | P0 | Build process | Implement Docker Content Trust |
| Missing .dockerignore patterns | P2 | .dockerignore | Exclude development artifacts |

#### Recommended Production Dockerfile Hardening

```dockerfile
# Add security-specific configurations
FROM node:20-alpine@sha256:<DIGEST> AS builder

# Build stage security
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 nextjs && \
    apk add --no-cache ca-certificates

# Set security policies
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048"

# Production stage with security hardening
FROM node:20-alpine@sha256:<DIGEST> AS runner

# Security defaults
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user with proper groups
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app && \
    chown -R nextjs:nodejs /app

WORKDIR /app

# Copy with proper permissions
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security hardening
RUN chmod -R 755 /app && \
    chmod -R 644 /app/**/*.js /app/**/*.json

USER nextjs

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000

# Read-only root filesystem (requires tmpfs for /tmp)
# VOLUME ["/tmp"]

# Security options for container runtime
# # no-new-privileges, drop capabilities, seccomp profile needed in compose/orchestration

CMD ["node", "server.js"]
```

### 1.2 Container Registry & Image Security

**Current State:** No container registry strategy documented

**Recommendations:**

1. **Private Container Registry**
   - Use AWS ECR, Azure Container Registry, or GCP Artifact Registry
   - Enable immutable tags for production images
   - Implement vulnerability scanning on push (Trivy, Snyk, AWS Inspector)

2. **Image Signing**
   - Implement Docker Content Trust (Notary v2)
   - Sign all production images
   - Verify signatures before deployment

3. **SBOM Generation**
   - Generate Software Bill of Materials for each image
   - Use Syft or Microsoft SBOM Tool
   - Store SBOM with image metadata

---

## Part 2: Infrastructure as Code (IaC) Gap Analysis

### 2.1 Current State

**Finding:** No Infrastructure as Code implementation found

**Implications:**
- Manual deployment processes are error-prone
- No reproducible environments across dev/staging/prod
- Difficult to implement change management
- Cannot leverage cloud-native security controls
- No infrastructure drift detection

### 2.2 Recommended IaC Strategy

#### Option A: Terraform (Recommended for Multi-Cloud)

```
terraform/
├── modules/
│   ├── ecs-cluster/          # ECS/Fargate deployment
│   ├── rds-database/         # Managed PostgreSQL
│   ├── secrets-manager/      # AWS Secrets Manager
│   ├── vpc/                  # Network isolation
│   └── alb/                  # Application Load Balancer
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
└── main.tf
```

#### Option B: AWS CDK (For AWS-Native Deployments)

- Type-safe IaC with TypeScript
- Native integration with AWS services
- Best for teams already using TypeScript

#### Option C: Kubernetes with Helm

- For complex, scalable deployments
- Requires managed EKS/GKE/AKS
- Steeper learning curve

### 2.3 Minimum IaC Requirements

For production cloud deployment, the following IaC modules should be implemented:

1. **Network Infrastructure**
   - VPC with public/private subnets
   - Security groups with least privilege
   - Network ACLs for additional layer
   - VPC endpoints for private AWS API access

2. **Compute Resources**
   - Container orchestration (ECS/EKS or equivalent)
   - Auto-scaling policies
   - Health check configurations
   - Resource limits and requests

3. **Data Storage**
   - Managed database (RDS/Cloud SQL/Azure Database)
   - Encrypted storage (S3 Blob Storage)
   - Backup and retention policies

4. **Security Services**
   - Secrets Manager integration
   - Certificate Manager (SSL/TLS)
   - WAF rules for API protection
   - Security Hub/Defender integration

---

## Part 3: CI/CD Pipeline Security

### 3.1 Current State Assessment

**Finding:** CI/CD pipeline is underdeveloped with minimal security controls

**Current Capabilities:**
- Local build and test via npm scripts
- Manual deployment via shell script
- Basic npm audit for dependencies

**Missing Security Controls:**
- No automated SAST (Static Application Security Testing)
- No SCA (Software Composition Analysis) automation
- No container image scanning
- No IaC security scanning
- No secrets detection in commits

### 3.2 Recommended CI/CD Security Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CI/CD SECURITY PIPELINE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌────────────┐     │
│  │   Push  │ -> │   Build  │ -> │  Scan   │ -> │   Test     │     │
│  │ Trigger │    │   Image  │    │ Phase   │    │   Phase    │     │
│  └─────────┘    └──────────┘    └─────────┘    └────────────┘     │
│                                     |                |              │
│                                     v                v              │
│                       ┌──────────────────────────────────────┐    │
│                       │     Security Scan Phase               │    │
│                       ├──────────────────────────────────────┤    │
│                       │ - SAST (CodeQL, Semgrep)            │    │
│                       │ - SCA (npm audit, Snyk)              │    │
│                       │ - Container Scanning (Trivy)         │    │
│                       │ - IaC Scanning (tfsec, Checkov)      │    │
│                       │ - Secrets Scanning (gitleaks)        │    │
│                       └──────────────────────────────────────┘    │
│                                     |                               │
│                                     v                               │
│                       ┌─────────────────────────────┐             │
│                       │   Policy Gate / Approval    │             │
│                       ├─────────────────────────────┤             │
│                       │ - Vulnerability thresholds  │             │
│                       │ - License compliance        │             │
│                       │ - Manual approval for prod  │             │
│                       └─────────────────────────────┘             │
│                                     |                               │
│                                     v                               │
│                       ┌─────────────────────────────┐             │
│                       │      Deploy Phase           │             │
│                       ├─────────────────────────────┤             │
│                       │ - Dev auto-deploy           │             │
│                       │ - Staging auto-deploy       │             │
│                       │ - Prod manual approval      │             │
│                       └─────────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 GitHub Actions Security Workflow Example

```yaml
# .github/workflows/security-pipeline.yml
name: Security Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  sast:
    name: SAST Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript

  sca:
    name: Dependency Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Snyk Test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  container-scan:
    name: Container Image Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t dojolm-web:${{ github.sha }} .
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: dojolm-web:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: trivy-results.sarif

  secrets-scan:
    name: Secrets Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2

  iac-scan:
    name: IaC Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1
        with:
          working_directory: terraform/environments/production
```

### 3.4 Branch Protection Rules

For cloud deployments, implement:

1. **Main Branch Protection**
   - Require pull request reviews
   - Require status checks to pass
   - Block force pushes
   - Require linear history

2. **Required Checks for Merge**
   - SAST: CodeQL analysis
   - SCA: No high/critical vulnerabilities
   - Container scan: No critical vulnerabilities
   - Unit tests: 100% pass rate
   - Integration tests: All passing

---

## Part 4: Secrets Management in Cloud Context

### 4.1 Current Critical Gaps

**Severity: P0 - CRITICAL**

#### Finding 1: Plaintext Credentials in Deployment Script

**File:** `/Users/paultinp/BU-TPI/team/QA-tools/deploy-majutsu.sh`

```bash
# Lines 8-12: Hardcoded credentials
MAJUTSU_USER="paul"
MAJUTSU_HOST="majutsu.local"
MAJUTSU_IP="192.168.70.105"
MAJUTSU_PORT="51002"
MAJUTSU_PASSWORD="majutsu"  # <- CRITICAL: Plaintext password
```

**Impact:**
- Credentials exposed in version control
- Script accessible to anyone with repository access
- No mechanism for credential rotation
- Violates principle of least privilege

#### Finding 2: API Keys Stored in Plaintext

**Location:** `/Users/paultinp/BU-TPI/packages/dojolm-web/src/lib/`

The `LLMModelConfig` interface includes `apiKey` stored in plaintext in JSON files.

**Current Implementation:**
```typescript
export interface LLMModelConfig {
  // ...
  /** API key for authentication (stored encrypted) */
  apiKey?: string;  // Documented as "stored encrypted" but NOT implemented
  // ...
}
```

### 4.2 Cloud Secrets Management Strategy

#### Recommended Cloud Secrets Managers

| Cloud Provider | Service | Features |
|---------------|---------|----------|
| AWS | Secrets Manager | Automatic rotation, IAM integration, CloudWatch logging |
| AWS | Parameter Store (SSM) | Lower cost, hierarchical storage, IAM integration |
| Azure | Key Vault | Key management, secrets, certificates, HSM backing |
| GCP | Secret Manager | Automatic rotation, IAM integration, audit logging |

#### Implementation Architecture

```typescript
// Cloud-native secrets provider interface
interface CloudSecretsProvider {
  getSecret(secretId: string): Promise<string>;
  getSecretJson(secretId: string): Promise<Record<string, unknown>>;
  createSecret(secretId: string, value: string): Promise<void>;
  rotateSecret(secretId: string): Promise<void>;
}

// AWS Secrets Manager implementation
class AWSSecretsManagerProvider implements CloudSecretsProvider {
  private client: aws.SecretsManagerClient;

  constructor() {
    this.client = new aws.SecretsManagerClient({
      region: process.env.AWS_REGION,
    });
  }

  async getSecret(secretId: string): Promise<string> {
    const command = new aws.GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);
    return response.SecretString || '';
  }

  // ... other methods
}

// Usage in application
const secretsProvider = new AWSSecretsManagerProvider();
const openaiKey = await secretsProvider.getSecret('dojolm/openai/api-key');
```

#### Secrets Rotation Strategy

1. **Automatic Rotation**
   - API keys: Rotate every 90 days
   - Database credentials: Rotate every 30 days
   - Service account keys: Rotate every 60 days

2. **Rotation Process**
   ```
   Old Secret Active -> Create New Secret -> Test New Secret ->
   Update Applications -> Revoke Old Secret -> Log Rotation
   ```

3. **Emergency Rotation**
   - Immediate revocation on suspected compromise
   - Automated rollback if new secret fails
   - Alerting on rotation failures

### 4.3 Environment Configuration Best Practices

**Current .env.example (Minimal):**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3000
```

**Recommended Production Environment Variables:**
```bash
# Application
NODE_ENV=production
PORT=3000
HOSTNAME="0.0.0.0"

# Cloud Configuration
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=dojolm/production
CLOUDWATCH_LOG_GROUP=/dojolm/production

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false

# Security
ALLOWED_ORIGINS=https://dojolm.example.com
CORS_MAX_AGE=3600
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Database (use RDS/Aurora)
DATABASE_URL={{SECRET:dojolm/database/url}}
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# LLM Provider Keys (ALL from Secrets Manager)
# Do NOT store in environment files
# Access via: secretsProvider.getSecret('dojolm/openai/api-key')
```

---

## Part 5: Cloud IAM Recommendations

### 5.1 Current State: No IAM Implementation

**Finding:** No identity and access control implementation exists

**Implications:**
- No user authentication in application
- No role-based permissions
- No audit trail of who did what
- Cannot enforce least privilege

### 5.2 Recommended IAM Architecture

#### AWS IAM Strategy

**Accounts Structure:**
```
Root Account
├── Security Account (Centralized IAM, monitoring)
├── Shared Services Account (CI/CD, artifacts)
├── Production Account
├── Staging Account
└── Development Account
```

**IAM Roles for Application:**

```terraform
# Example: ECS Task Role with Least Privilege
resource "aws_iam_role" "dojolm_task_role" {
  name = "dojolm-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Minimal permissions policy
resource "aws_iam_role_policy" "dojolm_task_policy" {
  name = "dojolm-task-policy"
  role = aws_iam_role.dojolm_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:*:secret:dojolm/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:us-east-1:*:log-group:/dojolm/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:us-east-1:*:parameter/dojolm/*"
      }
    ]
  })
}
```

#### Application-Level IAM Integration

**Identity Provider Integration Options:**

1. **Cognito User Pools (AWS)**
   - Managed user directory
   - OAuth2/OIDC support
   - MFA support
   - Social identity providers

2. **Azure AD / Entra ID**
   - SAML/OIDC integration
   - Conditional access policies
   - MFA and risk-based authentication

3. **Okta**
   - Enterprise SSO
   - MFA and adaptive authentication
   - Lifecycle management

### 5.3 Role-Based Access Control (RBAC) Design

**Application Roles:**

| Role | Permissions | Use Case |
|------|------------|----------|
| **Admin** | Full system access, user management | System administrators |
| **Operator** | Execute tests, view results, manage models | Security analysts |
| **Viewer** | View-only access to results and reports | Management, auditors |
| **Auditor** | Access to audit logs, compliance reports | Compliance team |

**IAM Policy Example:**

```typescript
interface ApplicationRole {
  name: 'admin' | 'operator' | 'viewer' | 'auditor';
  permissions: Permission[];
}

interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
}

const ROLE_DEFINITIONS: Record<ApplicationRole['name'], Permission[]> = {
  admin: [
    { resource: '*', actions: ['*'] }
  ],
  operator: [
    { resource: '/api/llm/execute', actions: ['POST'] },
    { resource: '/api/llm/models', actions: ['GET', 'POST', 'PUT'] },
    { resource: '/api/llm/results', actions: ['GET', 'DELETE'] },
    { resource: '/api/scan', actions: ['POST'] },
  ],
  viewer: [
    { resource: '/api/llm/results', actions: ['GET'] },
    { resource: '/api/llm/reports', actions: ['GET'] },
    { resource: '/api/coverage', actions: ['GET'] },
  ],
  auditor: [
    { resource: '/api/audit/logs', actions: ['GET'] },
    { resource: '/api/reports/compliance', actions: ['GET'] },
  ],
};
```

---

## Part 6: Network Security for Cloud Deployments

### 6.1 Current State

**Finding:** Basic security headers but no cloud network architecture

**Current Headers (next.config.ts):**
```typescript
headers: [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
]
```

**Gaps:**
- Missing Content-Security-Policy
- Missing Permissions-Policy
- No HTTPS enforcement
- No network isolation strategy

### 6.2 Recommended Network Architecture

```
                    ┌─────────────────────────────┐
                    │        Internet             │
                    └──────────────┬──────────────┘
                                   │
                                   v
                    ┌─────────────────────────────┐
                    │  CloudFlare / AWS WAF       │
                    │  - DDoS Protection          │
                    │  - Bot Mitigation           │
                    │  - Geo-blocking             │
                    └──────────────┬──────────────┘
                                   │
                                   v
                    ┌─────────────────────────────┐
                    │  Application Load Balancer  │
                    │  (ALB)                      │
                    │  - SSL/TLS Termination      │
                    │  - Health Checks            │
                    └──────────────┬──────────────┘
                                   │
                                   v
                    ┌─────────────────────────────┐
                    │    Public Subnets           │
                    │  ┌─────────────────────┐   │
                    │  │   ECS/Fargate       │   │
                    │  │   Containers        │   │
                    │  └─────────────────────┘   │
                    └──────────────┬──────────────┘
                                   │
                                   v
                    ┌─────────────────────────────┐
                    │    Private Subnets          │
                    │  ┌─────────────────────┐   │
                    │  │   RDS/Aurora        │   │
                    │  │   (PostgreSQL)      │   │
                    │  └─────────────────────┘   │
                    │  ┌─────────────────────┐   │
                    │  │   ElastiCache       │   │
                    │  │   (Redis)           │   │
                    │  └─────────────────────┘   │
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │   VPC Endpoints (Private)   │
                    │  - Secrets Manager          │
                    │  - Parameter Store          │
                    │  - CloudWatch Logs          │
                    └─────────────────────────────┘
```

### 6.3 Security Groups Configuration

```terraform
# Application security group (outbound only)
resource "aws_security_group" "dojolm_app" {
  name_prefix = "dojolm-app-"
  description = "Security group for DojoLM application containers"

  # Outbound: HTTPS only (for external APIs)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: DNS
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound: Only from ALB
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.dojolm_alb.id]
  }

  tags = {
    Name = "dojolm-app"
  }
}

# Database security group (private only)
resource "aws_security_group" "dojolm_db" {
  name_prefix = "dojolm-db-"
  description = "Security group for DojoLM database"
  vpc_id      = aws_vpc.main.id

  # Inbound: Only from app security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.dojolm_app.id]
  }

  tags = {
    Name = "dojolm-db"
  }
}
```

### 6.4 Enhanced Security Headers

```typescript
// next.config.ts - Enhanced headers
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on"
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN"
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin"
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()"
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self';",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
            "style-src 'self' 'unsafe-inline';",
            "img-src 'self' data: https:;",
            "font-src 'self' data:;",
            "connect-src 'self' https://api.openai.com;",
            "frame-ancestors 'none';",
            "base-uri 'self';",
            "form-action 'self';",
          ].join(" ")
        },
      ],
    },
  ];
}
```

---

## Part 7: Cloud-Specific Threat Modeling

### 7.1 Threat Model Overview

**Methodology:** STRIDE + Cloud-Specific Threats

| Threat Category | Cloud-Specific Examples | Mitigation |
|----------------|------------------------|------------|
| **Spoofing** | - IAM credential theft<br>- Container identity compromise | - MFA for all IAM users<br>- IAM role assumption only<br>- Temporary credentials |
| **Tampering** | - Container image tampering<br>- IaC state manipulation<br>- Data in transit modification | - Image signing and verification<br>- IaC state locking and validation<br>- TLS for all connections |
| **Repudiation** | - API calls without attribution<br>- Resource deletion without trace | - CloudTrail logging<br>- Immutable audit logs<br>- MFA for destructive actions |
| **Information Disclosure** | - S3 bucket exposure<br>- Snapshot leaks<br>- Log data exposure | - Bucket policies<br>- Encryption at rest<br>- Access logs for all resources |
| **Denial of Service** | - Resource exhaustion<br>- API quota abuse<br>- DDoS on endpoints | - Auto-scaling<br>- WAF and Shield<br>- API throttling |
| **Elevation of Privilege** | - IAM role escalation<br>- Container breakout<br>- Misconfigured permissions | - Least privilege IAM<br>- Read-only containers<br>- IAM Access Analyzer |

### 7.2 Cloud Attack Surface Analysis

**External Attack Surface:**
```
1. Web Application (ALB/DNS)
   - DDoS exposure
   - OWASP Top 10 vulnerabilities
   - API abuse

2. Container Registry
   - Image poisoning
   - Supply chain attacks
   - Credential exposure

3. Management Plane
   - AWS Console access
   - API key exposure
   - IAM misconfiguration

4. Data Storage
   - S3 bucket exposure
   - Snapshot access
   - Backup leakage
```

**Internal Attack Surface (Post-compromise):**
```
1. Lateral Movement
   - Security group overly permissive
   - IAM role cross-account access
   - VPC peering abuse

2. Data Exfiltration
   - Unencrypted snapshots
   - S3 bucket misconfiguration
   - Cloud logging access

3. Persistence
   - Backdoor container images
   - IAM user creation
   - Lambda function injection
```

### 7.3 Cloud-Specific Attack Scenarios

#### Scenario 1: Container Escape via Privileged Container

**Attack Path:**
1. Attacker gains code execution in container
2. Container runs with privileged mode or capabilities
3. Attacker exploits kernel vulnerability to escape
4. Attacker gains access to host and other containers

**Mitigation:**
```yaml
# docker-compose.yml or ECS task definition
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
read_only: true
tmpfs:
  - /tmp
user: "1001:1001"
```

#### Scenario 2: IAM Role Credential Theft

**Attack Path:**
1. Attacker compromises application container
2. Attacker accesses instance metadata service
3. Attacker retrieves IAM role temporary credentials
4. Attacker uses credentials to access other AWS resources

**Mitigation:**
```yaml
# Require IMDSv2 (more secure metadata service)
MetadataOptions:
  HttpTokens: required
  HttpPutResponseHopLimit: 1
  HttpEndpoint: enabled
```

#### Scenario 3: Supply Chain Attack via Dependency

**Attack Path:**
1. Malicious actor compromises popular npm package
2. Project installs compromised dependency
3. Malicious code exfiltrates data or implants backdoor
4. Attack propagates through CI/CD pipeline

**Mitigation:**
- Dependency pinning (package-lock.json)
- npm audit with automated fixes
- SBT (Software Bill of Materials)
- Private npm registry with vetted packages
- Signed packages

---

## Part 8: Deployment Security Considerations

### 8.1 Current Deployment Script Analysis

**File:** `/Users/paultinp/BU-TPI/team/QA-tools/deploy-majutsu.sh`

**Security Issues:**

| Issue | Severity | Line(s) | Impact |
|-------|----------|---------|--------|
| Plaintext password | P0 | 12 | Credential exposure |
| SSH without key auth | P0 | 50 | MITM vulnerability |
| No host key verification | P1 | 50 | Man-in-the-middle possible |
| StrictHostKeyChecking=no | P1 | 50 | Trusts all hosts |
| Password in environment variable | P0 | 49 | Visible in process list |

### 8.2 Recommended Secure Deployment Pattern

**AWS CodeDeploy with Blue/Green Deployment:**

```yaml
# appspec.yml for CodeDeploy
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "dojolm-web"
          ContainerPort: 3000
        PlatformVersion: "LATEST"
Hooks:
  BeforeInstall:
    - Location: scripts/before_install.sh
      Timeout: 300
  AfterInstall:
    - Location: scripts/validate_deployment.sh
      Timeout: 600
  AfterAllowTestTraffic:
    - Location: scripts/health_check.sh
      Timeout: 300
```

### 8.3 Deployment Checklist

**Pre-Deployment:**
- [ ] All security scans pass (SAST, SCA, container)
- [ ] Secrets are in Secrets Manager (not code)
- [ ] IAM roles follow least privilege
- [ ] IaC changes reviewed and approved
- [ ] Database migrations tested
- [ ] Rollback plan documented

**During Deployment:**
- [ ] Blue/Green deployment (zero downtime)
- [ ] Health checks configured
- [ ] Auto-scaling enabled
- [ ] Logging active and streaming
- [ ] Alarms configured

**Post-Deployment:**
- [ ] Smoke tests pass
- [ ] Monitor CloudWatch metrics
- [ ] Check for errors in logs
- [ ] Validate security headers
- [ ] Test authentication flow
- [ ] Document any issues

---

## Part 9: Cloud Monitoring & Logging Strategy

### 9.1 Current State

**Finding:** Minimal logging implementation

**Current Capabilities:**
- Next.js console.log in development
- File-based logging in deployment script

**Missing:**
- Structured logging
- Centralized log aggregation
- Security event logging
- Alerting on anomalies

### 9.2 Recommended Cloud-Native Monitoring

**AWS CloudWatch Architecture:**

```
Application Logs
       |
       v
┌─────────────────────────────────────────────────────┐
│                  CloudWatch Logs                     │
├─────────────────────────────────────────────────────┤
│  - /dojolm/application (app logs)                   │
│  - /dojolm/access (ALB access logs)                 │
│  - /dojolm/security (auth attempts, denials)        │
│  - /aws/ecs/container (ECS container logs)          │
└─────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────┐
│              CloudWatch Log Insights                 │
│  - Query logs with SQL-like syntax                  │
│  - Generate metrics from logs                       │
│  - Detect anomalies                                 │
└─────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────┐
│              CloudWatch Alarms                      │
├─────────────────────────────────────────────────────┤
│  - High error rate (>1%)                            │
│  - High latency (p95 > 2s)                          │
│  - Auth failures spike                              │
│  - Unusual API patterns                             │
│  - Container restarts                               │
└─────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────┐
│                  SNS Notifications                  │
│  - PagerDuty integration                            │
│  - Slack alerts                                     │
│  - Email notifications                              │
└─────────────────────────────────────────────────────┘
```

### 9.3 Structured Logging Implementation

```typescript
// lib/logging/structured-logger.ts
interface LogContext {
  userId?: string;
  requestId?: string;
  action: string;
  resource?: string;
  statusCode?: number;
  error?: string;
  duration?: number;
}

class CloudLogger {
  private readonly logLevel: string;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  info(message: string, context: LogContext): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context: LogContext): void {
    this.log('WARN', message, context);
  }

  error(message: string, context: LogContext): void {
    this.log('ERROR', message, context);
  }

  security(message: string, context: LogContext): void {
    // Security events go to dedicated log group
    this.log('SECURITY', message, {
      ...context,
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
    });
  }

  private log(level: string, message: string, context: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      environment: process.env.NODE_ENV,
      service: 'dojolm-web',
      version: process.env.APP_VERSION || 'unknown',
    };

    // In production, send to CloudWatch
    if (process.env.NODE_ENV === 'production') {
      // Use CloudWatch Logs SDK
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }
}

export const logger = new CloudLogger();
```

### 9.4 Security Events to Log

| Event Type | Details Required |
|-----------|------------------|
| Authentication | Timestamp, user ID, IP, success/failure |
| Authorization | Timestamp, user ID, resource, action, result |
| API Key Usage | Timestamp, key ID, operation, caller IP |
| Model Configuration Changes | Timestamp, user ID, old value, new value |
| Test Execution | Timestamp, user ID, test case, model |
| Failures | Timestamp, error code, stack trace (sanitized) |
| Rate Limiting | Timestamp, IP, limit exceeded |
| Suspicious Activity | Timestamp, pattern details, risk score |

---

## Part 10: Recommendations Summary

### 10.1 Immediate Actions (P0) - Before Cloud Deployment

1. **Implement Secrets Management**
   - Migrate all secrets to AWS Secrets Manager
   - Remove credentials from deployment scripts
   - Implement secret rotation

2. **Deploy with IaC**
   - Create Terraform/CDK templates
   - Implement version-controlled infrastructure
   - Enable state locking and validation

3. **Implement Container Image Scanning**
   - Integrate Trivy or Snyk in CI/CD
   - Block images with critical vulnerabilities
   - Sign production images

4. **Add Authentication & Authorization**
   - Integrate Cognito or Azure AD
   - Implement RBAC in application
   - Enable MFA for admin access

5. **Fix Deployment Script Security**
   - Remove plaintext password
   - Use SSH key authentication
   - Enable host key verification

### 10.2 Short-term Actions (P1) - First 30 Days

6. **Implement CI/CD Security Pipeline**
   - Add SAST (CodeQL, Semgrep)
   - Automate SCA with Snyk
   - Add IaC scanning (tfsec, Checkov)

7. **Enhance Network Security**
   - Implement WAF rules
   - Configure security groups
   - Enable DDoS protection (Shield)

8. **Add Monitoring & Alerting**
   - CloudWatch dashboards
   - Alert on anomalies
   - SNS for critical events

9. **Implement Audit Logging**
   - CloudTrail enabled
   - Structured application logging
   - Immutable log storage

10. **Harden Container Configuration**
    - Implement read-only root filesystem
    - Drop all capabilities
    - Add health checks

### 10.3 Medium-term Actions (P2) - First 90 Days

11. **Implement Zero Trust Architecture**
    - Network segmentation
    - Private VPC endpoints
    - Mutual TLS for service communication

12. **Add Compliance Controls**
    - SOC 2 mapping
    - GDPR compliance
    - Data retention policies

13. **Implement Disaster Recovery**
    - Multi-region deployment
    - Automated backups
    - Failover testing

14. **Performance Optimization**
    - CloudFront CDN
    - Database read replicas
    - Connection pooling

15. **Cost Optimization**
    - Right-sizing instances
    - Reserved instances
    - Spend alerts

---

## Part 11: Cloud Deployment Readiness Scorecard

| Category | Current Score | Target Score | Gap |
|----------|--------------|--------------|-----|
| Container Security | 6/10 | 9/10 | Image scanning, hardening |
| IaC Coverage | 0/10 | 9/10 | Full infrastructure as code |
| Secrets Management | 1/10 | 10/10 | Cloud Secrets Manager |
| IAM & Access Control | 0/10 | 10/10 | Cognito integration, RBAC |
| Network Security | 3/10 | 9/10 | VPC, WAF, security groups |
| CI/CD Security | 2/10 | 9/10 | SAST, SCA, policy gates |
| Monitoring & Logging | 2/10 | 9/10 | CloudWatch, alerting |
| Compliance | 0/10 | 8/10 | SOC 2, GDPR controls |
| Disaster Recovery | 0/10 | 8/10 | Multi-region, backups |
| **Overall** | **14/90 (16%)** | **90/90 (100%)** | **76 points** |

**Estimated Effort to Reach Production Readiness:**
- Senior DevOps Engineer: 4-6 weeks
- Cloud Security Engineer: 3-4 weeks
- Application Developer: 2-3 weeks (auth integration)
- Total: ~9-12 weeks for full cloud deployment readiness

---

## Part 12: Alignment with SM Review

The SM review identified critical gaps in:
1. Authentication/Authorization (P0)
2. Secrets Management (P0)
3. Audit Logging (P1)

**Cloud Security SME reinforces these as P0 for cloud deployment:**

- **Authentication**: Cloud deployments MUST have identity integration before production
- **Secrets**: Cloud Secrets Manager is non-negotiable for security
- **Logging**: CloudTrail and structured logging are minimum requirements

**Additional Cloud-Specific P0 Findings:**
- No IaC for reproducible deployments
- Deployment script contains plaintext credentials
- No container image scanning pipeline
- Missing network security architecture

---

## Appendices

### Appendix A: Cloud Provider Comparison

| Feature | AWS | Azure | GCP |
|---------|-----|-------|-----|
| Containers | ECS/EKS | AKS/Container Apps | Cloud Run/GKE |
| Secrets | Secrets Manager, SSM | Key Vault | Secret Manager |
| IaC Support | Terraform, CDK | Terraform, Bicep | Terraform, Deployment Manager |
| WAF | AWS WAF | Azure WAF | Cloud Armor |
| DDoS | Shield | Azure DDoS Protection | Cloud Armor |
| Observability | CloudWatch | Monitor + Log Analytics | Cloud Logging + Monitoring |

### Appendix B: Estimated Cloud Costs (Monthly)

| Service | Spec | Est. Cost |
|---------|------|-----------|
| ECS/Fargate | 2 vCPU, 4GB | $45-$60 |
| RDS PostgreSQL | db.t3.micro | $15-$20 |
| ALB | Standard | $18-$20 |
| NAT Gateway | 1 gateway | $30-$35 |
| CloudWatch Logs | 5GB | $2-$5 |
| Secrets Manager | 10 secrets | $1.20 |
| S3 Storage | 10GB | $0.23 |
| Data Transfer | 100GB outbound | $8.50 |
| **Total** | | **~$120-150/mo** |

### Appendix C: Security Testing Tools Recommendations

| Category | Tool | Purpose |
|----------|------|---------|
| Container Scanning | Trivy | Vulnerability scanning |
| SAST | CodeQL, Semgrep | Static code analysis |
| SCA | Snyk, Dependabot | Dependency scanning |
| IaC Scanning | tfsec, Checkov | Infrastructure security |
| Secrets Scanning | gitleaks, trufflehog | Credential detection |
| Runtime Security | Falco | Container behavior monitoring |
| Network Scanning | nmap, masscan | Port/vulnerability scanning |

---

**End of Document**

**Reviewer Signature:** Nimbus, Cloud Security Architect
**Document Version:** 1.0
**Classification:** BMAD Internal Use
**Next Review Date:** Upon IaC implementation completion
