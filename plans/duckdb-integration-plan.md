# Database Integration Plan for BU-TPI

## Executive Summary

This plan outlines the integration of better-sqlite3 as the database backend for BU-TPI, replacing the current file-based JSON storage system. Additionally, it introduces authentication, user management, and role-based access control for the DojoLM platform.

**Phase**: P2.5 (between Fixture Expansion and Compliance Remediation)
**Stories**: S92-S105 (14 stories, ~50d sequential, ~25d parallel)
**Engine**: better-sqlite3 (row-oriented, mature Node.js bindings)
**Reviewed by**: BMM Architect + Cybersec Team (2026-03-02)

## Decision Rationale

| Criteria | better-sqlite3 | DuckDB | MongoDB | ChromaDB |
|----------|---------------|--------|---------|----------|
| Portability | ✅ Single file | ✅ Single file | ❌ Server | ✅ Embedded |
| OLTP (writes) | ✅✅ Row-oriented | ⚠️ Columnar overhead | ✅ Good | ❌ None |
| Analytics | ✅ Good (with indexes) | ✅✅ Columnar OLAP | ⚠️ Limited | ❌ None |
| JSON Support | ✅ json_extract() | ✅ Native | ✅✅ Native | ✅ Native |
| Node.js maturity | ✅✅ 2.5M weekly DLs | ⚠️ ~50K weekly DLs | ✅ mongodb | ✅ chromadb |
| Next.js compat | ✅✅ Simple singleton | ⚠️ Complex connections | ✅ Good | ✅ Good |
| Bundle size | ✅ ~8MB | ⚠️ ~30MB | ⚠️ ~15MB | ⚠️ ~20MB |
| WAL mode | ✅✅ Battle-tested | ✅ Supported | N/A | N/A |

**Selected: better-sqlite3** — 80% of workload is OLTP (per-execution writes, config CRUD). Row-oriented engine handles this natively. Scoreboard analytics perform well at 10K-100K scale with proper indexes (<100ms). Upgrade path to DuckDB exists if analytics volume exceeds 1M+ rows.

---

## Database Schema Design

### Entity Relationship Diagram

