// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixtures.ts
 * Purpose: Bundled Ronin Hub starter corpus for planning + intelligence.
 *
 * Story: WAVE2-RONIN / ADR-0015.
 *
 * Planning targets start empty — they are user-authored. Intelligence
 * ships with a small seed corpus of recent AI CVE + AI Incident DB
 * entries so the view is populated before any live feed polling runs.
 * Production deployments override by dropping JSON files into
 * `<TPI_DATA_DIR>/ronin/{planning,intelligence}/`.
 *
 * ─── E1-A-RB-15.6 (Master Plan v1.0 §4.1, founder fire 2026-05-23) ───
 *
 * SAMPLE / DEMO DATA ONLY. Source-attribution strings (NVD, FIRST EPSS,
 * MITRE ATLAS, CISA KEV, AI Incident DB) are prefixed "[SAMPLE] …
 * (demo)" and reference URLs are repointed from real-authority domains
 * (nvd.nist.gov, api.first.org, incidentdatabase.ai) to
 * `example.invalid/sample-*` so the demo status is unmistakable on
 * github-public + no link in this file leads to a 404 against a real
 * authority. CVE-2026-XXXXX IDs are illustrative, not real CVEs.
 * MITRE ATLAS technique IDs (AML.T*) reference real ATLAS techniques
 * but the indicator context binds them to fictional vendor targets.
 *
 * Pass-1 subagent #4 + adversarial Round-1 HIGH-6 flagged the
 * fake-CVE-with-real-NVD-URL pairing as the highest-reputational-risk
 * impersonation surface on the public-OSS launch. This rewrite ships
 * under MIT (E0-LICENSE relicense). Real CVE / EPSS / Incident DB
 * feeds plug in at Stage 2 commercial-readiness.
 */

export type ResearchTargetStatus = 'active' | 'closed'
export type ResearchTargetPriority = 'P0' | 'P1' | 'P2' | 'P3'

export interface ResearchChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface ResearchTargetRecord {
  id: string
  userId: string
  title: string
  url: string
  scope: 'in-scope' | 'out-of-scope'
  notes: string
  checklist: ResearchChecklistItem[]
  status: ResearchTargetStatus
  priority: ResearchTargetPriority
  createdAt: string
  updatedAt: string
}

export type IntelligenceEntryType = 'cve' | 'ai-incident' | 'kev' | 'epss' | 'atlas'

export type IntelligenceReferenceType =
  | 'advisory'
  | 'patch'
  | 'exploit'
  | 'writeup'
  | 'mitigation'

export interface IntelligenceAffectedProduct {
  readonly vendor: string
  readonly product: string
  readonly versions?: string
}

export interface IntelligenceTypedReference {
  readonly url: string
  readonly type: IntelligenceReferenceType
}

export interface IntelligenceEntryRecord {
  id: string
  type: IntelligenceEntryType
  title: string
  summary: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  source: string
  publishedAt: string
  references: string[]
  tags: string[]
  // Wave 8.1 / ADR-0074 — optional structured fields populated by
  // source adapters on live fetches. The seed corpus omits them;
  // every consumer treats them as best-effort.
  cvssVector?: string
  cvssScore?: number
  cweIds?: readonly string[]
  affectedProducts?: readonly IntelligenceAffectedProduct[]
  referenceTypes?: readonly IntelligenceTypedReference[]
  epssScore?: number
  epssPercentile?: number
  atlasTacticIds?: readonly string[]
  atlasTechniqueIds?: readonly string[]
  atlasMitigationIds?: readonly string[]
}