```mermaid
erDiagram
    MODEL_CONFIGS ||--o{ TEST_EXECUTIONS : runs
    TEST_CASES ||--o{ TEST_EXECUTIONS : executes
    BATCH_EXECUTIONS ||--o{ TEST_EXECUTIONS : contains
    BATCH_EXECUTIONS ||--o{ BATCH_TEST_CASES : has
    TEST_CASES ||--o{ BATCH_TEST_CASES : included_in
    MODEL_CONFIGS ||--o{ BATCH_EXECUTIONS : creates
    TEST_EXECUTIONS ||--o{ SCAN_FINDINGS : produces
    TEST_EXECUTIONS ||--o{ EVIDENCE_RECORDS : stores
    TEST_EXECUTIONS ||--o{ EXECUTION_OWASP_COVERAGE : maps
    TEST_EXECUTIONS ||--o{ EXECUTION_TPI_COVERAGE : maps
    MODEL_CONFIGS ||--o{ MODEL_SCORES : has
    MODEL_CONFIGS ||--o{ COMPLIANCE_SCORES : assessed
    USERS ||--o{ SESSIONS : authenticates
    USERS ||--o{ AUDIT_LOG : creates
    AUDIT_LOG }o--|| TEST_EXECUTIONS : tracks

    MODEL_CONFIGS {
        string id PK
        string name
        string provider
        string model
        string api_key_encrypted
        string base_url
        boolean enabled
        json config_json
        integer max_tokens
        string organization_id
        string project_id
        json custom_headers_json
        float temperature
        float top_p
        timestamp created_at
        timestamp updated_at
    }

    TEST_CASES {
        string id PK
        string name
        string category
        string prompt
        string expected_behavior
        string severity
        string scenario
        string owasp_category
        string tpi_story
        json tags_json
        boolean enabled
        timestamp created_at
    }

    BATCH_EXECUTIONS {
        string id PK
        string name
        string model_config_id FK
        string status
        integer total_tests
        integer completed_tests
        integer passed_tests
        integer failed_tests
        float avg_resilience_score
        float avg_injection_success
        float avg_harmfulness
        timestamp started_at
        timestamp completed_at
        json metadata_json
    }

    BATCH_TEST_CASES {
        string batch_id FK
        string test_case_id FK
    }

    TEST_EXECUTIONS {
        string id PK
        string test_case_id FK
        string model_config_id FK
        string batch_id FK
        string status
        string prompt
        text response
        string error
        integer duration_ms
        integer prompt_tokens
        integer completion_tokens
        integer total_tokens
        float injection_success
        float harmfulness
        float resilience_score
        float estimated_cost_usd
        string content_hash UNIQUE
        boolean cached
        timestamp executed_at
    }

    EXECUTION_OWASP_COVERAGE {
        string execution_id FK
        string category
        boolean passed
    }

    EXECUTION_TPI_COVERAGE {
        string execution_id FK
        string story
        boolean passed
    }

    SCAN_FINDINGS {
        string id PK
        string execution_id FK
        string category
        string severity
        string description
        string match_text
        string source
        string engine
        string pattern_name
        float weight
        timestamp created_at
    }

    EVIDENCE_RECORDS {
        string id PK
        string execution_id FK
        string evidence_type
        text content
        string content_type
        integer size_bytes
        string checksum
        timestamp created_at
    }

    MODEL_SCORES {
        string id PK
        string model_config_id FK
        date score_date
        float avg_resilience_score
        float avg_injection_success
        float avg_harmfulness
        integer total_tests
        integer passed_tests
        integer failed_tests
        json category_scores_json
        timestamp calculated_at
    }

    COMPLIANCE_SCORES {
        string id PK
        string model_config_id FK
        string framework
        string version
        float score_percent
        json gaps_json
        timestamp assessed_at
    }

    USERS {
        string id PK
        string username UNIQUE
        string email UNIQUE
        string password_hash
        string role
        string display_name
        timestamp created_at
        timestamp updated_at
        timestamp last_login_at
        boolean enabled
    }

    SESSIONS {
        string id PK
        string user_id FK
        string token_hash
        string ip_address
        string user_agent
        timestamp created_at
        timestamp expires_at
    }

    AUDIT_LOG {
        string id PK
        string entity_type
        string entity_id
        string action
        json old_values_json
        json new_values_json
        string user_id
        string ip_address
        timestamp created_at
    }

    RETENTION_CONFIG {
        string entity_type PK
        integer retention_days
        timestamp last_run_at
    }

    PROVIDER_HEALTH_LOG {
        string id PK
        string provider
        string endpoint
        integer status_code
        integer latency_ms
        string error
        timestamp checked_at
    }
```

> **Note**: P6 stub tables (sage_generated_attacks, battle_arena_matches, battle_arena_elo, threat_feed_entries, attack_dna_lineage) are created empty in migration 004 and populated during Phase 6 implementation. See DOJO-UP-KASHIWA S93 for full stub definitions.

---

## Implementation Phases

### Phase 1: Core Database Setup

#### 1.1 Install Dependencies
```bash
npm install better-sqlite3 --save
npm install @types/better-sqlite3 --save-dev
```

#### 1.2 Create Database Module
- Location: `packages/dojolm-web/src/lib/db/`
- Files:
  - `database.ts` - Connection management
  - `schema.ts` - Schema definitions and migrations
  - `types.ts` - TypeScript types for database rows

#### 1.3 Schema Migration System
- Version-based migrations
- Automatic schema creation on first run
- Migration history tracking

### Phase 2: Data Access Layer

#### 2.1 Repository Pattern
Create repositories for each entity:
- `ModelConfigRepository`
- `TestCaseRepository`
- `ExecutionRepository`
- `BatchRepository`
- `ScoreboardRepository`
- `AuditRepository`

#### 2.2 Implement IStorageBackend
Update [`storage-interface.ts`](packages/dojolm-web/src/lib/storage/storage-interface.ts) to support better-sqlite3 backend.

### Phase 2.5: Authentication & User Management (NEW)

#### 2.5.1 Authentication System
- Session-based auth with bcrypt password hashing
- HTTP-only, Secure, SameSite=Strict cookies
- CSRF protection via double-submit cookie pattern
- Rate limiting: 5 login attempts per IP per 15 minutes

#### 2.5.2 User Management & RBAC
- Three roles: admin, analyst, viewer
- Admin: full access including user management and audit log
- Analyst: test execution, view results, no user management
- Viewer: read-only access to results and reports

#### 2.5.3 API Route Protection
- All routes require authentication (except /api/auth/login)
- RBAC enforced per route based on user role
- CORS restricted to configurable allowlist (no wildcard)
- Security headers on all responses

### Phase 3: Feature Implementation

#### 3.1 Scoreboard System
```sql
-- View for model rankings (SQLite-compatible syntax)
CREATE VIEW model_rankings AS
SELECT
    mc.id,
    mc.name,
    mc.provider,
    mc.model,
    AVG(te.resilience_score) as avg_score,
    COUNT(*) as total_tests,
    SUM(CASE WHEN te.status = 'completed' AND te.resilience_score >= 70 THEN 1 ELSE 0 END) as passed,
    SUM(te.estimated_cost_usd) as total_cost,
    ROW_NUMBER() OVER (ORDER BY AVG(te.resilience_score) DESC) as rank
FROM model_configs mc
LEFT JOIN test_executions te ON mc.id = te.model_config_id
WHERE te.executed_at >= datetime('now', '-30 days')
GROUP BY mc.id, mc.name, mc.provider, mc.model;

-- View for daily summaries
CREATE VIEW daily_summaries AS
SELECT
    date(te.executed_at) as test_date,
    te.model_config_id,
    COUNT(*) as tests_run,
    AVG(te.resilience_score) as avg_score,
    SUM(CASE WHEN te.resilience_score >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate,
    SUM(te.estimated_cost_usd) as daily_cost
FROM test_executions te
GROUP BY date(te.executed_at), te.model_config_id;
```

#### 3.2 Test History with Evidence
- Store full execution history
- Link evidence records (responses, scan results)
- Support pagination and filtering

#### 3.3 Reporting Engine
- Pre-computed daily summaries
- Trend analysis queries
- Export to JSON/CSV/Markdown

### Phase 4: Migration from JSON

#### 4.1 Data Migration Script
- Read existing JSON files
- Transform to relational format
- Insert into SQLite (better-sqlite3)
- Validate migration (count JSON files vs DB rows)

#### 4.2 Backward Compatibility
- Keep JSON files as backup
- Add flag to switch between storage backends
- Gradual rollout strategy

---

## File Structure

```
packages/dojolm-web/
├── src/lib/
│   ├── db/
│   │   ├── database.ts          # Connection management
│   │   ├── schema.ts            # Schema definitions
│   │   ├── migrations.ts        # Migration runner
│   │   ├── types.ts             # DB row types
│   │   └── repositories/
│   │       ├── base.repository.ts
│   │       ├── model-config.repository.ts
│   │       ├── test-case.repository.ts
│   │       ├── execution.repository.ts
│   │       ├── batch.repository.ts
│   │       ├── scoreboard.repository.ts
│   │       └── audit.repository.ts
│   ├── auth/
│   │   ├── auth.ts               # Password hashing, session tokens
│   │   ├── session.ts            # Session management
│   │   ├── rbac.ts               # Role-based access control
│   │   └── route-guard.ts        # API route protection HOF
│   └── storage/
│       ├── storage-interface.ts  # Updated interface
│       ├── db-storage.ts         # New SQLite backend
│       └── file-storage.ts       # Keep for migration
├── middleware.ts                  # Next.js auth middleware
├── data/
│   └── tpi.db                    # SQLite database file (gitignored)
├── migrations/
│   ├── 001_core_schema.sql
│   ├── 002_coverage_tables.sql
│   ├── 003_audit_users.sql
│   └── 004_future_stubs.sql
└── scripts/
    └── migrate-json-to-db.ts     # JSON→DB migration script
```

---

## API Endpoints