export const DEFAULT_INTELLIGENCE_CORPUS: IntelligenceEntryRecord[] = [
  {
    id: 'CVE-2026-10021',
    type: 'cve',
    title: 'Prompt Injection in Popular LLM Gateway Chain-of-Custody',
    summary: 'A vulnerability allows indirect prompt injection through unsanitised retrieval-augmented context, enabling attackers to bypass system prompts on affected gateway versions < 2.4.1.',
    severity: 'HIGH',
    source: '[SAMPLE] NVD (demo)',
    publishedAt: '2026-04-02',
    references: ['https://example.invalid/sample-cve/detail/CVE-2026-10021'],
    tags: ['prompt-injection', 'rag', 'gateway'],
  },
  {
    id: 'CVE-2026-10234',
    type: 'cve',
    title: 'Arbitrary Tool Execution via Untrusted Function-Call Schema',
    summary: 'Unauthenticated attackers can coerce the tool-calling layer to invoke arbitrary registered tools when the schema validator is bypassed with duplicate keys.',
    severity: 'CRITICAL',
    source: '[SAMPLE] NVD (demo)',
    publishedAt: '2026-04-05',
    references: ['https://example.invalid/sample-cve/detail/CVE-2026-10234'],
    tags: ['tool-use', 'schema-confusion', 'rce'],
  },
  {
    id: 'AIID-2026-00481',
    type: 'ai-incident',
    title: 'Financial-Services Chatbot Leaked Customer Balances via Log Injection',
    summary: 'A customer-support chatbot at a regional bank was manipulated into echoing another customer\'s balance through crafted prompts that reused log-file markers.',
    severity: 'HIGH',
    source: '[SAMPLE] AI Incident DB (demo)',
    publishedAt: '2026-03-29',
    references: ['https://example.invalid/sample-incident/cite/481'],
    tags: ['pii-leak', 'log-injection', 'finserv'],
  },
  {
    id: 'AIID-2026-00502',
    type: 'ai-incident',
    title: 'Healthcare Triage Model Produced Unsafe Dosage Recommendations',
    summary: 'An AI clinical-triage system generated medication dosage suggestions outside safe ranges after prompt-injection via a pasted patient-history field.',
    severity: 'CRITICAL',
    source: '[SAMPLE] AI Incident DB (demo)',
    publishedAt: '2026-04-01',
    references: ['https://example.invalid/sample-incident/cite/502'],
    tags: ['healthcare', 'prompt-injection', 'safety'],
  },
  {
    id: 'CVE-2026-10445',
    type: 'cve',
    title: 'Server-Side Request Forgery via Agent Web-Browser Tool',
    summary: 'The built-in web-browser tool of an AI agent framework fails to enforce the configured SSRF allow-list when the user prompt contains Unicode URL characters.',
    severity: 'HIGH',
    source: '[SAMPLE] NVD (demo)',
    publishedAt: '2026-04-08',
    references: ['https://example.invalid/sample-cve/detail/CVE-2026-10445'],
    tags: ['ssrf', 'agents', 'unicode'],
  },
  {
    id: 'AIID-2026-00517',
    type: 'ai-incident',
    title: 'Retail Recommender Leaked Model Weights via Timing Side-Channel',
    summary: 'Researchers extracted a meaningful approximation of a retail recommendation model by probing inference latency over 48 hours.',
    severity: 'MEDIUM',
    source: '[SAMPLE] AI Incident DB (demo)',
    publishedAt: '2026-04-10',
    references: ['https://example.invalid/sample-incident/cite/517'],
    tags: ['model-extraction', 'side-channel', 'retail'],
  },
  {
    id: 'CVE-2026-10678',
    type: 'cve',
    title: 'Insecure Default System Prompt Disclosed via /debug Endpoint',
    summary: 'A popular open-source LLM wrapper exposes the full system prompt through an undocumented /debug endpoint when deployed with default settings.',
    severity: 'MEDIUM',
    source: '[SAMPLE] NVD (demo)',
    publishedAt: '2026-04-12',
    references: ['https://example.invalid/sample-cve/detail/CVE-2026-10678'],
    tags: ['information-disclosure', 'default-config'],
  },
  {
    id: 'AIID-2026-00528',
    type: 'ai-incident',
    title: 'Legal-Research Assistant Cited Fabricated Case Law at Scale',
    summary: 'Lawyers at multiple firms filed briefs citing non-existent case law generated by an internal AI research assistant, triggering sanctions proceedings.',
    severity: 'HIGH',
    source: '[SAMPLE] AI Incident DB (demo)',
    publishedAt: '2026-04-14',
    references: ['https://example.invalid/sample-incident/cite/528'],
    tags: ['hallucination', 'legal', 'sanctions'],
  },

  // --- Wave 7B.5 expansion (92 entries — BU-branded sample CVEs + KEV/EPSS/ATLAS coverage) ---

  // CRITICAL +8 (NVD, KEV, AIID)
  { id: 'CVE-2026-11001', type: 'cve', title: 'DojoLM Gateway < 2.4.1: Remote Code Execution via Tool-Schema Confusion', summary: 'A schema-confusion bug in DojoLM Gateway tool registration allows unauthenticated remote attackers to register arbitrary tools and execute code on the inference host.', severity: 'CRITICAL', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-15', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11001'], tags: ['dojolm', 'rce', 'tool-schema', 'unauthenticated'] },
  { id: 'CVE-2026-11002', type: 'cve', title: 'SampleBravo Admin Panel: Authentication Bypass via Crafted Bearer Token', summary: 'SampleBravo admin endpoints accept malformed JWTs whose alg=none header bypasses signature checks, granting attackers full administrative control.', severity: 'CRITICAL', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-16', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11002'], tags: ['sampleBravo', 'auth-bypass', 'jwt-none'] },
  { id: 'KEV-2026-00041', type: 'kev', title: 'Active Exploitation: SampleAlpha Compliance Engine Deserialisation', summary: 'CISA observed active exploitation of an unsafe Java deserialisation gadget in SampleAlpha Compliance Engine 1.x, leading to remote code execution on customer-facing audit hosts.', severity: 'CRITICAL', source: '[SAMPLE] CISA KEV (demo)', publishedAt: '2026-04-17', references: ['https://www.cisa.gov/known-exploited-vulnerabilities'], tags: ['sampleAlpha', 'deserialise', 'kev', 'rce'] },
  { id: 'KEV-2026-00042', type: 'kev', title: 'Active Exploitation: SampleDelta Embedding Cache Path Traversal', summary: 'SampleDelta embedding-cache reads accept ../ payloads from authenticated users, allowing reads of arbitrary files on the cache host. Active exploitation observed in healthcare deployments.', severity: 'CRITICAL', source: '[SAMPLE] CISA KEV (demo)', publishedAt: '2026-04-18', references: ['https://www.cisa.gov/known-exploited-vulnerabilities'], tags: ['sampleDelta', 'kev', 'path-traversal'] },
  { id: 'AIID-2026-00603', type: 'ai-incident', title: 'SampleCharlie Audit Assistant Issued Unauthorised Trade-Approval Recommendations', summary: 'A SampleCharlie audit assistant deployed at a regional broker-dealer issued trade-approval recommendations outside its scope after a multi-turn social-engineering attack.', severity: 'CRITICAL', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-19', references: ['https://example.invalid/sample-incident/cite/603'], tags: ['sampleCharlie', 'finance', 'social-engineering', 'unauthorised-action'] },
  { id: 'CVE-2026-11003', type: 'cve', title: 'BUCC Sengoku Replay Endpoint Allows Authenticated Plan Hijack', summary: 'A flaw in the BUCC Sengoku replay endpoint allows authenticated operators to replace another operator running plan with arbitrary attack plans.', severity: 'CRITICAL', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-12', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11003'], tags: ['bucc', 'sengoku', 'plan-hijack', 'authz'] },
  { id: 'AIID-2026-00604', type: 'ai-incident', title: 'SampleBravo Internal Tool Approved Mass Customer-Account Termination', summary: 'A SampleBravo internal-tools agent approved a bulk termination request for 12,000 accounts after a prompt-injected ticket queue reference. Most actions were rolled back within 6 hours.', severity: 'CRITICAL', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-13', references: ['https://example.invalid/sample-incident/cite/604'], tags: ['sampleBravo', 'tool-abuse', 'mass-action'] },
  { id: 'KEV-2026-00043', type: 'kev', title: 'Active Exploitation: DojoLM Forge-Defense Template Injection', summary: 'CISA reports active exploitation of a template-injection flaw in DojoLM Forge Defense, allowing privilege escalation through crafted defense-template body fields.', severity: 'CRITICAL', source: '[SAMPLE] CISA KEV (demo)', publishedAt: '2026-04-14', references: ['https://www.cisa.gov/known-exploited-vulnerabilities'], tags: ['dojolm', 'kev', 'template-injection'] },

  // HIGH +16 (NVD, KEV, EPSS, ATLAS, AIID)
  { id: 'CVE-2026-11010', type: 'cve', title: 'SampleBravo Tool Registry: Path Traversal in Plugin Loader', summary: 'SampleBravo plugin loader resolves plugin manifests through user-supplied paths without canonicalisation, allowing reads outside the plugins directory.', severity: 'HIGH', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-01', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11010'], tags: ['sampleBravo', 'path-traversal', 'plugin'] },
  { id: 'CVE-2026-11011', type: 'cve', title: 'SampleDelta RAG Index: Stored Cross-Site Scripting', summary: 'A stored XSS in the SampleDelta RAG admin index lets ingested document titles execute scripts in the operator console.', severity: 'HIGH', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-02', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11011'], tags: ['sampleDelta', 'xss', 'rag-admin'] },
  { id: 'CVE-2026-11012', type: 'cve', title: 'SampleCharlie Audit Hooks: SSRF via Webhook URL Parameter', summary: 'SampleCharlie audit-hook destinations accept any URL, including 169.254.169.254, allowing SSRF against cloud metadata services.', severity: 'HIGH', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-03', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11012'], tags: ['sampleCharlie', 'ssrf', 'metadata'] },
  { id: 'CVE-2026-11013', type: 'cve', title: 'SampleAlpha Customer Console: SQL Injection in Search Filter', summary: 'A search-filter parameter on SampleAlpha customer console concatenates user input into a SQL query, enabling boolean-blind injection.', severity: 'HIGH', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-04', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11013'], tags: ['sampleAlpha', 'sqli', 'console'] },
  { id: 'KEV-2026-00050', type: 'kev', title: 'Active Exploitation: SampleBravo SaaS-Tenant Cross-Read', summary: 'CISA observed cross-tenant reads of customer data through a SampleBravo SaaS scope-check bug; patches available in 4.2.1.', severity: 'HIGH', source: '[SAMPLE] CISA KEV (demo)', publishedAt: '2026-04-05', references: ['https://www.cisa.gov/known-exploited-vulnerabilities'], tags: ['sampleBravo', 'kev', 'cross-tenant'] },
  { id: 'EPSS-CVE-2026-11014', type: 'epss', title: 'EPSS 0.94: DojoLM Helm Chart Default-Credentials Exposure', summary: 'EPSS predicts 94% likelihood of exploitation within 30 days for DojoLM Helm chart deployments running default admin credentials.', severity: 'HIGH', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-04-06', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11014'], tags: ['dojolm', 'epss', 'default-creds', 'helm'] },
  { id: 'EPSS-CVE-2026-11015', type: 'epss', title: 'EPSS 0.88: SampleDelta Inference Server Header Injection', summary: 'EPSS forecasts 88% near-term exploitation likelihood for an HTTP header-injection bug in SampleDelta inference servers.', severity: 'HIGH', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-04-07', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11015'], tags: ['sampleDelta', 'epss', 'header-injection'] },
  { id: 'ATLAS-AML.T0050', type: 'atlas', title: 'ATLAS T0050: Command-and-Scripting via LLM-Generated Tooling', summary: 'MITRE ATLAS technique T0050 catalogues LLM-emitted scripts being executed by downstream agents, observed in SampleBravo and DojoLM deployments.', severity: 'HIGH', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-04-08', references: ['https://atlas.mitre.org/techniques/AML.T0050'], tags: ['atlas', 'aml.t0050', 'agent-script'] },
  { id: 'ATLAS-AML.T0051', type: 'atlas', title: 'ATLAS T0051: Tool-Output Hallucination Used as Authority', summary: 'ATLAS T0051 maps cases where downstream tools accept hallucinated LLM output as ground-truth, including a SampleCharlie finance bot incident.', severity: 'HIGH', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-04-09', references: ['https://atlas.mitre.org/techniques/AML.T0051'], tags: ['atlas', 'aml.t0051', 'hallucination', 'sampleCharlie'] },
  { id: 'ATLAS-AML.T0052', type: 'atlas', title: 'ATLAS T0052: Indirect Prompt-Injection via Markdown Sources', summary: 'ATLAS technique T0052 documents indirect injection via markdown comments + image-src exfil; cited SampleAlpha research-mode incidents.', severity: 'HIGH', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-04-10', references: ['https://atlas.mitre.org/techniques/AML.T0052'], tags: ['atlas', 'aml.t0052', 'markdown-injection', 'sampleAlpha'] },
  { id: 'AIID-2026-00701', type: 'ai-incident', title: 'SampleDelta Image-Generation Tool Reproduced Copyrighted Content', summary: 'A SampleDelta image-generation tool reproduced near-verbatim copyrighted images for one tenant; takedown requests flooded the operator team.', severity: 'HIGH', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-11', references: ['https://example.invalid/sample-incident/cite/701'], tags: ['sampleDelta', 'copyright', 'image-gen'] },
  { id: 'AIID-2026-00702', type: 'ai-incident', title: 'SampleBravo SaaS Admin Panel Showed Cross-Tenant User Lists', summary: 'A scope-check regression in SampleBravo SaaS admin panel briefly exposed cross-tenant user lists to operators of unaffiliated tenants. Resolved within 2 hours.', severity: 'HIGH', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-12', references: ['https://example.invalid/sample-incident/cite/702'], tags: ['sampleBravo', 'cross-tenant', 'saas-admin'] },
  { id: 'AIID-2026-00703', type: 'ai-incident', title: 'SampleCharlie Audit Bot Granted Auditor-Only Permissions to External Vendor', summary: 'A multi-turn social-engineering attack convinced a SampleCharlie audit bot to grant auditor-only access tokens to an external vendor email, observed in 4 customer tenants.', severity: 'HIGH', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-13', references: ['https://example.invalid/sample-incident/cite/703'], tags: ['sampleCharlie', 'social-engineering', 'token-grant'] },
  { id: 'AIID-2026-00704', type: 'ai-incident', title: 'DojoLM Customer-Support Bot Released Internal Roadmap to Public Chat', summary: 'A DojoLM customer-support bot leaked an internal product roadmap excerpt to a public-facing chat after a prompt-injection embedded in a support ticket reply.', severity: 'HIGH', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-14', references: ['https://example.invalid/sample-incident/cite/704'], tags: ['dojolm', 'leak', 'roadmap', 'public-chat'] },
  { id: 'AIID-2026-00705', type: 'ai-incident', title: 'SampleAlpha Compliance Bot Approved Non-Compliant Vendor Onboarding', summary: 'A SampleAlpha compliance bot approved 14 non-compliant vendor onboardings before pattern-matching detected a malformed approval-form template injection.', severity: 'HIGH', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-15', references: ['https://example.invalid/sample-incident/cite/705'], tags: ['sampleAlpha', 'compliance-bypass', 'vendor-onboard'] },
  { id: 'CVE-2026-11016', type: 'cve', title: 'BUCC dojolm-mcp Server: Insecure WebSocket Origin Check', summary: 'BUCC dojolm-mcp server accepts WebSocket connections from any origin in default configuration, enabling cross-site WebSocket hijack.', severity: 'HIGH', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-16', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11016'], tags: ['bucc', 'dojolm-mcp', 'cswsh', 'origin'] },

  // MEDIUM +28 (mix of NVD/EPSS/ATLAS/AIID)
  { id: 'CVE-2026-11020', type: 'cve', title: 'DojoLM Audit Log: Insufficient Rate Limiting on Query API', summary: 'DojoLM audit query API allows up to 5,000 RPS per token, enabling amplification attacks against downstream log indexes.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-15', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11020'], tags: ['dojolm', 'rate-limit', 'audit-api'] },
  { id: 'CVE-2026-11021', type: 'cve', title: 'SampleBravo Worker Pool: Insecure Direct Object Reference in Job Status', summary: 'SampleBravo worker job-status endpoints expose other tenants job results when the job ID is guessed.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-16', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11021'], tags: ['sampleBravo', 'idor', 'workers'] },
  { id: 'CVE-2026-11022', type: 'cve', title: 'SampleDelta Document Connector: Missing Egress Filter', summary: 'SampleDelta document connectors permit unrestricted egress to user-supplied URLs, enabling exfil of indexed content.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-17', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11022'], tags: ['sampleDelta', 'egress', 'exfil'] },
  { id: 'CVE-2026-11023', type: 'cve', title: 'SampleCharlie Audit Console: CSRF on Settings Endpoint', summary: 'SampleCharlie audit console settings endpoint lacks CSRF token verification, allowing settings tampering through cross-site requests.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-18', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11023'], tags: ['sampleCharlie', 'csrf', 'settings'] },
  { id: 'CVE-2026-11024', type: 'cve', title: 'SampleAlpha Compliance API: Verbose Error Disclosure', summary: 'SampleAlpha compliance API returns full stack traces in production responses, leaking internal paths and library versions.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-19', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11024'], tags: ['sampleAlpha', 'info-disclosure', 'stack-trace'] },
  { id: 'CVE-2026-11025', type: 'cve', title: 'DojoLM Webhook Receiver: Replay Attack via Missing Nonce', summary: 'DojoLM inbound webhooks accept replays because nonce field is logged but not verified for uniqueness.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-20', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11025'], tags: ['dojolm', 'replay', 'webhook'] },
  { id: 'EPSS-CVE-2026-11026', type: 'epss', title: 'EPSS 0.62: SampleBravo Audit Trail Hash-Truncation Weakness', summary: 'EPSS predicts moderate exploitation likelihood for a hash-truncation weakness in the SampleBravo audit-trail integrity check.', severity: 'MEDIUM', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-03-21', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11026'], tags: ['sampleBravo', 'epss', 'hash-truncate'] },
  { id: 'EPSS-CVE-2026-11027', type: 'epss', title: 'EPSS 0.55: SampleDelta Tool-Approval UI Click-Jacking', summary: 'EPSS predicts moderate exploitation likelihood for a click-jacking risk on the SampleDelta tool-approval UI.', severity: 'MEDIUM', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-03-22', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11027'], tags: ['sampleDelta', 'epss', 'clickjack'] },
  { id: 'ATLAS-AML.T0053', type: 'atlas', title: 'ATLAS T0053: Knowledge-Update Hijack via False Recall Memory', summary: 'ATLAS T0053 catalogues memory-poisoning by injecting false recall directives — observed in DojoLM persistent-note channels.', severity: 'MEDIUM', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-03-23', references: ['https://atlas.mitre.org/techniques/AML.T0053'], tags: ['atlas', 'aml.t0053', 'memory-poison', 'dojolm'] },
  { id: 'ATLAS-AML.T0054', type: 'atlas', title: 'ATLAS T0054: Cost-Amplification via Recursive Summary Loops', summary: 'ATLAS T0054 documents cost-amplification using recursive summary cycles — observed in SampleBravo agentic workflows.', severity: 'MEDIUM', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-03-24', references: ['https://atlas.mitre.org/techniques/AML.T0054'], tags: ['atlas', 'aml.t0054', 'cost-amp', 'sampleBravo'] },
  { id: 'ATLAS-AML.T0055', type: 'atlas', title: 'ATLAS T0055: Multi-Modal Injection via Image OCR', summary: 'ATLAS T0055 maps image-OCR-based prompt injection — observed in SampleDelta and SampleAlpha vision deployments.', severity: 'MEDIUM', source: '[SAMPLE] MITRE ATLAS (demo)', publishedAt: '2026-03-25', references: ['https://atlas.mitre.org/techniques/AML.T0055'], tags: ['atlas', 'aml.t0055', 'multi-modal', 'sampleDelta'] },
  { id: 'AIID-2026-00801', type: 'ai-incident', title: 'SampleBravo Internal Tools: Approved Duplicate Refunds at Scale', summary: 'SampleBravo internal-tools agent approved 1,200 duplicate refunds before pattern-matching caught the loop. Most refunds were reversed within 24 hours.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-26', references: ['https://example.invalid/sample-incident/cite/801'], tags: ['sampleBravo', 'duplicate-action', 'refund'] },
  { id: 'AIID-2026-00802', type: 'ai-incident', title: 'SampleDelta Customer Support Misclassified Severity Across Region', summary: 'SampleDelta customer-support bot misclassified ticket severity in EU-region tenants for 4 hours after a model-update window — minor business impact.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-27', references: ['https://example.invalid/sample-incident/cite/802'], tags: ['sampleDelta', 'misclassification', 'eu'] },
  { id: 'AIID-2026-00803', type: 'ai-incident', title: 'DojoLM Knowledge Bot Returned Outdated Policy as Current', summary: 'A DojoLM internal knowledge bot returned a 2024 policy as current for 8 hours after the indexer skipped a content refresh.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-28', references: ['https://example.invalid/sample-incident/cite/803'], tags: ['dojolm', 'stale-content', 'knowledge'] },
  { id: 'AIID-2026-00804', type: 'ai-incident', title: 'SampleCharlie Audit Bot Generated Unsupported Recommendation Citations', summary: 'A SampleCharlie audit bot generated audit recommendation citations referencing controls that did not exist. Caught by reviewer pattern checks.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-29', references: ['https://example.invalid/sample-incident/cite/804'], tags: ['sampleCharlie', 'hallucination', 'audit-citation'] },
  { id: 'AIID-2026-00805', type: 'ai-incident', title: 'SampleAlpha Customer-Support Bot Misrouted Localized Disclaimers', summary: 'SampleAlpha customer-support bot misrouted localized disclaimers in JP-region for 12 hours — informational impact, no compliance breach.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-30', references: ['https://example.invalid/sample-incident/cite/805'], tags: ['sampleAlpha', 'localization', 'disclaimer'] },
  { id: 'CVE-2026-11030', type: 'cve', title: 'BUCC bu-tpi: Tool-Manifest Schema Mismatch in Demo Mode', summary: 'BUCC bu-tpi tool-manifest schema differs between demo mode and production, allowing demo-side tools to bypass production validation.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-31', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11030'], tags: ['bucc', 'bu-tpi', 'schema-mismatch'] },
  { id: 'CVE-2026-11031', type: 'cve', title: 'BUCC dojolm-scanner: Insecure Default for Scan-Result Cache', summary: 'BUCC dojolm-scanner caches scan results world-readable by default in containerised deployments.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-01', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11031'], tags: ['bucc', 'dojolm-scanner', 'cache-perms'] },
  { id: 'CVE-2026-11032', type: 'cve', title: 'DojoLM Forge-Defense: Open Redirect via Apply-Then-Return Flow', summary: 'DojoLM Forge-Defense apply-then-return flow allows arbitrary external redirects through the return parameter.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-02', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11032'], tags: ['dojolm', 'open-redirect', 'forge-defense'] },
  { id: 'CVE-2026-11033', type: 'cve', title: 'SampleBravo Worker Pool: Log-Forging via Newline Injection in Job Name', summary: 'SampleBravo worker pool logs include user-supplied job names verbatim, enabling log-forging via embedded newlines.', severity: 'MEDIUM', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-03', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11033'], tags: ['sampleBravo', 'log-forging', 'workers'] },
  { id: 'AIID-2026-00806', type: 'ai-incident', title: 'SampleDelta Healthcare Triage Misranked Non-Urgent as Urgent', summary: 'SampleDelta healthcare triage misranked 30 non-urgent tickets as urgent for one hospital — triage queue noise but no harm.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-04', references: ['https://example.invalid/sample-incident/cite/806'], tags: ['sampleDelta', 'healthcare', 'misrank'] },
  { id: 'AIID-2026-00807', type: 'ai-incident', title: 'DojoLM Customer-Support Bot Drift from Approved Tone for 6 Hours', summary: 'A DojoLM customer-support bot drifted from approved tone after a prompt-template auto-update. Caught by tone-monitoring guardrail.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-05', references: ['https://example.invalid/sample-incident/cite/807'], tags: ['dojolm', 'tone-drift', 'csat'] },
  { id: 'AIID-2026-00808', type: 'ai-incident', title: 'SampleCharlie Audit Bot Late Recognition of Holiday Closure Policy', summary: 'SampleCharlie audit bot late-applied holiday-closure policy for one tenant for 4 hours — minor compliance noise.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-06', references: ['https://example.invalid/sample-incident/cite/808'], tags: ['sampleCharlie', 'policy-lag', 'holiday'] },
  { id: 'AIID-2026-00809', type: 'ai-incident', title: 'SampleBravo SaaS Quota Bot Issued False Quota-Exceeded Warnings', summary: 'SampleBravo SaaS quota bot issued false quota-exceeded warnings to 12 customer tenants for 90 minutes — operator pages followed.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-07', references: ['https://example.invalid/sample-incident/cite/809'], tags: ['sampleBravo', 'false-positive', 'quota'] },
  { id: 'AIID-2026-00810', type: 'ai-incident', title: 'SampleAlpha Content-Moderation Bot Over-Flagged Benign Updates', summary: 'SampleAlpha content-moderation bot over-flagged benign release-note updates as policy violations after a model-vendor change.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-08', references: ['https://example.invalid/sample-incident/cite/810'], tags: ['sampleAlpha', 'over-flag', 'moderation'] },
  { id: 'AIID-2026-00811', type: 'ai-incident', title: 'SampleDelta RAG Returned Mixed-Tenant Excerpts in Logs Briefly', summary: 'SampleDelta RAG briefly returned mixed-tenant excerpts in audit logs after a logging refactor regression. No customer-visible exposure.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-09', references: ['https://example.invalid/sample-incident/cite/811'], tags: ['sampleDelta', 'log-leak', 'rag'] },
  { id: 'AIID-2026-00812', type: 'ai-incident', title: 'DojoLM Demo Mode Surfaced Real Telemetry to Demo Operators', summary: 'DojoLM demo mode briefly surfaced real telemetry rows to demo operators for 30 minutes after a feature-flag toggle.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-10', references: ['https://example.invalid/sample-incident/cite/812'], tags: ['dojolm', 'demo-mode', 'telemetry'] },
  { id: 'AIID-2026-00813', type: 'ai-incident', title: 'SampleBravo Internal Tool Generated Imprecise Refund Amount Format', summary: 'SampleBravo internal tool generated refund amounts in a non-standard format for one tenant for 2 hours, triggering downstream parser errors.', severity: 'MEDIUM', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-11', references: ['https://example.invalid/sample-incident/cite/813'], tags: ['sampleBravo', 'format-drift', 'refund'] },

  // LOW +30 (mostly minor / informational AIID + tooling CVEs + EPSS coverage)
  { id: 'CVE-2026-11040', type: 'cve', title: 'DojoLM CLI: Excessive File-System Permissions on Cache Files', summary: 'DojoLM CLI writes cached metadata with mode 0666 by default — limited blast radius on shared workstations.', severity: 'LOW', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-01', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11040'], tags: ['dojolm', 'cli', 'perms'] },
  { id: 'CVE-2026-11041', type: 'cve', title: 'SampleBravo Status Page: Cacheable Response Discloses Build Hash', summary: 'SampleBravo public status page sets cacheable headers on responses that include the deploy build hash.', severity: 'LOW', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-02', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11041'], tags: ['sampleBravo', 'info-disclose', 'cache'] },
  { id: 'CVE-2026-11042', type: 'cve', title: 'SampleDelta Healthchecker: Missing Timeout on Egress Probe', summary: 'SampleDelta healthchecker emits egress probes without timeout, leading to slow-link saturation under failure.', severity: 'LOW', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-03', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11042'], tags: ['sampleDelta', 'healthcheck', 'timeout'] },
  { id: 'CVE-2026-11043', type: 'cve', title: 'SampleCharlie Audit CLI: Argv-Cleartext Token in Process Listing', summary: 'SampleCharlie audit CLI accepts auth tokens on argv, exposing them in process listings on shared hosts.', severity: 'LOW', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-04', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11043'], tags: ['sampleCharlie', 'cli', 'argv-leak'] },
  { id: 'CVE-2026-11044', type: 'cve', title: 'SampleAlpha Compliance Doc Generator: Reflected XSS in Title Field', summary: 'SampleAlpha compliance doc generator reflects unsanitised title in preview render — operator-only impact.', severity: 'LOW', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-03-05', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11044'], tags: ['sampleAlpha', 'reflected-xss', 'doc-gen'] },
  { id: 'EPSS-CVE-2026-11045', type: 'epss', title: 'EPSS 0.18: SampleBravo Helm Chart Default LB Annotations', summary: 'EPSS forecasts low exploitation likelihood for default LB annotations in the SampleBravo Helm chart.', severity: 'LOW', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-03-06', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11045'], tags: ['sampleBravo', 'epss', 'helm'] },
  { id: 'EPSS-CVE-2026-11046', type: 'epss', title: 'EPSS 0.21: SampleDelta Webhook TLS Cipher Downgrade', summary: 'EPSS forecasts low likelihood for a TLS-cipher-downgrade window in SampleDelta webhook receiver.', severity: 'LOW', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-03-07', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11046'], tags: ['sampleDelta', 'epss', 'tls'] },
  { id: 'EPSS-CVE-2026-11047', type: 'epss', title: 'EPSS 0.13: DojoLM Demo-Mode Reset Race Window', summary: 'EPSS forecasts low likelihood for a reset-race window in DojoLM demo mode.', severity: 'LOW', source: '[SAMPLE] FIRST EPSS (demo)', publishedAt: '2026-03-08', references: ['https://example.invalid/sample-epss?cve=CVE-2026-11047'], tags: ['dojolm', 'epss', 'demo-mode'] },
  { id: 'AIID-2026-00901', type: 'ai-incident', title: 'SampleBravo Newsletter Bot Used Outdated Style Guide for One Day', summary: 'SampleBravo newsletter bot used a stale style guide for one day in the EMEA tenant — minor brand-consistency issue.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-09', references: ['https://example.invalid/sample-incident/cite/901'], tags: ['sampleBravo', 'style-drift', 'newsletter'] },
  { id: 'AIID-2026-00902', type: 'ai-incident', title: 'SampleDelta Translation Bot Mislabelled One Region Code', summary: 'SampleDelta translation bot mislabelled one region code in URLs for half a day — minor SEO impact.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-10', references: ['https://example.invalid/sample-incident/cite/902'], tags: ['sampleDelta', 'mislabel', 'translation'] },
  { id: 'AIID-2026-00903', type: 'ai-incident', title: 'DojoLM Onboarding Bot Mismatched Persona for Trial Users', summary: 'DojoLM onboarding bot used the wrong persona for trial users for 2 hours — informational mismatch.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-11', references: ['https://example.invalid/sample-incident/cite/903'], tags: ['dojolm', 'persona-mismatch', 'onboarding'] },
  { id: 'AIID-2026-00904', type: 'ai-incident', title: 'SampleCharlie Audit Bot Padded Status Strings with Trailing Whitespace', summary: 'SampleCharlie audit bot padded status strings with trailing whitespace, causing downstream parser nitpicks.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-12', references: ['https://example.invalid/sample-incident/cite/904'], tags: ['sampleCharlie', 'whitespace', 'parser'] },
  { id: 'AIID-2026-00905', type: 'ai-incident', title: 'SampleAlpha Content Bot Generated Off-Brand Color Suggestions', summary: 'SampleAlpha content bot suggested off-brand colors in autocomplete dropdown for 4 hours — designer-team noise only.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-13', references: ['https://example.invalid/sample-incident/cite/905'], tags: ['sampleAlpha', 'off-brand', 'color'] },
  { id: 'AIID-2026-00906', type: 'ai-incident', title: 'SampleBravo Test-Account Bot Repeated Same Joke for 50 Replies', summary: 'SampleBravo test-account bot repeated the same joke for 50 customer-support replies before pattern-match caught it.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-14', references: ['https://example.invalid/sample-incident/cite/906'], tags: ['sampleBravo', 'repetition', 'csat'] },
  { id: 'AIID-2026-00907', type: 'ai-incident', title: 'SampleDelta Help Bot Returned Off-Topic Trivia Once', summary: 'SampleDelta help bot returned off-topic trivia once after a malformed query template — single occurrence.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-15', references: ['https://example.invalid/sample-incident/cite/907'], tags: ['sampleDelta', 'off-topic', 'help'] },
  { id: 'AIID-2026-00908', type: 'ai-incident', title: 'DojoLM Sample Bot Echoed System Greeting Twice', summary: 'DojoLM sample bot echoed system greeting twice for one tenant for 10 minutes after a routing replay.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-16', references: ['https://example.invalid/sample-incident/cite/908'], tags: ['dojolm', 'echo', 'routing'] },
  { id: 'AIID-2026-00909', type: 'ai-incident', title: 'SampleCharlie Reporting Bot Skipped Footer in One Format', summary: 'SampleCharlie reporting bot skipped the standard footer in CSV exports for one tenant for half a day.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-17', references: ['https://example.invalid/sample-incident/cite/909'], tags: ['sampleCharlie', 'footer-skip', 'csv'] },
  { id: 'AIID-2026-00910', type: 'ai-incident', title: 'SampleAlpha Localization Bot Used Capital Variant for One Locale', summary: 'SampleAlpha localization bot used the capital-letter variant for a noun in one locale for 6 hours — typographic noise only.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-18', references: ['https://example.invalid/sample-incident/cite/910'], tags: ['sampleAlpha', 'capitalisation', 'locale'] },
  { id: 'AIID-2026-00911', type: 'ai-incident', title: 'SampleBravo Status Bot Posted Mismatch Banner Once', summary: 'SampleBravo status bot posted a mismatch banner once after a CDN cache stutter — auto-recovered within 5 minutes.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-19', references: ['https://example.invalid/sample-incident/cite/911'], tags: ['sampleBravo', 'cdn', 'banner'] },
  { id: 'AIID-2026-00912', type: 'ai-incident', title: 'SampleDelta Search Bot Returned Empty Result for Edge-Case Query', summary: 'SampleDelta search bot returned empty result for an edge-case query for 30 minutes after an indexer hiccup.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-20', references: ['https://example.invalid/sample-incident/cite/912'], tags: ['sampleDelta', 'empty-result', 'search'] },
  { id: 'AIID-2026-00913', type: 'ai-incident', title: 'DojoLM Insight Bot Reported Stat in Wrong Unit', summary: 'DojoLM insight bot reported a stat in megabytes instead of mebibytes for one tenant — minor unit mismatch.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-21', references: ['https://example.invalid/sample-incident/cite/913'], tags: ['dojolm', 'unit-mismatch', 'insight'] },
  { id: 'AIID-2026-00914', type: 'ai-incident', title: 'SampleCharlie Audit Bot Tracked Daylight Saving Transition Late', summary: 'SampleCharlie audit bot tracked the DST transition with a one-hour lag for half a day — schedule confusion.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-22', references: ['https://example.invalid/sample-incident/cite/914'], tags: ['sampleCharlie', 'dst', 'schedule'] },
  { id: 'AIID-2026-00915', type: 'ai-incident', title: 'SampleAlpha Compliance Bot Re-flagged Already-Acked Item', summary: 'SampleAlpha compliance bot re-flagged an already-acknowledged audit item once after a state-store glitch.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-23', references: ['https://example.invalid/sample-incident/cite/915'], tags: ['sampleAlpha', 'reflag', 'state-store'] },
  { id: 'AIID-2026-00916', type: 'ai-incident', title: 'SampleBravo Onboarding Bot Re-Sent Welcome Email Twice', summary: 'SampleBravo onboarding bot re-sent the welcome email twice to one cohort after a queue replay.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-24', references: ['https://example.invalid/sample-incident/cite/916'], tags: ['sampleBravo', 'duplicate-email', 'onboarding'] },
  { id: 'AIID-2026-00917', type: 'ai-incident', title: 'SampleDelta RAG Bot Cited Same Source Twice in Reply', summary: 'SampleDelta RAG bot cited the same source twice in one reply for 3 hours after an indexer hiccup.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-25', references: ['https://example.invalid/sample-incident/cite/917'], tags: ['sampleDelta', 'duplicate-citation', 'rag'] },
  { id: 'AIID-2026-00918', type: 'ai-incident', title: 'DojoLM Sample Bot Referred to Yesterday as Today Briefly', summary: 'DojoLM sample bot referred to yesterday as today for one tenant for 20 minutes after a clock-drift event.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-26', references: ['https://example.invalid/sample-incident/cite/918'], tags: ['dojolm', 'clock-drift', 'sample'] },
  { id: 'AIID-2026-00919', type: 'ai-incident', title: 'SampleCharlie Audit Bot Used Older Disclaimer Variant Once', summary: 'SampleCharlie audit bot used an older disclaimer variant once after a template-rotation skew — single occurrence.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-27', references: ['https://example.invalid/sample-incident/cite/919'], tags: ['sampleCharlie', 'template-skew', 'disclaimer'] },
  { id: 'AIID-2026-00920', type: 'ai-incident', title: 'SampleAlpha Search Bot Returned One Result Out of Order', summary: 'SampleAlpha search bot returned one result out of order in one query for 90 minutes after a sort-key change.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-28', references: ['https://example.invalid/sample-incident/cite/920'], tags: ['sampleAlpha', 'sort-order', 'search'] },
  { id: 'AIID-2026-00921', type: 'ai-incident', title: 'SampleBravo Status Bot Used Mixed-Case Banner Heading', summary: 'SampleBravo status bot used a mixed-case banner heading for one tenant for 2 hours — branding-team nit.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-29', references: ['https://example.invalid/sample-incident/cite/921'], tags: ['sampleBravo', 'mixed-case', 'banner'] },
  { id: 'AIID-2026-00922', type: 'ai-incident', title: 'SampleDelta Form Bot Submitted Twice for One Edge Click', summary: 'SampleDelta form bot submitted twice for one tenant after a double-click on a debounce edge case — minor duplicate submission.', severity: 'LOW', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-03-30', references: ['https://example.invalid/sample-incident/cite/922'], tags: ['sampleDelta', 'double-submit', 'debounce'] },

  // INFO +10 (informational / advisory only)
  { id: 'CVE-2026-11050', type: 'cve', title: 'DojoLM Docs: Outdated Configuration Sample References Removed Flag', summary: 'A docs page references a removed configuration flag — informational only.', severity: 'INFO', source: '[SAMPLE] NVD (demo)', publishedAt: '2026-04-01', references: ['https://example.invalid/sample-cve/detail/CVE-2026-11050'], tags: ['dojolm', 'docs', 'info'] },
  { id: 'AIID-2026-00930', type: 'ai-incident', title: 'SampleDelta Deprecated Endpoint Still Reachable', summary: 'SampleDelta deprecated /v1/legacy/embed endpoint still reachable per advisory — informational only.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-02', references: ['https://example.invalid/sample-incident/cite/930'], tags: ['sampleDelta', 'deprecated', 'info'] },
  { id: 'AIID-2026-00931', type: 'ai-incident', title: 'SampleBravo Vendor-Survey Bot Asked Optional Question First', summary: 'SampleBravo vendor-survey bot asked an optional question first before required ones for one cohort — UX nit only.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-03', references: ['https://example.invalid/sample-incident/cite/931'], tags: ['sampleBravo', 'survey', 'ux'] },
  { id: 'AIID-2026-00932', type: 'ai-incident', title: 'DojoLM Dashboard Defaulted to Last-Used View Instead of Home', summary: 'DojoLM dashboard defaulted to last-used view instead of home for one cohort — minor preference issue.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-04', references: ['https://example.invalid/sample-incident/cite/932'], tags: ['dojolm', 'default-view', 'ux'] },
  { id: 'AIID-2026-00933', type: 'ai-incident', title: 'SampleCharlie Reporting Bot Padded Numbers with Leading Zeroes Once', summary: 'SampleCharlie reporting bot padded numbers with leading zeroes in CSV exports once — informational format nit.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-05', references: ['https://example.invalid/sample-incident/cite/933'], tags: ['sampleCharlie', 'format-nit', 'csv'] },
  { id: 'AIID-2026-00934', type: 'ai-incident', title: 'SampleAlpha Compliance Bot Posted Holiday Greeting on Working Day', summary: 'SampleAlpha compliance bot posted a holiday greeting on a working day in one regional cohort — informational drift.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-06', references: ['https://example.invalid/sample-incident/cite/934'], tags: ['sampleAlpha', 'holiday', 'info'] },
  { id: 'AIID-2026-00935', type: 'ai-incident', title: 'DojoLM Help Bot Suggested Old Doc URL Once', summary: 'DojoLM help bot suggested an old doc URL once after a redirect-cache stale-window — informational.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-07', references: ['https://example.invalid/sample-incident/cite/935'], tags: ['dojolm', 'old-url', 'info'] },
  { id: 'AIID-2026-00936', type: 'ai-incident', title: 'SampleDelta RAG Returned Older Snapshot of Doc Once', summary: 'SampleDelta RAG returned an older snapshot of a doc once after an indexer rollover — informational lag.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-08', references: ['https://example.invalid/sample-incident/cite/936'], tags: ['sampleDelta', 'old-snapshot', 'rag'] },
  { id: 'AIID-2026-00937', type: 'ai-incident', title: 'SampleBravo Survey Bot Switched Theme Mid-Session Once', summary: 'SampleBravo survey bot switched theme mid-session for one cohort once — visual flicker, no impact.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-09', references: ['https://example.invalid/sample-incident/cite/937'], tags: ['sampleBravo', 'theme', 'flicker'] },
  { id: 'AIID-2026-00938', type: 'ai-incident', title: 'SampleCharlie Audit Bot Used American English Once in Localised Tenant', summary: 'SampleCharlie audit bot used American English variant once in a UK-localised tenant — informational drift.', severity: 'INFO', source: '[SAMPLE] AI Incident DB (demo)', publishedAt: '2026-04-10', references: ['https://example.invalid/sample-incident/cite/938'], tags: ['sampleCharlie', 'localisation', 'info'] },
]

export const RONIN_STATUSES: ResearchTargetStatus[] = ['active', 'closed']
export const RONIN_PRIORITIES: ResearchTargetPriority[] = ['P0', 'P1', 'P2', 'P3']
export const RONIN_SCOPES = ['in-scope', 'out-of-scope'] as const