### New Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Authenticate user | Public |
| POST | `/api/auth/logout` | Destroy session | Any |
| GET | `/api/auth/me` | Current user info | Any |
| POST | `/api/auth/change-password` | Change password | Any |
| GET | `/api/admin/users` | List users | Admin |
| POST | `/api/admin/users` | Create user | Admin |
| PATCH | `/api/admin/users/:id` | Update user | Admin |
| DELETE | `/api/admin/users/:id` | Disable user | Admin |
| DELETE | `/api/admin/retention` | Trigger retention cleanup | Admin |
| GET | `/api/scoreboard` | Get model rankings | Viewer+ |
| GET | `/api/scoreboard/history` | Historical rankings | Viewer+ |
| GET | `/api/history/executions` | Test execution history | Viewer+ |
| GET | `/api/history/executions/:id` | Single execution with evidence | Viewer+ |
| GET | `/api/reports/daily` | Daily summary reports | Viewer+ |
| GET | `/api/reports/trends` | Trend analysis | Viewer+ |
| GET | `/api/reports/costs` | Cost breakdown by provider | Viewer+ |
| GET | `/api/audit/log` | Audit trail | Admin |

---

## Performance Considerations

### Indexes
```sql
-- Core query indexes
CREATE INDEX idx_executions_model ON test_executions(model_config_id);
CREATE INDEX idx_executions_batch ON test_executions(batch_id);
CREATE INDEX idx_executions_timestamp ON test_executions(executed_at);
CREATE INDEX idx_executions_hash ON test_executions(content_hash);
CREATE INDEX idx_findings_execution ON scan_findings(execution_id);
CREATE INDEX idx_scores_model_date ON model_scores(model_config_id, score_date);
-- Junction table indexes
CREATE INDEX idx_owasp_coverage ON execution_owasp_coverage(execution_id, category);
CREATE INDEX idx_tpi_coverage ON execution_tpi_coverage(execution_id, story);
-- Auth indexes
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
```

### Query Optimization
- Use prepared statements
- Batch inserts for bulk operations
- WAL mode for concurrent read/write performance
- Row-oriented format optimal for per-execution OLTP inserts

---

## Testing Strategy

### Unit Tests
- Repository methods
- Query builders
- Data transformations

### Integration Tests
- Full CRUD operations
- Migration scripts
- Data integrity

### Performance Tests
- Bulk insert performance
- Query response times
- Concurrent access

---

## Rollout Plan

### Stage 1: Development
- Implement core schema
- Create repositories
- Write migration scripts

### Stage 2: Testing
- Migrate test data
- Validate queries
- Performance testing

### Stage 3: Staging
- Deploy to staging environment
- Run parallel with JSON storage
- Monitor for issues

### Stage 4: Production
- Feature flag rollout
- Gradual migration
- Monitor and optimize

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Keep JSON backup, validate counts, atomic transaction |
| Performance regression | Benchmark before/after, add indexes, WAL mode |
| Concurrent write issues | WAL mode, busy_timeout=5000, singleton connection |
| Schema evolution | Version-based migrations with idempotent runner |
| API key exposure in DB | AES-256-GCM encryption at rest, PBKDF2 key derivation |
| Stored XSS from attack payloads | Output sanitization on all response/match fields |
| SQL injection | Parameterized queries only, zero string interpolation |
| Audit log tampering | Append-only enforcement, no UPDATE/DELETE methods |
| Session hijack | HTTP-only cookies, SameSite=Strict, token hashing |
| Encryption key loss | Document key rotation procedure, backup strategy |

---

## Success Metrics

1. **Query Performance**: Scoreboard queries < 100ms, paginated queries < 50ms
2. **Write Performance**: 10K execution inserts < 30 seconds
3. **Storage Efficiency**: 50% reduction vs JSON files
4. **Zero Data Loss**: 100% migration success with count validation
5. **Security**: AES-256-GCM encryption, parameterized queries, zero SQL injection vectors
6. **Auth**: Session-based auth with bcrypt, RBAC enforcement on all routes
7. **Audit**: Append-only log with sensitive field redaction
8. **Developer Experience**: Clean repository pattern, type-safe queries
